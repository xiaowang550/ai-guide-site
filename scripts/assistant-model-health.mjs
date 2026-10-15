import { writeFileSync, readFileSync, existsSync } from 'node:fs'
const site = 'https://ai-guide-site.pages.dev'
async function token() {
  const target = new URL(process.env.ACTIONS_ID_TOKEN_REQUEST_URL)
  target.searchParams.set('audience', site)
  const r = await fetch(target, {
    headers: { Authorization: 'Bearer ' + process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN },
    signal: AbortSignal.timeout(15000),
  })
  if (!r.ok) throw Error('GitHub identity request failed')
  const p = await r.json()
  if (!p.value) throw Error('GitHub identity unavailable')
  return p.value
}
async function call(body) {
  const response = await fetch(site + '/api/assistant/maintenance', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (await token()),
      Origin: site,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(65000),
  })
  const value = await response.json()
  if (!response.ok)
    throw Error(
      'Model health request failed (' +
        response.status +
        '): ' +
        String(value.error ?? '').slice(0, 180),
    )
  return value
}
// A maintenance update can start before Pages has finished deploying its endpoint.
// Retry only the start request; every attempt uses a fresh short-lived GitHub identity.
async function builtinChecks() {
  let plan
  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      plan = await call({ phase: 'start' })
      break
    } catch (error) {
      if (attempt === 11) throw error
      console.log('Waiting for the maintenance endpoint before starting model checks.')
      await new Promise((resolve) => setTimeout(resolve, 20000))
    }
  }
  const results = []
  for (const model of plan.models) {
    let value
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        value = await call({ phase: 'probe', runId: plan.runId, model: model.id })
        break
      } catch (error) {
        if (attempt === 2) throw error
        await new Promise((resolve) => setTimeout(resolve, 15000))
      }
    }
    results.push(value)
    console.log(
      model.id + ': ' + (value.ok ? 'passed' : 'failed (' + (value.code ?? 'unknown') + ')'),
    )
    await new Promise((resolve) => setTimeout(resolve, 3500))
  }
  const summary = await call({ phase: 'finish', runId: plan.runId })
  writeFileSync(
    'assistant-model-health.json',
    JSON.stringify({ checkedAt: summary.completedAt, models: results }, null, 2),
  )
  console.log(
    'Checked ' + results.length + ' models; ' + results.filter((r) => r.ok).length + ' usable.',
  )
  if (!results.some((r) => r.ok)) process.exitCode = 1
}
try {
  await builtinChecks()
} catch {
  console.error('Built-in model checks could not complete.')
  process.exitCode = 1
}

// External keys stay encrypted on the site. Daily maintenance cannot publish new models.
const externalReport = []
try {
  const summary = await call({ scope: 'external', phase: 'list' })
  for (const source of summary.sources) {
    if (source.paused) continue
    try {
      const plan = await call({ scope: 'external', phase: 'discover', sourceId: source.id })
      const results = []
      for (const model of plan.models) {
        if (model.state !== 'pending' && model.state !== 'testing') continue
        results.push(
          await call({ scope: 'external', phase: 'probe', runId: plan.runId, model: model.id }),
        )
        await new Promise((resolve) => setTimeout(resolve, 3500))
      }
      externalReport.push({
        connectionId: source.id,
        checkedAt: new Date().toISOString(),
        total: plan.models.length,
        passed: results.filter((r) => r.state === 'passed').length,
        failed:
          plan.models.filter((m) => m.state === 'failed').length +
          results.filter((r) => r.state === 'failed').length,
      })
      console.log(
        'External connection ' +
          source.id +
          ': ' +
          results.filter((r) => r.state === 'passed').length +
          ' passed.',
      )
    } catch {
      externalReport.push({
        connectionId: source.id,
        error: 'Connection check interrupted; review the owner dashboard.',
      })
      process.exitCode = 1
    }
  }
} catch {
  console.error('External connection checks could not start.')
  process.exitCode = 1
}
const previousReport = existsSync('assistant-model-health.json')
  ? JSON.parse(readFileSync('assistant-model-health.json', 'utf8'))
  : {}
writeFileSync(
  'assistant-model-health.json',
  JSON.stringify({ ...previousReport, externalConnections: externalReport }, null, 2),
)

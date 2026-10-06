/**
 * 生成站内工具 Logo（纯本地 SVG，不依赖外部图床）。
 * 用法：node scripts/generate-logos.mjs
 *
 * 说明：一期用「品牌色 + 字母/汉字」的单色标记，保证离线可用、体积极小。
 * 拿到厂商官方商标素材后，把 public/logos/<id>.svg 换成官方版本即可，页面无需改动。
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'public', 'logos')

/** id: [品牌色, 标记文字, 文字颜色] */
const LOGOS = {
  chatgpt: ['#10A37F', 'GPT', '#ffffff'],
  claude: ['#D97757', 'CL', '#ffffff'],
  gemini: ['#4285F4', 'GE', '#ffffff'],
  doubao: ['#3B6FF5', '豆', '#ffffff'],
  kimi: ['#2B2B2B', 'KM', '#ffffff'],
  qwen: ['#6C3FF5', 'QW', '#ffffff'],
  deepseek: ['#4D6BFE', 'DS', '#ffffff'],
  glm: ['#3859FF', 'GLM', '#ffffff'],
  yuanbao: ['#0A6CFF', '元', '#ffffff'],
  cursor: ['#4A4A4A', 'CR', '#ffffff'],
  copilot: ['#24292F', 'Co', '#ffffff'],
  midjourney: ['#1F2937', 'MJ', '#ffffff'],
  runway: ['#111827', 'RW', '#ffffff'],
  suno: ['#7C3AED', 'SN', '#ffffff'],
  gamma: ['#8B5CF6', 'Γ', '#ffffff'],
  notebooklm: ['#1A73E8', 'LM', '#ffffff'],
  perplexity: ['#20808D', 'PX', '#ffffff'],
  ollama: ['#111111', 'O', '#ffffff'],
  'wps-ai': ['#D5252C', 'W', '#ffffff'],
  'tongyi-tingwu': ['#FF6A00', '听', '#ffffff'],
  jimeng: ['#1A1A1A', '即', '#ffffff'],
  'ima-copilot': ['#0052D9', 'ima', '#ffffff'],
}

function svg(id, [color, label, fg]) {
  const fontSize = label.length > 2 ? 20 : label.length > 1 ? 26 : 34
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="${id}">
  <rect width="64" height="64" rx="14" fill="${color}"/>
  <text x="32" y="32" fill="${fg}" font-family="Inter, 'Helvetica Neue', Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif" font-size="${fontSize}" font-weight="700" text-anchor="middle" dominant-baseline="central" letter-spacing="-0.5">${label}</text>
</svg>
`
}

await mkdir(outDir, { recursive: true })
for (const [id, spec] of Object.entries(LOGOS)) {
  await writeFile(join(outDir, `${id}.svg`), svg(id, spec), 'utf8')
}
console.log(`generated ${Object.keys(LOGOS).length} logos -> ${outDir}`)
/* Site-wide visual choice. No content, credentials or learning state is stored here. */
;(function () {
  var root = document.documentElement
  var valid = function (v) {
    return ['classic', 'studio', 'editorial'].indexOf(v) >= 0
  }
  var preview = new URLSearchParams(location.search).get('design-preview')
  function preferredDark() {
    try {
      var mode = localStorage.getItem('ai-map-theme')
      return (
        mode === 'dark' || (mode === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)
      )
    } catch (_) {
      return false
    }
  }
  var apply = function (id) {
    if (!valid(id)) id = 'classic'
    root.classList.toggle('dark', id === 'editorial' || (id === 'classic' && preferredDark()))
    root.style.colorScheme = root.classList.contains('dark') ? 'dark' : 'light'
    if (id === 'classic') {
      root.dataset.design = id
      document.getElementById('design-sheet')?.remove()
      return
    }
    var sheet = document.getElementById('design-sheet')
    if (!sheet) {
      sheet = document.createElement('link')
      sheet.id = 'design-sheet'
      sheet.rel = 'stylesheet'
      sheet.href = '/design/templates-v2.css'
      document.head.appendChild(sheet)
    }
    root.dataset.design = id
  }
  try {
    apply(valid(preview) ? preview : localStorage.getItem('zhiya:design:v1'))
  } catch (_) {}
  fetch('/api/site', { cache: 'no-store', credentials: 'same-origin' })
    .then(function (r) {
      if (!r.ok) throw Error('config')
      return r.json()
    })
    .then(function (c) {
      var id = (c.features && c.features.design) || 'classic'
      if (!valid(id)) return
      try {
        localStorage.setItem('zhiya:design:v1', id)
      } catch (_) {}
      if (!valid(preview)) apply(id)
    })
    .catch(function () {})
  window.addEventListener('zhiya:design', function (e) {
    if (!valid(e.detail)) return
    preview = null
    document.querySelector('.design-preview-notice')?.remove()
    var current = new URL(location.href)
    current.searchParams.delete('design-preview')
    history.replaceState(history.state, '', current.href)
    apply(e.detail)
    try {
      localStorage.setItem('zhiya:design:v1', e.detail)
    } catch (_) {}
  })
  if (valid(preview)) {
    var ready = function () {
      var bar = document.createElement('div')
      bar.className = 'design-preview-notice'
      bar.setAttribute('role', 'status')
      bar.textContent = '模板预览 · 不影响其他访客'
      var close = document.createElement('a')
      var url = new URL(location.href)
      url.searchParams.delete('design-preview')
      close.href = url.href
      close.textContent = '退出预览'
      bar.appendChild(close)
      document.body.appendChild(bar)
      bar.style.cssText =
        'position:fixed;bottom:calc(72px + env(safe-area-inset-bottom));left:16px;z-index:90;padding:10px 14px;border:1px solid #c5cec8;border-radius:8px;background:#fff;color:#263c32;font:12px/1.5 system-ui;box-shadow:0 2px 12px #0001'
      close.style.cssText = 'margin-left:14px;text-decoration:underline;color:inherit'
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready)
    else ready()
  }
  function activateTab(tab, focus) {
    var group = tab.closest('[data-task-workspace]')
    if (!group) return
    var key = tab.dataset.templateTab
    group.querySelectorAll('[data-template-tab]').forEach(function (t) {
      var selected = t === tab
      t.setAttribute('aria-selected', String(selected))
      t.tabIndex = selected ? 0 : -1
    })
    group.querySelectorAll('[data-template-panel]').forEach(function (p) {
      p.hidden = p.dataset.templatePanel !== key
    })
    if (focus) tab.focus()
  }
  document.addEventListener(
    'click',
    function (e) {
      var tab = e.target.closest?.('[data-template-tab]')
      if (tab) {
        activateTab(tab, false)
        return
      }
      if (!valid(preview) || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)
        return
      var a = e.target.closest?.('a[href]')
      if (!a || a.target || a.hasAttribute('download') || a.closest('.design-preview-notice'))
        return
      var u = new URL(a.href, location.href)
      if (u.origin !== location.origin || u.pathname.startsWith('/api/') || u.hash) return
      u.searchParams.set('design-preview', preview)
      e.preventDefault()
      e.stopPropagation()
      location.assign(u.href)
    },
    true,
  )
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var opened = document.querySelectorAll('.template-subnav[open], .template-menu[open]')
      opened.forEach(function (menu) {
        menu.removeAttribute('open')
        if (menu.contains(document.activeElement)) menu.querySelector('summary')?.focus()
      })
      return
    }
    var tab = e.target.closest?.('[data-template-tab]')
    if (!tab) return
    var list = Array.from(tab.closest('[role=tablist]').querySelectorAll('[role=tab]')),
      i = list.indexOf(tab),
      next
    if (e.key === 'ArrowRight') next = (i + 1) % list.length
    if (e.key === 'ArrowLeft') next = (i + list.length - 1) % list.length
    if (e.key === 'Home') next = 0
    if (e.key === 'End') next = list.length - 1
    if (next !== undefined) {
      e.preventDefault()
      activateTab(list[next], true)
    }
  })
  document.addEventListener(
    'submit',
    function (e) {
      var form = e.target
      if (
        !valid(preview) ||
        !(form instanceof HTMLFormElement) ||
        form.method.toLowerCase() !== 'get'
      )
        return
      var destination = new URL(form.action, location.href)
      if (destination.origin !== location.origin || destination.pathname.startsWith('/api/')) return
      var field = form.querySelector('input[name="design-preview"]')
      if (!field) {
        field = document.createElement('input')
        field.type = 'hidden'
        field.name = 'design-preview'
        form.appendChild(field)
      }
      field.value = preview
    },
    true,
  )
})()

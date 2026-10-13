/* Site-wide visual choice. No content, credentials or learning state is stored here. */
;(function () {
  var root = document.documentElement
  var valid = function (v) {
    return ['classic', 'studio', 'editorial'].indexOf(v) >= 0
  }
  var preview = new URLSearchParams(location.search).get('design-preview')
  var apply = function (id) {
    if (!valid(id)) id = 'classic'
    if (id === 'classic') {
      root.dataset.design = id
      return
    }
    var sheet = document.getElementById('design-sheet')
    if (!sheet) {
      sheet = document.createElement('link')
      sheet.id = 'design-sheet'
      sheet.rel = 'stylesheet'
      sheet.href = '/design/editions-v1.css'
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
      bar.textContent = '界面预览 · 仅当前页面'
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
})()

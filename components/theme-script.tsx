/** Server-rendered bootstrap. Login and teacher pages need no theme-picker JavaScript. */
export function ThemeScript() {
  const script =
    "(function(){try{var t=localStorage.getItem('ai-map-theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();"
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}

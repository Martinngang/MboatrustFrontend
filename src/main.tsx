import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// No-op outside a production build/preview — the plugin's devOptions stay
// disabled, so this only matters once the app is actually built.
registerSW({ immediate: true })

// Service workers are scoped per-origin and survive independently of
// whatever the server is currently doing — if this origin ever served a
// production build (or a "deploy preview"), the browser keeps that old SW
// installed and answers every future navigation/asset request straight
// from ITS cached index.html/JS/CSS, without the request ever reaching the
// dev server. Since registerSW() above is a deliberate no-op in dev (see
// comment), nothing else here ever runs an update check to dislodge it —
// so once a stale SW is installed at this origin, every subsequent round
// of local fixes silently fails to reach the device no matter how correct
// the source is, and reloading the page does nothing (the SW answers
// before the request leaves the device). Forcibly clearing any existing
// registration + caches on every dev boot guarantees dev testing always
// reflects the current source, never a leftover production snapshot.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) reg.unregister()
  })
  if ('caches' in window) {
    caches.keys().then((keys) => {
      for (const key of keys) caches.delete(key)
    })
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

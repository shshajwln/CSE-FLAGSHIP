// Runs on the Wrapped app's origin. Two-way sync:
//  - extension → app: mirrors captured purchases and the wage from
//    chrome.storage into the page's localStorage, then notifies the app
//  - app → extension: the app dispatches 'sw-wage-set' when the user edits
//    the wage there; we write it back to chrome.storage so the popup agrees
;(() => {
  function sync() {
    try {
      chrome.storage.local.get({ sw_captured: [], sw_wage: null }, (data) => {
        if (chrome.runtime.lastError) return
        localStorage.setItem('sw_captured', JSON.stringify(data.sw_captured))
        if (data.sw_wage != null) localStorage.setItem('sw_wage', String(data.sw_wage))
        window.dispatchEvent(new CustomEvent('sw-sync'))
      })
    } catch {
      console.warn('[Spending Wrapped] extension was reloaded — refresh this tab to sync')
    }
  }

  sync()
  try {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sw_captured || changes.sw_wage) sync()
    })
  } catch {}

  window.addEventListener('sw-wage-set', (e) => {
    const w = parseFloat(e.detail)
    if (!Number.isFinite(w) || w <= 0) return
    try {
      chrome.storage.local.get({ sw_wage: null }, (data) => {
        if (chrome.runtime.lastError) return
        // only write on real change — stops the echo (storage change → sync →
        // app re-render) from ping-ponging forever
        if (data.sw_wage !== w) chrome.storage.local.set({ sw_wage: w })
      })
    } catch {}
  })
})()

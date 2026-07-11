// Runs on the Wrapped app's origin. Mirrors captured purchases and the wage
// from chrome.storage into the page's localStorage, then notifies the app.
;(() => {
  function sync() {
    chrome.storage.local.get({ sw_captured: [], sw_wage: null }, (data) => {
      localStorage.setItem('sw_captured', JSON.stringify(data.sw_captured))
      if (data.sw_wage != null) localStorage.setItem('sw_wage', String(data.sw_wage))
      window.dispatchEvent(new CustomEvent('sw-sync'))
    })
  }

  sync()
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.sw_captured || changes.sw_wage) sync()
  })
})()

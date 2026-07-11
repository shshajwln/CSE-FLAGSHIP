// Captures completed orders from the demo store's confirmation page
// and stores them in chrome.storage for the Wrapped app to pick up.
;(() => {
  function tryCapture() {
    const el = document.getElementById('order-data')
    if (!el || !el.textContent) return
    let order
    try {
      order = JSON.parse(el.textContent)
    } catch {
      return
    }
    if (!order || !order.orderId || !Array.isArray(order.items)) return

    chrome.storage.local.get({ sw_captured: [], sw_captured_ids: [] }, (data) => {
      if (data.sw_captured_ids.includes(order.orderId)) return
      const now = new Date().toISOString()
      const purchases = order.items.map((item, i) => ({
        id: `${order.orderId}-${i}`,
        date: order.date || now,
        merchant: order.merchant || 'Unknown',
        item: item.item,
        category: item.category || 'Impulse',
        price: item.price,
        source: 'captured',
      }))
      chrome.storage.local.set({
        sw_captured: [...data.sw_captured, ...purchases],
        sw_captured_ids: [...data.sw_captured_ids, order.orderId],
      })
    })
  }

  tryCapture()
  window.addEventListener('demo-order-ready', tryCapture)
})()

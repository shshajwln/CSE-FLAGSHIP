// Amazon integration, two parts:
//  1. Cart snapshot — remembers what's in your cart (with prices) as you browse.
//  2. Thank-you capture — when an order completes, turns the snapshot into purchases.
// Amazon's DOM drifts, so parsing tries structured markup first and falls back
// to text-pattern matching on the page text.
;(() => {
  // chrome.* throws in tabs that were open when the extension was reloaded
  function storageGet(defaults, cb) {
    try {
      chrome.storage.local.get(defaults, cb)
    } catch {
      console.warn('[Spending Wrapped] extension was reloaded — refresh this tab')
    }
  }
  function storageSet(obj, cb) {
    try {
      chrome.storage.local.set(obj, cb)
    } catch {
      console.warn('[Spending Wrapped] extension was reloaded — refresh this tab')
    }
  }

  function parseMoney(text) {
    if (!text) return null
    const m =
      text.match(/[$£€]\s?([\d,]+(?:\.\d{2})?)/) ||
      text.match(/\b(?:USD|AUD|CAD|GBP|EUR|NZD|SGD)\s?([\d,]+(?:\.\d{2})?)/i)
    return m ? parseFloat(m[1].replace(/,/g, '')) : null
  }

  const KEYWORDS = [
    ['Clothing', ['shirt', 'hoodie', 'sweat', 'pants', 'shoe', 'sneaker', 'jacket', 'dress', 'sock', 'hat', 'jeans', 'leggings', 'coat', 'boot']],
    ['Electronics', ['usb', 'cable', 'charger', 'keyboard', 'mouse', 'headphone', 'earbud', 'monitor', 'ssd', 'hdmi', 'laptop', 'webcam', 'speaker', 'battery', 'adapter', 'phone case', 'tablet']],
    ['Home', ['pillow', 'blanket', 'lamp', 'curtain', 'organizer', 'kitchen', 'mug', 'towel', 'shelf', 'frame', 'rug', 'candle', 'storage']],
    ['Beauty', ['serum', 'lipstick', 'moisturizer', 'shampoo', 'skincare', 'sunscreen', 'makeup', 'cologne', 'perfume']],
    ['Books', ['book', 'novel', 'paperback', 'hardcover']],
    ['Gaming', ['game', 'controller', 'nintendo', 'playstation', 'xbox', 'steam deck']],
    ['Groceries', ['snack', 'coffee bean', 'protein', 'tea bag', 'pantry']],
  ]

  function categorize(title) {
    const t = title.toLowerCase()
    for (const [cat, words] of KEYWORDS) {
      if (words.some((w) => t.includes(w))) return cat
    }
    return 'Misc'
  }

  // ---------- 1. cart snapshot ----------

  function scrapeCart() {
    const items = []
    document.querySelectorAll('.sc-list-item').forEach((el) => {
      const titleEl = el.querySelector(
        '.sc-product-title, .a-truncate-full, .a-truncate-cut, a.sc-product-link'
      )
      const title = titleEl && titleEl.textContent.trim()
      let price = parseFloat(el.getAttribute('data-price'))
      if (!Number.isFinite(price) || price <= 0) {
        const priceEl = el.querySelector(
          '.sc-product-price, .sc-badge-price-to-pay, .a-price .a-offscreen'
        )
        price = priceEl ? parseMoney(priceEl.textContent) : null
      }
      const qty = parseInt(el.getAttribute('data-quantity'), 10) || 1
      if (title && Number.isFinite(price) && price > 0) {
        items.push({ item: title.slice(0, 90), price, quantity: qty })
      }
    })
    if (items.length) {
      storageSet({ sw_amz_cart: { items, ts: Date.now() } })
    }
  }

  function watchCart() {
    scrapeCart()
    let t = null
    new MutationObserver(() => {
      clearTimeout(t)
      t = setTimeout(scrapeCart, 600)
    }).observe(document.body, { childList: true, subtree: true })
  }

  // ---------- 2. thank-you page capture ----------

  function captureThankYou() {
    const text = document.body.innerText
    const idm = text.match(/\b(\d{3}-\d{7}-\d{7})\b/)
    const orderId = idm ? idm[1] : 'AMZ-' + Date.now()

    storageGet(
      { sw_captured: [], sw_captured_ids: [], sw_amz_cart: null },
      (data) => {
        if (data.sw_captured_ids.includes(orderId)) return
        const now = new Date().toISOString()
        const snap = data.sw_amz_cart
        const fresh = snap && Date.now() - snap.ts < 30 * 60 * 1000
        let purchases = []

        if (fresh && snap.items.length) {
          purchases = snap.items.flatMap((it, i) =>
            Array.from({ length: it.quantity || 1 }, (_, q) => ({
              id: `${orderId}-${i}-${q}`,
              date: now,
              merchant: 'Amazon',
              item: it.item,
              category: categorize(it.item),
              price: it.price,
              source: 'captured',
            }))
          )
        } else {
          // no cart snapshot — fall back to the order total as one line item
          const totalLine = text.match(/(?:order )?total[:\s]*\$[\d,]+\.?\d*/i)
          const total = totalLine ? parseMoney(totalLine[0]) : null
          if (total) {
            purchases = [{
              id: orderId + '-0',
              date: now,
              merchant: 'Amazon',
              item: 'Amazon order',
              category: 'Misc',
              price: total,
              source: 'captured',
            }]
          }
        }

        if (!purchases.length) return
        storageSet({
          sw_captured: [...data.sw_captured, ...purchases],
          sw_captured_ids: [...data.sw_captured_ids, orderId],
          sw_amz_cart: null,
        })
      }
    )
  }

  // ---------- route by URL ----------

  const path = location.pathname
  if (path.includes('/cart') || path.includes('/gp/cart')) watchCart()
  if (/thankyou|\/checkout\/p\//.test(location.href)) captureThankYou()
})()

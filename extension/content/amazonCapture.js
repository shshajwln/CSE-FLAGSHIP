// Amazon integration, three parts:
//  1. Cart snapshot — remembers what's in your cart (with prices) as you browse.
//  2. Thank-you capture — when an order completes, turns the snapshot into purchases.
//  3. Order-history import — a button on the Your Orders page that pulls real
//     past orders into Spending Wrapped.
// Amazon's DOM drifts, so every parser tries structured markup first and falls
// back to text-pattern matching on the card/page text.
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

  // ---------- 3. order-history import ----------

  function parseOrderCards() {
    const cards = document.querySelectorAll('.order-card, .js-order-card, .order')
    const orders = []
    cards.forEach((card) => {
      const text = card.innerText
      const idMatch = text.match(/\b(\d{3}-\d{7}-\d{7})\b/)
      // US format "June 12, 2026" or AU/UK format "12 June 2026"
      const MONTH = '(?:January|February|March|April|May|June|July|August|September|October|November|December)'
      const dateMatch =
        text.match(new RegExp(MONTH + '\\s+\\d{1,2},\\s+\\d{4}')) ||
        text.match(new RegExp('\\d{1,2}\\s+' + MONTH + '\\s+\\d{4}'))
      // prefer the amount labeled "Total"; fall back to the first $ amount
      const totalMatch =
        text.match(/total[\s\S]{0,30}?\$([\d,]+\.\d{2})/i) || text.match(/\$([\d,]+\.\d{2})/)
      if (!idMatch || !dateMatch || !totalMatch) return

      const titles = [
        ...card.querySelectorAll(
          '.yohtmlc-product-title, a[href*="/dp/"], a[href*="/gp/product/"]'
        ),
      ]
        .map((el) => el.textContent.trim())
        .filter(
          (t) =>
            t.length > 3 &&
            !/^(buy it again|view|track|return|write|get product|ask|share|leave)/i.test(t)
        )

      orders.push({
        orderId: idMatch[1],
        date: new Date(dateMatch[0]).toISOString(),
        total: parseFloat(totalMatch[1].replace(/,/g, '')),
        items: [...new Set(titles)],
      })
    })
    return orders
  }

  function importOrders(btn) {
    const orders = parseOrderCards()
    if (!orders.length) {
      btn.textContent = 'No orders found on this page 😕'
      return
    }
    storageGet({ sw_captured: [], sw_captured_ids: [] }, (data) => {
      const captured = [...data.sw_captured]
      const ids = [...data.sw_captured_ids]
      let added = 0
      for (const order of orders) {
        if (ids.includes(order.orderId)) continue
        ids.push(order.orderId)
        added++
        if (order.items.length) {
          // per-item prices aren't shown on order cards; split the total evenly
          const each = Math.round((order.total / order.items.length) * 100) / 100
          order.items.forEach((title, i) => {
            captured.push({
              id: `${order.orderId}-${i}`,
              date: order.date,
              merchant: 'Amazon',
              item: title.slice(0, 90),
              category: categorize(title),
              price: each,
              source: 'imported',
            })
          })
        } else {
          captured.push({
            id: `${order.orderId}-0`,
            date: order.date,
            merchant: 'Amazon',
            item: 'Amazon order',
            category: 'Misc',
            price: order.total,
            source: 'imported',
          })
        }
      }
      storageSet({ sw_captured: captured, sw_captured_ids: ids }, () => {
        btn.textContent =
          added > 0
            ? `Imported ${added} order${added === 1 ? '' : 's'} ✓ (${ids.length} total)`
            : 'Already imported — all caught up ✓'
      })
    })
  }

  function offerImport() {
    if (document.getElementById('sw-import-btn')) return
    const btn = document.createElement('button')
    btn.id = 'sw-import-btn'
    btn.textContent = '📊 Import this page into Spending Wrapped'
    btn.style.cssText = `
      position: fixed; bottom: 24px; right: 24px; z-index: 999999;
      padding: 12px 18px; border: none; border-radius: 12px; cursor: pointer;
      background: linear-gradient(90deg, #7c3aed, #db2777); color: #fff;
      font: 700 14px system-ui, sans-serif; box-shadow: 0 6px 24px rgba(0,0,0,.35);
    `
    btn.addEventListener('click', () => importOrders(btn))
    document.body.appendChild(btn)
  }

  // ---------- route by URL ----------

  const path = location.pathname
  if (path.includes('/cart') || path.includes('/gp/cart')) watchCart()
  if (/thankyou|\/checkout\/p\//.test(location.href)) captureThankYou()
  if (/order-history|your-orders|your-account\/order/.test(path)) {
    offerImport()
    // orders page is client-rendered; keep trying until cards exist
    new MutationObserver(offerImport).observe(document.body, { childList: true, subtree: true })
  }
})()

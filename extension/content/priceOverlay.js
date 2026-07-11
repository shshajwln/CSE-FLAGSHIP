// Annotates prices on the page with the hours of work they cost at the user's wage.
;(() => {
  const BADGE_CLASS = 'sw-hours-badge'
  const DONE_ATTR = 'data-sw-annotated'
  let wage = 20

  const style = document.createElement('style')
  style.textContent = `
    .${BADGE_CLASS} {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      margin-left: 8px;
      padding: 2px 9px;
      border-radius: 999px;
      font: 600 11.5px/1.6 -apple-system, 'Segoe UI', system-ui, sans-serif;
      color: #fff !important;
      white-space: nowrap;
      vertical-align: middle;
      cursor: default;
      animation: sw-pop 0.25s ease-out;
      background: linear-gradient(135deg, #f97316, #ea580c);
    }
    .${BADGE_CLASS} svg { flex: none; }
    @keyframes sw-pop {
      from { opacity: 0; transform: scale(0.85); }
      to   { opacity: 1; transform: scale(1); }
    }
  `
  document.documentElement.appendChild(style)

  const CLOCK_SVG =
    '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'

  function formatDuration(price) {
    const h = price / wage
    if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`
    if (h >= 100) return `${Math.round(h).toLocaleString()}h`
    let whole = Math.floor(h)
    let mins = Math.round((h - whole) * 60)
    if (mins === 60) {
      whole++
      mins = 0
    }
    return mins ? `${whole}h ${mins}m` : `${whole}h`
  }

  function decorate(badge) {
    const price = parseFloat(badge.dataset.swPrice)
    badge.innerHTML = `${CLOCK_SVG}<span>${formatDuration(price)} of work</span>`
    badge.title = `$${price.toFixed(2)} at $${wage}/hr ≈ ${formatDuration(price)} of your working life`
  }

  function makeBadge(price) {
    const span = document.createElement('span')
    span.className = BADGE_CLASS
    span.dataset.swPrice = String(price)
    decorate(span)
    return span
  }

  // Handles "$12.99", "A$12.99", "£12.99", "€12.99", and bare currency codes
  // like "AUD 30.53" (amazon.com shows those to international shoppers).
  function parsePrice(text) {
    if (!text) return null
    const m =
      text.match(/[$£€]\s?(\d{1,3}(?:,\d{3})*|\d+)(\.\d{2})?/) ||
      text.match(/\b(?:USD|AUD|CAD|GBP|EUR|NZD|SGD)\s?(\d{1,3}(?:,\d{3})*|\d+)(\.\d{2})?/i)
    if (!m) return null
    return parseFloat(m[1].replace(/,/g, '') + (m[2] || ''))
  }

  // Old/list prices (the struck-through "RRP: $1,599.00" kind) shouldn't get a
  // badge — only what the shopper would actually pay.
  function isStruckPrice(el) {
    if (el.matches('.a-text-price, [data-a-strike="true"]')) return true
    if (el.closest('[data-a-strike="true"], .a-text-price, .basisPrice')) return true
    if (getComputedStyle(el).textDecorationLine.includes('line-through')) return true
    // small wrapper whose text is labeled as an old price, e.g. "RRP: $1,599.00"
    const p = el.parentElement
    if (
      p &&
      p.textContent.length < 60 &&
      /\b(RRP|List Price|Was|Typical price)\b/i.test(p.textContent)
    ) {
      return true
    }
    return false
  }

  let badgeCount = 0

  function annotateAll(selector, getPriceText) {
    document.querySelectorAll(selector + ':not([' + DONE_ATTR + '])').forEach((el) => {
      el.setAttribute(DONE_ATTR, '1')
      if (isStruckPrice(el)) return
      const price = parsePrice(getPriceText(el))
      if (price && price > 0.5) {
        el.insertAdjacentElement('afterend', makeBadge(price))
        badgeCount++
      }
    })
  }

  // Fallback for pages without known price markup (e.g. Amazon Haul): badge
  // text nodes that are a standalone price like "$12.88". The length cap and
  // leading-currency rule keep sentences ("Add $10.01 for 5% off") unbadged.
  function scanTextPrices() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    const hits = []
    let node
    while ((node = walker.nextNode())) {
      const t = node.textContent.trim()
      if (t.length < 2 || t.length > 14) continue
      if (!(/^[$£€]\s?\d/.test(t) || /^(?:USD|AUD|CAD|GBP|EUR|NZD|SGD)\b/i.test(t))) continue
      const p = node.parentElement
      if (!(p instanceof HTMLElement)) continue
      if (p.closest('script, style, noscript, .' + BADGE_CLASS + ', [' + DONE_ATTR + ']')) continue
      hits.push(p)
    }
    for (const p of hits) {
      if (p.hasAttribute(DONE_ATTR)) continue
      p.setAttribute(DONE_ATTR, '1')
      if (isStruckPrice(p)) continue
      const price = parsePrice(p.textContent)
      if (price && price > 0.5) {
        p.insertAdjacentElement('afterend', makeBadge(price))
        badgeCount++
      }
    }
  }

  function annotate() {
    const before = badgeCount
    // Amazon splits prices into .a-price > .a-offscreen; handle those as units
    annotateAll('.a-price', (el) => {
      const off = el.querySelector('.a-offscreen')
      return off ? off.textContent : el.textContent
    })
    // Amazon also renders some prices as plain .a-color-price spans
    annotateAll('.a-color-price', (el) =>
      el.closest('.a-price') ? '' : el.textContent
    )
    // generic: elements explicitly marked as prices (demo store uses .price)
    annotateAll('.price', (el) => el.textContent)
    // last resort: standalone price text anywhere on the page
    scanTextPrices()
    if (badgeCount !== before) {
      console.log(`[Spending Wrapped] annotated ${badgeCount} price(s) on ${location.hostname}`)
    } else if (badgeCount === 0) {
      const candidates = document.querySelectorAll('.a-price, .a-color-price, .price').length
      if (candidates) {
        console.log(
          `[Spending Wrapped] found ${candidates} price element(s) but parsed none — ` +
            `sample text: "${document.querySelector('.a-price, .a-color-price, .price').textContent.trim().slice(0, 40)}"`
        )
      }
    }
  }

  function refreshBadges() {
    document.querySelectorAll('.' + BADGE_CLASS).forEach(decorate)
  }

  console.log('[Spending Wrapped] price overlay loaded on', location.href)

  // Annotate immediately with the default wage — never block on storage.
  // (chrome.* calls throw "context invalidated" in tabs that were open when
  // the extension was reloaded; the overlay should still work there.)
  annotate()

  try {
    chrome.storage.local.get({ sw_wage: 20 }, (v) => {
      if (chrome.runtime.lastError) return
      wage = v.sw_wage
      refreshBadges()
    })
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sw_wage) {
        wage = changes.sw_wage.newValue
        refreshBadges()
      }
    })
  } catch (e) {
    console.warn('[Spending Wrapped] using default wage — reload this tab to sync settings')
  }

  let timer = null
  new MutationObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(annotate, 400)
  }).observe(document.body, { childList: true, subtree: true })

  // Amazon hydrates a lot of content after idle; sweep again on full load
  window.addEventListener('load', annotate)
})()

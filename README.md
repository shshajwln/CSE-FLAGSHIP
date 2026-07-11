# Spending Wrapped

Spotify Wrapped, but for your spending — and it roasts you. A hackathon project
about noticing (and curbing) consumerism.

**Three pieces:**

| Piece | What it does |
| --- | --- |
| `app/` | React + Vite web app. Full-screen Wrapped slides: total spent, hours of your life worked, top category, gremlin-hours, biggest splurge — with rule-based roast commentary. |
| `extension/` | Chrome extension (MV3). Annotates prices anywhere with **"≈ X hrs of work"** at your wage, captures purchases at checkout, and syncs them live into your Wrapped. |
| `app/public/demo-store/` | "Vantage Goods" — a fake shop served by the same dev server, so the live-capture demo never depends on Amazon's DOM. |

## Run it

```bash
cd app
npm install
npm run dev
```

- **Wrapped app:** http://localhost:5173/
- **Demo store:** http://localhost:5173/demo-store/index.html

### Load the extension

1. Open `chrome://extensions`, enable **Developer mode**
2. **Load unpacked** → select the `extension/` folder
3. Click the extension icon and set your hourly wage (or salary)

## The demo script (~2 min)

1. Open the **demo store**. Every price now shows *"≈ 2.5 hrs of work"* — the
   extension also does this on real Amazon pages.
2. Add a couple of things to the cart, checkout. The confirmation page is
   captured by the extension.
3. Open the **Wrapped app**, pick **"July 2026 (so far)"** — the purchase you
   just made is already in there, tagged "captured live."
4. Switch to last month / the year view and click through the slides for the
   full roast.

## How data flows

```
demo store checkout ──▶ capture.js ──▶ chrome.storage.local
                                            │
popup (wage settings) ──────────────────────┤
                                            ▼
                          syncBridge.js (runs on the app's origin)
                                            │ writes localStorage + fires 'sw-sync'
                                            ▼
                              Wrapped app re-renders live
```

Seeded demo data (12 months, deterministic) is generated on first load and
stored in `localStorage`. Everything is client-side — no backend, nothing to
break on stage.

## Using it with real Amazon data

The extension works on actual Amazon (`amazon.com` / `.ca` / `.co.uk`) three ways:

1. **Price overlay** — product, search, and cart pages show *"≈ X hrs of work"*
   next to every price.
2. **Live checkout capture** — the extension snapshots your cart (names +
   prices) as you browse, and when the order-confirmation page appears it turns
   that snapshot into purchases. If no snapshot exists it falls back to logging
   the order total as a single line.
3. **Order-history import** (the good one) — extension popup → *"Open your
   Amazon order history"* → a purple **Import** button appears on the page.
   It parses the visible order cards (order ID, date, total, item titles),
   auto-categorizes items by keyword, and dedupes by order ID, so paging
   through your history and re-clicking is safe. Amazon order cards don't show
   per-item prices, so multi-item orders split the total evenly across items.

On the Wrapped intro screen, untick **"include demo data"** to see a Wrapped
built purely from your real purchases.

**Caveat:** Amazon changes its markup regularly and A/B-tests layouts. The
parsers try structured selectors first (`data-price`, `.sc-list-item`,
`.order-card`, `.yohtmlc-product-title`) and fall back to text-pattern matching
(order-ID/date/total regexes), but do a dry run on your own account before the
demo. Everything stays on your machine — nothing is sent anywhere.

## Notes

- Wage set in the extension popup syncs into the app; the app's intro screen
  also has its own wage input.
- "Regenerate" on the intro screen wipes and reseeds the demo data.
- To annotate prices on more sites, add them to `content_scripts` matches in
  `extension/manifest.json` (the overlay handles Amazon's split-price markup
  and any element with class `price`).

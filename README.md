# Spending Wrapped

Spotify Wrapped, but for your spending. The goal is to make consumption visible:
you get a monthly and yearly recap of what you bought, with commentary, and a
browser extension that re-prices everything in hours of your working life.

Live app: https://cse-flagship.vercel.app/

## What's in this repo

- `app/` – the Wrapped web app (React + Vite). Slide-based recap of your
  spending: total spent, hours of life worked to pay for it, top categories,
  late-night purchases, biggest splurge.
- `extension/` – Chrome extension. Tags prices on shopping sites with the
  hours of work they cost at your wage, and records purchases made at checkout
  so they appear in your Wrapped.
- `app/public/demo-store/` – a small fake shop used to test the extension end
  to end without relying on a real retailer.

## Setup

The app itself needs no setup, it runs at the link above.

To install the extension:

1. Go to `chrome://extensions` and turn on Developer mode
2. Click "Load unpacked" and select the `extension/` folder
3. Click the extension icon and enter your hourly wage (or salary)

Prices on Amazon and the demo store will now show a tag like "3h 12m of work".
Purchases made on the demo store are captured automatically and sync into the
app.

## Running locally

```
cd app
npm install
npm run dev
```

App runs at http://localhost:5173, demo store at
http://localhost:5173/demo-store/index.html.

Everything is client-side: purchase data lives in localStorage and
chrome.storage, nothing is sent to a server. The app seeds itself with
generated demo data on first load.

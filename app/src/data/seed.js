// Deterministic seed-data generator: ~12 months of realistic purchases,
// plus a partial current month so live demo captures land alongside real-looking data.

function mulberry32(seed) {
  let t = seed
  return function () {
    t |= 0
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// hours profile controls what time of day purchases happen
const CATALOG = {
  Coffee: {
    merchants: ['Daily Grind', 'Starbucks', 'Blue Bottle'],
    items: [
      ['Oat latte', 5.5, 7.5],
      ['Cold brew', 4.5, 6.5],
      ['Cappuccino', 4.75, 6.25],
      ['Matcha latte', 6, 8],
    ],
    perMonth: [10, 18],
    hours: 'day',
  },
  Groceries: {
    merchants: ["Trader Joe's", 'Safeway'],
    items: [['Weekly groceries', 45, 110]],
    perMonth: [4, 5],
    hours: 'day',
  },
  'Food Delivery': {
    merchants: ['DoorDash', 'Uber Eats'],
    items: [
      ['Thai delivery', 22, 42],
      ['Burrito bowl', 16, 28],
      ['Sushi order', 28, 55],
      ['Pizza night', 20, 35],
      ['Late-night burger', 14, 26],
    ],
    perMonth: [5, 11],
    hours: 'evening',
  },
  Clothing: {
    merchants: ['Zara', 'Uniqlo', 'ASOS', 'TikTok Shop'],
    items: [
      ['Oversized hoodie', 38, 72],
      ['Graphic tee', 18, 35],
      ['Cargo pants', 45, 85],
      ['Sneakers', 70, 140],
      ["'Basics' haul", 60, 120],
      ['Jacket that was on sale', 55, 110],
    ],
    perMonth: [2, 5],
    hours: 'evening',
  },
  Electronics: {
    merchants: ['Amazon', 'Best Buy'],
    items: [
      ['USB-C cables (3-pack)', 12, 20],
      ['Mechanical keyboard', 80, 150],
      ['Phone case #4', 15, 30],
      ['Smart bulb', 20, 35],
      ['Earbuds upgrade', 60, 130],
    ],
    perMonth: [1, 3],
    hours: 'day',
  },
  Impulse: {
    merchants: ['Amazon', 'Etsy', 'TikTok Shop'],
    items: [
      ['LED galaxy projector', 35, 55],
      ['Mini waffle maker', 20, 30],
      ['Motivational water bottle', 25, 38],
      ['Desk vacuum', 15, 25],
      ['Mystery gadget', 18, 45],
      ['Novelty mug', 12, 22],
      ['Scented candle #7', 14, 28],
    ],
    perMonth: [1, 4],
    hours: 'late',
  },
  Beauty: {
    merchants: ['Sephora', 'Ulta'],
    items: [
      ['Skincare serum', 28, 65],
      ["'One' lipstick", 18, 30],
      ['Hair product', 22, 40],
    ],
    perMonth: [0, 2],
    hours: 'evening',
  },
  Gaming: {
    merchants: ['Steam', 'Nintendo eShop'],
    items: [
      ['Game on sale (unplayed)', 10, 40],
      ['Season pass', 25, 40],
      ['In-game currency', 10, 25],
    ],
    perMonth: [0, 2],
    hours: 'late',
  },
}

const SUBSCRIPTIONS = [
  ['Netflix', 'Netflix', 15.49],
  ['Spotify Premium', 'Spotify', 11.99],
  ['Gym membership', 'FitLife Gym', 39.99],
  ['iCloud storage', 'Apple', 2.99],
  ['Prime membership', 'Amazon', 14.99],
]

function pickHour(rand, profile) {
  if (profile === 'day') return 8 + Math.floor(rand() * 11) // 8–18
  if (profile === 'evening') return 17 + Math.floor(rand() * 6) // 17–22
  return (22 + Math.floor(rand() * 5)) % 24 // late: 22,23,0,1,2
}

export function generateSeed(now = new Date()) {
  const rand = mulberry32(20260711)
  const purchases = []
  let counter = 0

  // 12 full months back plus the current partial month
  for (let i = 12; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const y = d.getFullYear()
    const m = d.getMonth()
    const isCurrent = i === 0
    const isLastFull = i === 1
    const maxDay = isCurrent ? Math.max(1, now.getDate() - 1) : 28
    const scale = isCurrent ? 0.4 : 1

    for (const [name, merchant, price] of SUBSCRIPTIONS) {
      const day = 1 + Math.floor(rand() * 5)
      if (isCurrent && day > maxDay) continue
      purchases.push({
        id: `s${counter++}`,
        date: new Date(y, m, day, 6, 0).toISOString(),
        merchant,
        item: name,
        category: 'Subscriptions',
        price,
        source: 'seeded',
      })
    }

    for (const [category, cfg] of Object.entries(CATALOG)) {
      const [lo, hi] = cfg.perMonth
      let n = Math.round((lo + rand() * (hi - lo)) * scale)
      // make the most recent full month spicy so the demo stats land
      if (isLastFull && (category === 'Clothing' || category === 'Impulse')) n += 2
      for (let k = 0; k < n; k++) {
        const [itemName, pLo, pHi] = cfg.items[Math.floor(rand() * cfg.items.length)]
        const day = 1 + Math.floor(rand() * maxDay)
        const hour = pickHour(rand, cfg.hours)
        const minute = Math.floor(rand() * 60)
        purchases.push({
          id: `s${counter++}`,
          date: new Date(y, m, day, hour, minute).toISOString(),
          merchant: cfg.merchants[Math.floor(rand() * cfg.merchants.length)],
          item: itemName,
          category,
          price: Math.round((pLo + rand() * (pHi - pLo)) * 100) / 100,
          source: 'seeded',
        })
      }
    }
  }

  purchases.sort((a, b) => a.date.localeCompare(b.date))
  return purchases
}

// Pure stat computation over purchase records — no DOM, no storage.

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function getPeriods(now = new Date()) {
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  return {
    lastMonth: {
      key: 'lastMonth',
      label: `${MONTHS[last.getMonth()]} ${last.getFullYear()}`,
      filter: (p) => sameMonth(p, last),
      prevFilter: (p) => sameMonth(p, new Date(last.getFullYear(), last.getMonth() - 1, 1)),
    },
    thisMonth: {
      key: 'thisMonth',
      label: `${MONTHS[now.getMonth()]} ${now.getFullYear()} (so far)`,
      filter: (p) => sameMonth(p, now),
      prevFilter: null,
    },
    year: {
      key: 'year',
      label: 'Your Last 12 Months',
      filter: (p) => {
        const d = new Date(p.date)
        const cutoff = new Date(now.getFullYear() - 1, now.getMonth(), 1)
        return d >= cutoff && d <= now
      },
      prevFilter: null,
    },
  }
}

function sameMonth(p, ref) {
  const d = new Date(p.date)
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth()
}

const NEVER_SKIP = new Set(['Groceries', 'Subscriptions'])

export function computeStats(purchases, prevPurchases, wage) {
  const total = sum(purchases)
  const byCatMap = new Map()
  const byMerchMap = new Map()
  let biggest = null
  let lateNight = { count: 0, total: 0 }
  const hourCounts = new Array(24).fill(0)

  for (const p of purchases) {
    bump(byCatMap, p.category, p.price)
    bump(byMerchMap, p.merchant, p.price)
    if (!biggest || p.price > biggest.price) biggest = p
    const h = new Date(p.date).getHours()
    // subscriptions bill automatically at fixed times — not real shopping behavior
    if (p.category !== 'Subscriptions') {
      hourCounts[h]++
      if (h >= 22 || h < 3) {
        lateNight.count++
        lateNight.total += p.price
      }
    }
  }

  const byCategory = [...byCatMap.entries()]
    .map(([category, v]) => ({ category, ...v, pct: total ? (v.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total)

  const merchants = [...byMerchMap.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count || b.total - a.total)

  const skippable = byCategory.filter((c) => !NEVER_SKIP.has(c.category))
  const prevTotal = prevPurchases ? sum(prevPurchases) : null
  const hours = total / wage

  return {
    total,
    count: purchases.length,
    byCategory,
    topCategory: byCategory[0] || null,
    topDiscretionary: skippable[0] || null,
    topMerchant: merchants[0] || null,
    biggest,
    lateNight,
    hours,
    workDays: hours / 8,
    deltaPct: prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null,
    skip: skippable[0] || null,
    busiestHour: hourCounts.indexOf(Math.max(...hourCounts)),
    capturedCount: purchases.filter((p) => p.source !== 'seeded').length,
    wage,
  }
}

function sum(list) {
  return list.reduce((acc, p) => acc + p.price, 0)
}

function bump(map, key, price) {
  const v = map.get(key) || { count: 0, total: 0 }
  v.count++
  v.total += price
  map.set(key, v)
}

export function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtMoneyRound(n) {
  return '$' + Math.round(n).toLocaleString('en-US')
}

export function fmtHours(h) {
  if (h < 1) return `${Math.round(h * 60)} minutes`
  return `${h.toLocaleString('en-US', { maximumFractionDigits: 1 })} hours`
}

export function fmtHour12(h) {
  const ampm = h >= 12 ? 'pm' : 'am'
  const hr = h % 12 === 0 ? 12 : h % 12
  return `${hr}${ampm}`
}

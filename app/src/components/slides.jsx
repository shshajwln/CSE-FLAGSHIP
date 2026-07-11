import { motion } from 'framer-motion'
import { fmtMoney, fmtMoneyRound, fmtHours } from '../stats/stats.js'
import {
  totalRoast, deltaLine, hoursRoast, categoryRoast, merchantRoast,
  lateNightRoast, splurgeRoast, skipRoast, witchingHourLine,
} from '../stats/roasts.js'

const rise = (delay) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.5, ease: 'easeOut' },
})

function Eyebrow({ children, delay = 0 }) {
  return <motion.p className="eyebrow" {...rise(delay)}>{children}</motion.p>
}
function Big({ children, delay = 0.15 }) {
  return <motion.h1 className="big" {...rise(delay)}>{children}</motion.h1>
}
function Sub({ children, delay = 0.35 }) {
  return <motion.p className="sub" {...rise(delay)}>{children}</motion.p>
}
function Roast({ children, delay = 0.6 }) {
  return <motion.p className="roast" {...rise(delay)}>{children}</motion.p>
}

export function buildSlides(stats, periodLabel) {
  const slides = []
  const s = stats

  slides.push({
    key: 'total',
    cls: 's-total',
    el: (
      <>
        <Eyebrow>{periodLabel} — you spent</Eyebrow>
        <Big>{fmtMoney(s.total)}</Big>
        <Sub>across {s.count} purchases{s.capturedCount > 0 && s.capturedCount < s.count ? ` (${s.capturedCount} of them real)` : ''}</Sub>
        <Roast>{totalRoast(s)}{deltaLine(s) ? ` ${deltaLine(s)}` : ''}</Roast>
      </>
    ),
  })

  slides.push({
    key: 'hours',
    cls: 's-hours',
    el: (
      <>
        <Eyebrow>At ${s.wage}/hr, that cost you</Eyebrow>
        <Big>{fmtHours(s.hours)}</Big>
        <Sub>of your life, worked and handed over</Sub>
        <Roast>{hoursRoast(s)}</Roast>
      </>
    ),
  })

  const spotlightCat = s.topDiscretionary || s.topCategory
  if (spotlightCat) {
    slides.push({
      key: 'category',
      cls: 's-cat',
      el: (
        <>
          <Eyebrow>Your #1 splurge category</Eyebrow>
          <Big>{spotlightCat.category}</Big>
          <motion.div className="bars" {...rise(0.35)}>
            {s.byCategory.slice(0, 5).map((c) => (
              <div className="bar-row" key={c.category}>
                <span className="bar-label">{c.category}</span>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${Math.max(6, (c.total / s.byCategory[0].total) * 100)}%` }}
                  />
                </div>
                <span className="bar-amt">{fmtMoneyRound(c.total)}</span>
              </div>
            ))}
          </motion.div>
          <Roast delay={0.7}>{categoryRoast(s)}</Roast>
        </>
      ),
    })
  }

  if (s.topMerchant) {
    slides.push({
      key: 'merchant',
      cls: 's-merch',
      el: (
        <>
          <Eyebrow>Your most loyal relationship</Eyebrow>
          <Big>{s.topMerchant.name}</Big>
          <Sub>{fmtMoney(s.topMerchant.total)} over {s.topMerchant.count} visits</Sub>
          <Roast>{merchantRoast(s)}</Roast>
        </>
      ),
    })
  }

  slides.push({
    key: 'night',
    cls: 's-night',
    el: (
      <>
        <Eyebrow>The gremlin hours</Eyebrow>
        <Big>{witchingHourLine(s)}</Big>
        <Roast>{lateNightRoast(s)}</Roast>
      </>
    ),
  })

  if (s.biggest) {
    slides.push({
      key: 'splurge',
      cls: 's-splurge',
      el: (
        <>
          <Eyebrow>Your biggest single hit</Eyebrow>
          <Big>{s.biggest.item}</Big>
          <Roast>{splurgeRoast(s, s.wage)}</Roast>
        </>
      ),
    })
  }

  const skip = skipRoast(s)
  if (skip) {
    slides.push({
      key: 'skip',
      cls: 's-skip',
      el: (
        <>
          <Eyebrow>Put it back.</Eyebrow>
          <Big>{skip.amount}</Big>
          <Sub>is what {skip.category.toLowerCase()} cost you</Sub>
          <Roast>{skip.line}</Roast>
        </>
      ),
    })
  }

  slides.push({
    key: 'summary',
    cls: 's-summary',
    el: (
      <>
        <Eyebrow>Your Spending Wrapped</Eyebrow>
        <motion.h2 className="summary-title" {...rise(0.1)}>{periodLabel}</motion.h2>
        <motion.div className="summary-grid" {...rise(0.3)}>
          <SummaryCell label="Total spent" value={fmtMoney(s.total)} />
          <SummaryCell label="Hours of life" value={fmtHours(s.hours)} />
          <SummaryCell label="Top splurge" value={s.topDiscretionary ? s.topDiscretionary.category : '—'} />
          <SummaryCell label="Most visited" value={s.topMerchant ? s.topMerchant.name : '—'} />
          <SummaryCell label="Late-night buys" value={String(s.lateNight.count)} />
          <SummaryCell label="Biggest splurge" value={s.biggest ? fmtMoney(s.biggest.price) : '—'} />
        </motion.div>
        <Roast delay={0.55}>Screenshot this. Or don't — it knows what it did.</Roast>
      </>
    ),
  })

  return slides
}

function SummaryCell({ label, value }) {
  return (
    <div className="summary-cell">
      <div className="summary-value">{value}</div>
      <div className="summary-label">{label}</div>
    </div>
  )
}

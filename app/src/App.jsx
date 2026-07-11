import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  loadPurchases, getWage, setWage, resetSeed, onDataChange, getUseSeed, setUseSeed,
} from './data/storage.js'
import { getPeriods, computeStats } from './stats/stats.js'
import { buildSlides } from './components/slides.jsx'

export default function App() {
  const [version, setVersion] = useState(0)
  const [periodKey, setPeriodKey] = useState('lastMonth')
  const [wage, setWageLocal] = useState(getWage())
  const [useSeed, setUseSeedLocal] = useState(getUseSeed())
  const [index, setIndex] = useState(-1) // -1 = intro screen

  useEffect(
    () =>
      onDataChange(() => {
        setVersion((v) => v + 1)
        setWageLocal(getWage())
      }),
    []
  )

  const purchases = useMemo(() => loadPurchases(), [version])
  const periods = useMemo(() => getPeriods(), [])
  const period = periods[periodKey]

  const stats = useMemo(() => {
    const cur = purchases.filter(period.filter)
    const prev = period.prevFilter ? purchases.filter(period.prevFilter) : null
    return computeStats(cur, prev, wage)
  }, [purchases, period, wage])

  const slides = useMemo(() => buildSlides(stats, period.label), [stats, period])

  useEffect(() => {
    const onKey = (e) => {
      if (index < 0) return
      if (e.key === 'ArrowRight' || e.key === ' ') setIndex((i) => Math.min(i + 1, slides.length - 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      if (e.key === 'Escape') setIndex(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, slides.length])

  if (index < 0) {
    return (
      <Intro
        periods={periods}
        periodKey={periodKey}
        setPeriodKey={setPeriodKey}
        wage={wage}
        onWage={(w) => {
          setWageLocal(w)
          setWage(w)
        }}
        onStart={() => setIndex(0)}
        onReset={() => {
          resetSeed()
          setVersion((v) => v + 1)
        }}
        useSeed={useSeed}
        onUseSeed={(v) => {
          setUseSeedLocal(v)
          setUseSeed(v)
          setVersion((x) => x + 1)
        }}
        purchaseCount={stats.count}
      />
    )
  }

  const slide = slides[index]

  return (
    <div
      className={`slide ${slide.cls}`}
      onClick={(e) => {
        const goBack = e.clientX < window.innerWidth / 3
        if (goBack) setIndex((i) => Math.max(i - 1, 0))
        else if (index === slides.length - 1) setIndex(-1)
        else setIndex((i) => i + 1)
      }}
    >
      <div className="progress">
        {slides.map((sl, i) => (
          <div key={sl.key} className={`progress-seg ${i <= index ? 'on' : ''}`} />
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.key}
          className="slide-inner"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {slide.el}
        </motion.div>
      </AnimatePresence>
      <div className="hint">tap right to continue · left to go back · esc to exit</div>
    </div>
  )
}

function Intro({
  periods, periodKey, setPeriodKey, wage, onWage, onStart, onReset,
  useSeed, onUseSeed, purchaseCount,
}) {
  // the field holds free text while editing (so it can pass through "" and
  // partial values like "2."); only valid parses are committed to the wage
  const [wageText, setWageText] = useState(String(wage))
  useEffect(() => {
    setWageText(String(wage))
  }, [wage])

  return (
    <div className="intro">
      <motion.div
        className="intro-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="intro-title">
          Spending <span className="grad-text">Wrapped</span>
        </h1>
        <p className="intro-tag">Your money has been talking behind your back. Time to listen.</p>

        <div className="chips">
          {Object.values(periods).map((p) => (
            <button
              key={p.key}
              className={`chip ${p.key === periodKey ? 'chip-on' : ''}`}
              onClick={() => setPeriodKey(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <label className="wage-row">
          <span>Your hourly wage</span>
          <div className="wage-input">
            $
            <input
              type="number"
              min="1"
              step="0.5"
              value={wageText}
              onChange={(e) => {
                setWageText(e.target.value)
                const w = parseFloat(e.target.value)
                if (Number.isFinite(w) && w > 0) onWage(w)
              }}
              onBlur={() => {
                if (!(parseFloat(wageText) > 0)) setWageText(String(wage))
              }}
            />
            /hr
          </div>
        </label>
        <p className="wage-note">
          Used to translate prices into hours of your life. Syncs with the browser extension.
        </p>

        <button className="start-btn" onClick={onStart}>
          Show me the damage →
        </button>

        <p className="intro-meta">
          {purchaseCount} purchases in this period ·{' '}
          <label className="seed-toggle">
            <input
              type="checkbox"
              checked={useSeed}
              onChange={(e) => onUseSeed(e.target.checked)}
            />{' '}
            include demo data
          </label>{' '}
          ·{' '}
          <button className="link-btn" onClick={onReset}>
            regenerate
          </button>
        </p>
        {!useSeed && (
          <p className="wage-note">
            Real data only — captured and imported purchases from the extension.
          </p>
        )}
      </motion.div>
    </div>
  )
}

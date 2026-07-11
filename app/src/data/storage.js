import { generateSeed } from './seed.js'

const SEED_KEY = 'sw_seed_v1'
const CAPTURED_KEY = 'sw_captured'
const WAGE_KEY = 'sw_wage'
const USE_SEED_KEY = 'sw_use_seed'

export function loadPurchases() {
  let captured = []
  try {
    captured = JSON.parse(localStorage.getItem(CAPTURED_KEY)) || []
  } catch {
    captured = []
  }
  if (!getUseSeed()) return captured

  let seed
  try {
    seed = JSON.parse(localStorage.getItem(SEED_KEY))
  } catch {
    seed = null
  }
  if (!Array.isArray(seed) || seed.length === 0) {
    seed = generateSeed()
    localStorage.setItem(SEED_KEY, JSON.stringify(seed))
  }
  return [...seed, ...captured]
}

export function getUseSeed() {
  return localStorage.getItem(USE_SEED_KEY) !== '0'
}

export function setUseSeed(v) {
  localStorage.setItem(USE_SEED_KEY, v ? '1' : '0')
}

export function getWage() {
  const w = parseFloat(localStorage.getItem(WAGE_KEY))
  return Number.isFinite(w) && w > 0 ? w : 20
}

export function setWage(w) {
  localStorage.setItem(WAGE_KEY, String(w))
  // tell the extension's sync bridge (if installed) so the popup stays in step
  window.dispatchEvent(new CustomEvent('sw-wage-set', { detail: w }))
}

// only regenerates demo data — captured/imported real purchases are cleared
// from the extension popup, which owns that data in chrome.storage
export function resetSeed() {
  localStorage.removeItem(SEED_KEY)
}

// The extension's sync bridge writes sw_captured/sw_wage into localStorage and
// fires 'sw-sync'; the 'storage' event covers edits from other tabs (demo store).
export function onDataChange(cb) {
  const handler = () => cb()
  window.addEventListener('sw-sync', handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener('sw-sync', handler)
    window.removeEventListener('storage', handler)
  }
}

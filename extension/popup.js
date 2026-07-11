const HOURS_PER_YEAR = 2080 // 40 hrs × 52 weeks

const hourlyInput = document.getElementById('hourly')
const salaryInput = document.getElementById('salary')
const wageNote = document.getElementById('wage-note')

function setWage(wage) {
  chrome.storage.local.set({ sw_wage: wage })
  wageNote.textContent = `Every $${wage.toFixed(2)} spent = one hour of your life.`
}

chrome.storage.local.get({ sw_wage: 20 }, ({ sw_wage }) => {
  hourlyInput.value = sw_wage
  salaryInput.value = Math.round(sw_wage * HOURS_PER_YEAR)
  wageNote.textContent = `Every $${sw_wage.toFixed(2)} spent = one hour of your life.`
})

hourlyInput.addEventListener('input', () => {
  const w = parseFloat(hourlyInput.value)
  if (Number.isFinite(w) && w > 0) {
    salaryInput.value = Math.round(w * HOURS_PER_YEAR)
    setWage(w)
  }
})

salaryInput.addEventListener('input', () => {
  const s = parseFloat(salaryInput.value)
  if (Number.isFinite(s) && s > 0) {
    const w = Math.round((s / HOURS_PER_YEAR) * 100) / 100
    hourlyInput.value = w
    setWage(w)
  }
})

function renderCaptured() {
  chrome.storage.local.get({ sw_captured: [], sw_wage: 20 }, ({ sw_captured, sw_wage }) => {
    const list = document.getElementById('captured-list')
    const countPill = document.getElementById('cap-count')
    const totalRow = document.getElementById('cap-total-row')
    const clearBtn = document.getElementById('clear-btn')

    countPill.textContent = String(sw_captured.length)
    if (sw_captured.length === 0) {
      list.innerHTML = '<div class="cap-empty">Nothing captured yet. Go "shop" at the demo store.</div>'
      totalRow.hidden = true
      clearBtn.hidden = true
      return
    }
    list.innerHTML = sw_captured
      .slice(-6)
      .reverse()
      .map((p) => {
        const hrs = (p.price / sw_wage).toFixed(1)
        return `<div class="cap-item">
          <span class="cap-name">${p.item}</span>
          <span class="cap-hrs">$${p.price.toFixed(2)} · ${hrs}h</span>
        </div>`
      })
      .join('')
    const total = sw_captured.reduce((s, p) => s + p.price, 0)
    document.getElementById('cap-total').textContent =
      `$${total.toFixed(2)} (${(total / sw_wage).toFixed(1)} hrs)`
    totalRow.hidden = false
    clearBtn.hidden = false
  })
}

// the Wrapped app's dev-server URL; change if you deploy it somewhere
const WRAPPED_URL = 'http://localhost:5173/'

document.getElementById('wrapped-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: WRAPPED_URL })
})

document.getElementById('amz-btn').addEventListener('click', () => {
  // reuse the Amazon storefront from the current tab if there is one
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = (tabs[0] && tabs[0].url) || ''
    const m = url.match(/https:\/\/www\.(amazon\.[a-z.]+)\//)
    const domain = m ? m[1] : 'amazon.com.au'
    chrome.tabs.create({ url: `https://www.${domain}/your-orders/orders` })
  })
})

document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.storage.local.set({ sw_captured: [], sw_captured_ids: [] }, renderCaptured)
})

chrome.storage.onChanged.addListener(renderCaptured)
renderCaptured()

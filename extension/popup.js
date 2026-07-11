const HOURS_PER_YEAR = 2080 // 40 hrs × 52 weeks

// the deployed Wrapped app
const WRAPPED_URL = 'https://cse-flagship.vercel.app/'

document.getElementById('wrapped-btn').addEventListener('click', () => {
  chrome.tabs.create({ url: WRAPPED_URL })
})

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

// reflect wage changes made in the Wrapped app while the popup is open,
// without clobbering a field the user is currently typing in
chrome.storage.onChanged.addListener((changes) => {
  if (!changes.sw_wage) return
  const w = changes.sw_wage.newValue
  if (!Number.isFinite(w)) return
  if (document.activeElement !== hourlyInput) hourlyInput.value = w
  if (document.activeElement !== salaryInput) salaryInput.value = Math.round(w * HOURS_PER_YEAR)
  wageNote.textContent = `Every $${w.toFixed(2)} spent = one hour of your life.`
})

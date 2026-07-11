const PRODUCTS = [
  { id: 'p1', name: 'LED Galaxy Projector', price: 49.99, category: 'Impulse', emoji: '🌌' },
  { id: 'p2', name: 'Wireless Earbuds Pro', price: 89.99, category: 'Electronics', emoji: '🎧' },
  { id: 'p3', name: 'Cloud Hoodie', price: 64.0, category: 'Clothing', emoji: '🧥' },
  { id: 'p4', name: 'Mini Waffle Maker', price: 24.99, category: 'Impulse', emoji: '🧇' },
  { id: 'p5', name: 'Motivational Water Bottle', price: 32.0, category: 'Impulse', emoji: '💧' },
  { id: 'p6', name: 'Mechanical Keyboard TKL', price: 129.99, category: 'Electronics', emoji: '⌨️' },
  { id: 'p7', name: 'Scented Candle No. 7', price: 21.5, category: 'Impulse', emoji: '🕯️' },
  { id: 'p8', name: 'Limited Sneakers V2', price: 149.0, category: 'Clothing', emoji: '👟' },
]

const CART_KEY = 'ds_cart'

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || []
  } catch {
    return []
  }
}

function setCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  renderCart()
}

function renderProducts() {
  const grid = document.getElementById('products')
  grid.innerHTML = PRODUCTS.map(
    (p) => `
    <div class="product-card">
      <div class="product-emoji">${p.emoji}</div>
      <div class="product-name">${p.name}</div>
      <div class="product-price price">$${p.price.toFixed(2)}</div>
      <button class="add-btn" data-id="${p.id}">Add to cart</button>
    </div>`
  ).join('')
  grid.addEventListener('click', (e) => {
    const id = e.target.dataset && e.target.dataset.id
    if (!id) return
    const product = PRODUCTS.find((p) => p.id === id)
    setCart([...getCart(), product])
  })
}

function renderCart() {
  const cart = getCart()
  const wrap = document.getElementById('cart-items')
  if (cart.length === 0) {
    wrap.innerHTML = '<div class="cart-empty">Nothing yet. The void awaits.</div>'
  } else {
    wrap.innerHTML = cart
      .map(
        (item, i) => `
      <div class="cart-item">
        <span>${item.emoji} ${item.name}</span>
        <span><span class="price">$${item.price.toFixed(2)}</span>
        <button class="remove-btn" data-idx="${i}" title="Remove">✕</button></span>
      </div>`
      )
      .join('')
  }
  const total = cart.reduce((s, i) => s + i.price, 0)
  document.getElementById('cart-total').textContent = `$${total.toFixed(2)}`
  document.getElementById('checkout-btn').disabled = cart.length === 0
}

document.getElementById('cart-items').addEventListener('click', (e) => {
  const idx = e.target.dataset && e.target.dataset.idx
  if (idx == null) return
  const cart = getCart()
  cart.splice(Number(idx), 1)
  setCart(cart)
})

document.getElementById('checkout-btn').addEventListener('click', () => {
  const cart = getCart()
  if (cart.length === 0) return
  const order = {
    orderId: 'VG-' + Date.now(),
    merchant: 'Vantage Goods',
    date: new Date().toISOString(),
    items: cart.map((i) => ({ item: i.name, price: i.price, category: i.category })),
  }
  localStorage.setItem('ds_last_order', JSON.stringify(order))
  localStorage.removeItem(CART_KEY)
  location.href = 'confirmation.html'
})

renderProducts()
renderCart()

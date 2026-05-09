import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProducts, createProduct, updateProduct, updateStatus } from '../api/productApi'
import ProductCard from '../components/ProductCard'
import Modal from '../components/Modal'
import LoadingSpinner from '../components/LoadingSpinner'
import { useAuth } from '../context/AuthContext'

const EMPTY = { name: '', category: '', unit: 'kg', price: '' }

export default function ProductsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAdmin  = user?.role === 'ADMIN'
  const isFarmer = user?.role === 'FARMER'

  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem]   = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState('')
  const [cart, setCart]           = useState({}) // { productId: quantity }

  const load = () => {
    setLoading(true)
    getProducts().then(r => setProducts(r.data)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openCreate = () => { setEditItem(null); setForm(EMPTY); setError(''); setShowModal(true) }
  const openEdit   = p  => { setEditItem(p); setForm({ name: p.name, category: p.category, unit: p.unit, price: p.price }); setError(''); setShowModal(true) }

  const handleSave = async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, price: parseFloat(form.price) }
      if (editItem) await updateProduct(editItem.id, payload)
      else          await createProduct(payload)
      setShowModal(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Failed') }
    finally { setSaving(false) }
  }

  const handleToggle = async p => {
    const next = p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try { await updateStatus(p.id, next); load() }
    catch (e) { alert(e.response?.data?.message || 'Failed') }
  }

  const addToCart = p => setCart(prev => ({ ...prev, [p.id]: { product: p, qty: (prev[p.id]?.qty || 0) + 1 } }))

  const visible = isFarmer ? products.filter(p => p.status === 'ACTIVE') : products
  const cartCount = Object.keys(cart).length

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-3">
          {isFarmer && cartCount > 0 && (
            <button onClick={() => navigate('/place-request', { state: { cart } })}
              className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
              🛒 Cart ({cartCount}) → Request
            </button>
          )}
          {isAdmin && (
            <button onClick={openCreate}
              className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-4 py-2 text-sm font-medium">
              + Add Product
            </button>
          )}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : !visible.length ? (
        <p className="text-center text-gray-400 py-12">No products found</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visible.map(p => (
            <ProductCard key={p.id} product={p}
              onEdit={isAdmin ? openEdit : null}
              onToggleStatus={isAdmin ? handleToggle : null}
              onAddToCart={isFarmer ? addToCart : null}
              cartQty={cart[p.id]?.qty || 0}
            />
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editItem ? 'Edit Product' : 'Add Product'} onClose={() => setShowModal(false)}>
          {error && <div className="mb-3 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Name *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Category *</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Unit *</label>
                <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                  <option value="kg">kg</option>
                  <option value="litre">litre</option>
                  <option value="piece">piece</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Price (₹) *</label>
              <input type="number" min="0.1" step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowModal(false)}
                className="border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={saving}
                className="bg-blue-700 hover:bg-blue-800 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

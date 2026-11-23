import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FileText, 
  Settings as SettingsIcon,
  Plus,
  Search,
  ArrowLeft,
  Printer,
  Download,
  Trash2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  History,
  Tag,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { formatRupiah, cn } from './utils';
import { CurrencyInput } from './components/CurrencyInput';
import type { 
  Category, 
  Product, 
  Expense, 
  PaymentMethod, 
  Sale, 
  SaleItem, 
  DashboardData, 
  Settings 
} from './types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// --- Screens ---

const DashboardScreen = ({ data }: { data: DashboardData | null }) => {
  if (!data) return <div className="p-4">Loading...</div>;

  const totalSales = data.sales.reduce((acc, curr) => acc + curr.total, 0);
  const totalExpenses = data.expenses.reduce((acc, curr) => acc + curr.total, 0);
  const profit = totalSales - totalExpenses;

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="bg-emerald-100 p-2 rounded-full">
          <TrendingUp className="text-emerald-600 w-6 h-6" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-500 p-6 rounded-3xl text-white shadow-lg shadow-emerald-200"
        >
          <p className="text-emerald-100 text-sm font-medium">Total Penjualan (7 Hari)</p>
          <h2 className="text-3xl font-bold mt-1">{formatRupiah(totalSales)}</h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="bg-red-100 w-8 h-8 rounded-full flex items-center justify-center mb-2">
              <TrendingDown className="text-red-500 w-4 h-4" />
            </div>
            <p className="text-gray-500 text-xs">Pengeluaran</p>
            <p className="text-lg font-bold text-gray-900">{formatRupiah(totalExpenses)}</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center mb-2">
              <Wallet className="text-blue-500 w-4 h-4" />
            </div>
            <p className="text-gray-500 text-xs">Laba Bersih</p>
            <p className="text-lg font-bold text-gray-900">{formatRupiah(profit)}</p>
          </motion.div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Tren Penjualan</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.sales}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                formatter={(value: number) => formatRupiah(value)}
              />
              <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Produk Terlaris</h3>
        <div className="space-y-4">
          {data.topProducts.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-xs font-bold text-gray-500">
                  {i + 1}
                </div>
                <p className="text-sm font-medium text-gray-700">{p.name}</p>
              </div>
              <p className="text-sm font-bold text-emerald-600">{p.sold} terjual</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const CashierScreen = ({ products, paymentMethods, onSaleComplete }: { 
  products: Product[], 
  paymentMethods: PaymentMethod[],
  onSaleComplete: () => void 
}) => {
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<number>(paymentMethods[0]?.id || 1);
  const [showCheckout, setShowCheckout] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + (item.product.selling_price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    const res = await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total_amount: total,
        payment_method_id: selectedPayment,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.selling_price
        }))
      })
    });

    if (res.ok) {
      setCart([]);
      setShowCheckout(false);
      onSaleComplete();
      alert('Transaksi Berhasil!');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-24">
      <div className="p-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text"
            placeholder="Cari produk atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
        {filteredProducts.map(product => (
          <motion.div 
            key={product.id}
            whileTap={{ scale: 0.95 }}
            onClick={() => addToCart(product)}
            className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-2"
          >
            <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-10 h-10" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">{product.category_name}</p>
              <h3 className="text-sm font-bold text-gray-900 truncate">{product.name}</h3>
              <p className="text-sm font-black text-emerald-600">{formatRupiah(product.selling_price)}</p>
              <p className="text-[10px] text-gray-400 mt-1">Stok: {product.stock}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {cart.length > 0 && (
        <motion.div 
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-20 left-4 right-4 bg-white p-4 rounded-3xl shadow-2xl border border-gray-100 z-20"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium">{cart.length} Item dipilih</p>
              <p className="text-xl font-black text-gray-900">{formatRupiah(total)}</p>
            </div>
            <button 
              onClick={() => setShowCheckout(true)}
              className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
            >
              Bayar
            </button>
          </div>
        </motion.div>
      )}

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end"
          >
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full rounded-t-[40px] p-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Ringkasan Pesanan</h2>
                <button onClick={() => setShowCheckout(false)} className="p-2 bg-gray-100 rounded-full">
                  <Plus className="rotate-45" />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">{item.product.name}</p>
                      <p className="text-sm text-gray-500">{formatRupiah(item.product.selling_price)} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                      <button onClick={() => updateQuantity(item.product.id, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold">-</button>
                      <span className="w-4 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.product.id, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold">+</button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 mb-8">
                <p className="text-sm font-bold text-gray-900">Metode Pembayaran</p>
                <div className="grid grid-cols-2 gap-3">
                  {paymentMethods.map(pm => (
                    <button 
                      key={pm.id}
                      onClick={() => setSelectedPayment(pm.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all text-sm font-bold",
                        selectedPayment === pm.id 
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700" 
                          : "border-gray-100 bg-gray-50 text-gray-500"
                      )}
                    >
                      {pm.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 pt-4 mb-8">
                <div className="flex justify-between items-center">
                  <p className="text-gray-500 font-medium">Total Tagihan</p>
                  <p className="text-2xl font-black text-emerald-600">{formatRupiah(total)}</p>
                </div>
              </div>

              <button 
                onClick={handleCheckout}
                className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-all"
              >
                Konfirmasi Pembayaran
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductScreen = ({ products, categories, onRefresh }: { 
  products: Product[], 
  categories: Category[],
  onRefresh: () => void 
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category_id: categories[0]?.id || 0,
    cost_price: 0,
    selling_price: 0,
    stock: 0,
    image_url: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowAdd(false);
      onRefresh();
      setFormData({ name: '', category_id: categories[0]?.id || 0, cost_price: 0, selling_price: 0, stock: 0, image_url: '' });
    }
  };

  return (
    <div className="p-4 pb-24 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100"
        >
          <Plus />
        </button>
      </div>

      <div className="space-y-3">
        {products.map(p => (
          <div key={p.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl overflow-hidden flex-shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-8 h-8" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{p.category_name}</p>
              <h3 className="font-bold text-gray-900 truncate">{p.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-black text-emerald-600">{formatRupiah(p.selling_price)}</p>
                <span className="text-[10px] text-gray-400">Stok: {p.stock}</span>
              </div>
            </div>
            <ChevronRight className="text-gray-300" />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[40px] p-8 max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold mb-6">Tambah Produk</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Nama Produk</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Kategori</label>
                  <select 
                    value={formData.category_id}
                    onChange={e => setFormData({...formData, category_id: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <CurrencyInput label="Harga Modal" value={formData.cost_price} onChange={v => setFormData({...formData, cost_price: v})} />
                <CurrencyInput label="Harga Jual" value={formData.selling_price} onChange={v => setFormData({...formData, selling_price: v})} />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Stok Awal</label>
                  <input 
                    type="number" 
                    required
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">URL Gambar (Opsional)</label>
                  <input 
                    type="text" 
                    value={formData.image_url}
                    onChange={e => setFormData({...formData, image_url: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">Batal</button>
                  <button type="submit" className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-100">Simpan</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const ReportScreen = ({ sales, expenses, settings }: { 
  sales: Sale[], 
  expenses: Expense[],
  settings: Settings
}) => {
  const [tab, setTab] = useState<'sales' | 'expenses'>('sales');

  const downloadPDF = () => {
    const doc = new jsPDF();
    const title = tab === 'sales' ? 'Laporan Penjualan' : 'Laporan Pengeluaran';
    
    doc.setFontSize(20);
    doc.text(settings.business_name, 105, 15, { align: 'center' });
    doc.setFontSize(14);
    doc.text(title, 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Dicetak pada: ${new Date().toLocaleString()}`, 105, 32, { align: 'center' });

    if (tab === 'sales') {
      (doc as any).autoTable({
        startY: 40,
        head: [['ID', 'Tanggal', 'Metode', 'Total']],
        body: sales.map(s => [s.id, s.date, s.payment_method_name, formatRupiah(s.total_amount)]),
      });
    } else {
      (doc as any).autoTable({
        startY: 40,
        head: [['ID', 'Tanggal', 'Deskripsi', 'Jumlah']],
        body: expenses.map(e => [e.id, e.date, e.description, formatRupiah(e.amount)]),
      });
    }

    doc.save(`${title.toLowerCase().replace(' ', '_')}.pdf`);
  };

  return (
    <div className="p-4 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
        <button 
          onClick={downloadPDF}
          className="bg-emerald-500 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100 flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          <span className="text-sm font-bold">PDF</span>
        </button>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-2xl">
        <button 
          onClick={() => setTab('sales')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
            tab === 'sales' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
          )}
        >
          Penjualan
        </button>
        <button 
          onClick={() => setTab('expenses')}
          className={cn(
            "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
            tab === 'expenses' ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500"
          )}
        >
          Pengeluaran
        </button>
      </div>

      <div className="space-y-3">
        {tab === 'sales' ? (
          sales.map(s => (
            <div key={s.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-medium">{s.date}</p>
                  <p className="font-bold text-gray-900">Transaksi #{s.id}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">{s.payment_method_name}</span>
                  </div>
                </div>
                <p className="text-lg font-black text-emerald-600">{formatRupiah(s.total_amount)}</p>
              </div>
            </div>
          ))
        ) : (
          expenses.map(e => (
            <div key={e.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-400 font-medium">{e.date}</p>
                  <p className="font-bold text-gray-900">{e.description}</p>
                </div>
                <p className="text-lg font-black text-red-500">{formatRupiah(e.amount)}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const SettingsScreen = ({ settings, onRefresh, categories, paymentMethods }: { 
  settings: Settings, 
  onRefresh: () => void,
  categories: Category[],
  paymentMethods: PaymentMethod[]
}) => {
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [newCategory, setNewCategory] = useState('');
  const [newPayment, setNewPayment] = useState('');
  const [newExpense, setNewExpense] = useState({ description: '', amount: 0 });

  const updateBusinessName = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'business_name', value: businessName })
    });
    onRefresh();
    alert('Nama usaha diperbarui!');
  };

  const addCategory = async () => {
    if (!newCategory) return;
    await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory })
    });
    setNewCategory('');
    onRefresh();
  };

  const addPayment = async () => {
    if (!newPayment) return;
    await fetch('/api/payment-methods', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newPayment })
    });
    setNewPayment('');
    onRefresh();
  };

  const addExpense = async () => {
    if (!newExpense.description || newExpense.amount <= 0) return;
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });
    setNewExpense({ description: '', amount: 0 });
    onRefresh();
    alert('Pengeluaran dicatat!');
  };

  return (
    <div className="p-4 pb-24 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>

      {/* Business Name */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Informasi Usaha</h2>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Nama Usaha</label>
            <input 
              type="text" 
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button 
            onClick={updateBusinessName}
            className="w-full bg-emerald-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-emerald-100"
          >
            Simpan Nama Usaha
          </button>
        </div>
      </section>

      {/* Operational Expense */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Input Pengeluaran</h2>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500">Deskripsi</label>
            <input 
              type="text" 
              placeholder="Misal: Bayar Listrik"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <CurrencyInput label="Jumlah" value={newExpense.amount} onChange={v => setNewExpense({...newExpense, amount: v})} />
          <button 
            onClick={addExpense}
            className="w-full bg-red-500 text-white py-3 rounded-2xl font-bold shadow-lg shadow-red-100"
          >
            Catat Pengeluaran
          </button>
        </div>
      </section>

      {/* Categories */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Kategori Produk</h2>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Kategori baru..."
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button onClick={addCategory} className="bg-emerald-500 text-white p-3 rounded-2xl"><Plus /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(c => (
              <span key={c.id} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium">{c.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Metode Pembayaran</h2>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-4">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Metode baru..."
              value={newPayment}
              onChange={e => setNewPayment(e.target.value)}
              className="flex-1 px-4 py-3 bg-gray-50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button onClick={addPayment} className="bg-emerald-500 text-white p-3 rounded-2xl"><Plus /></button>
          </div>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map(pm => (
              <span key={pm.id} className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-sm font-medium">{pm.name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Printer Settings (Simulated) */}
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Printer Bluetooth</h2>
        <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Printer className="text-blue-600 w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Thermal Printer 58mm</p>
              <p className="text-[10px] text-emerald-500 font-bold">Terhubung</p>
            </div>
          </div>
          <button className="text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg">Ubah</button>
        </div>
      </section>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'cashier' | 'products' | 'reports' | 'settings'>('dashboard');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [settings, setSettings] = useState<Settings>({ business_name: 'Kasir Pintar' });

  const fetchData = async () => {
    const [dash, prod, cat, exp, sls, pm, stg] = await Promise.all([
      fetch('/api/reports/dashboard').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/categories').then(r => r.json()),
      fetch('/api/expenses').then(r => r.json()),
      fetch('/api/reports/sales').then(r => r.json()),
      fetch('/api/payment-methods').then(r => r.json()),
      fetch('/api/settings').then(r => r.json())
    ]);
    setDashboardData(dash);
    setProducts(prod);
    setCategories(cat);
    setExpenses(exp);
    setSales(sls);
    setPaymentMethods(pm);
    setSettings(stg);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardScreen data={dashboardData} />;
      case 'cashier': return <CashierScreen products={products} paymentMethods={paymentMethods} onSaleComplete={fetchData} />;
      case 'products': return <ProductScreen products={products} categories={categories} onRefresh={fetchData} />;
      case 'reports': return <ReportScreen sales={sales} expenses={expenses} settings={settings} />;
      case 'settings': return <SettingsScreen settings={settings} onRefresh={fetchData} categories={categories} paymentMethods={paymentMethods} />;
    }
  };

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col relative overflow-hidden font-sans">
      {/* Status Bar Spacer (Android style) */}
      <div className="h-6 bg-white w-full"></div>

      <div className="flex-1 overflow-y-auto">
        {renderScreen()}
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 flex justify-around items-center py-3 px-2 z-30">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard />} label="Beranda" />
        <NavButton active={activeTab === 'cashier'} onClick={() => setActiveTab('cashier')} icon={<ShoppingCart />} label="Kasir" />
        <NavButton active={activeTab === 'products'} onClick={() => setActiveTab('products')} icon={<Package />} label="Produk" />
        <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText />} label="Laporan" />
        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<SettingsIcon />} label="Menu" />
      </div>
    </div>
  );
}

const NavButton = ({ active, onClick, icon, label }: { 
  active: boolean, 
  onClick: () => void, 
  icon: React.ReactNode, 
  label: string 
}) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center gap-1 transition-all duration-300",
      active ? "text-emerald-600 scale-110" : "text-gray-400"
    )}
  >
    <div className={cn(
      "p-2 rounded-2xl transition-all",
      active ? "bg-emerald-50" : ""
    )}>
      {React.cloneElement(icon as React.ReactElement, { size: 24, strokeWidth: active ? 2.5 : 2 })}
    </div>
    <span className="text-[10px] font-bold tracking-tight">{label}</span>
  </button>
);

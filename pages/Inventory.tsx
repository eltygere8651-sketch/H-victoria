import React, { useEffect, useState } from 'react';
import { Product, UserRole, User } from '../types';
import { storageService } from '../services/storageService';
import { Search, Plus, Minus, AlertTriangle, Edit2, Trash2, X, Check, Save } from 'lucide-react';

interface InventoryProps {
  currentUser: User;
}

const Inventory: React.FC<InventoryProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    setProducts(storageService.getProducts());
  };

  const handleWithdraw = (productId: string) => {
    storageService.updateStock(productId, -1);
    loadProducts();
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      storageService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      loadProducts();
    }
  };

  const handleSaveProduct = () => {
    if (editForm.name && editForm.quantity !== undefined) {
      storageService.saveProduct({
        id: editForm.id || `p_${Date.now()}`,
        name: editForm.name,
        category: editForm.category || 'General',
        quantity: Number(editForm.quantity),
        unit: editForm.unit || 'unidades',
        minThreshold: Number(editForm.minThreshold) || 5
      } as Product);
      setShowEditModal(false);
      setEditForm({});
      loadProducts();
    }
  };

  const openNewProduct = () => {
    setEditForm({});
    setShowEditModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditForm({ ...product });
    setShowEditModal(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="pb-24 md:pb-6 font-sans">
      {/* Header & Controls */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Inventario</h2>
          {currentUser.role === UserRole.ADMIN && (
            <button 
              onClick={openNewProduct}
              className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors active:scale-95"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={22} />
          <input 
            type="text" 
            placeholder="Buscar producto por nombre o categoría..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800 text-lg shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 dark:focus:border-red-500 focus:ring-0 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {/* Edit / New Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-8 animate-slide-up border border-transparent dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {editForm.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Nombre</label>
                <input 
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-bold text-gray-900 dark:text-white" 
                  value={editForm.name || ''} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  placeholder="Ej. Coca Cola"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Categoría</label>
                <input 
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white" 
                  value={editForm.category || ''} 
                  onChange={e => setEditForm({...editForm, category: e.target.value})}
                  placeholder="Bebidas"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Unidad</label>
                <input 
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white" 
                  value={editForm.unit || ''} 
                  onChange={e => setEditForm({...editForm, unit: e.target.value})}
                  placeholder="latas"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Stock Actual</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-mono font-bold dark:text-white" 
                  value={editForm.quantity || 0} 
                  onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Alerta Mínimo</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-mono font-bold text-red-600 dark:text-red-400" 
                  value={editForm.minThreshold || 0} 
                  onChange={e => setEditForm({...editForm, minThreshold: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowEditModal(false)} 
                className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProduct} 
                className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-2"
              >
                <Save size={20} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-slide-up border border-transparent dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Producto?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Estás a punto de eliminar <strong className="text-gray-800 dark:text-slate-200">{productToDelete.name}</strong> del inventario. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product List */}
      <div className="p-4 md:p-6 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center justify-between hover:shadow-md dark:hover:border-slate-600 transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">{product.name}</h3>
                {product.quantity <= product.minThreshold && (
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 p-1 rounded-md">
                    <AlertTriangle size={18} />
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-slate-400 uppercase tracking-wide mt-1">{product.category} • {product.unit}</p>
              <div className={`text-lg font-bold mt-2 ${product.quantity <= product.minThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                Stock: {product.quantity}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser.role === UserRole.ADMIN ? (
                <>
                  <button 
                    onClick={() => openEditProduct(product)}
                    className="p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleDeleteClick(product)}
                    className="p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleWithdraw(product.id)}
                  disabled={product.quantity <= 0}
                  className="bg-red-600 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-red-200 dark:shadow-none active:scale-95 transition-all"
                >
                  <Minus size={24} />
                </button>
              )}
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && (
          <div className="text-center text-gray-400 dark:text-slate-600 py-20">
            <p className="text-xl font-medium">No se encontraron productos</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Product, UserRole, User } from '../types';
import { storageService } from '../services/storageService';
import { Search, Plus, Minus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, Tag, Zap } from 'lucide-react';

interface InventoryProps {
  currentUser: User;
}

const Inventory: React.FC<InventoryProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Specific loading state for the save action to avoid blocking the UI if it fails
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Subscribe to realtime updates
    const unsubscribe = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleWithdraw = async (productId: string) => {
    // Find product to check current quantity
    const p = products.find(prod => prod.id === productId);
    if (p && p.quantity > 0) {
      await storageService.saveProduct({ ...p, quantity: p.quantity - 1 });
    }
  };

  const handleGenerateDemoData = async () => {
    if (!window.confirm("¿Añadir más de 60 productos de prueba (Bar/Hotel) al inventario?")) return;
    setIsGenerating(true);
    try {
      await storageService.generateDemoData();
      alert("¡Productos de prueba añadidos correctamente!");
    } catch (e: any) {
      // Show actual error from service (e.g., Permissions or Network)
      alert(`Error al generar datos: ${e.message || "Error desconocido"}`);
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClearDemoData = async () => {
    if (!window.confirm("¿Borrar solo los productos de prueba?")) return;
    setIsGenerating(true);
    try {
      await storageService.clearDemoData();
      alert("Productos de prueba eliminados.");
    } catch (e: any) {
      alert(`Error al limpiar datos: ${e.message || "Error desconocido"}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (productToDelete) {
      await storageService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleSaveProduct = async () => {
    if (editForm.name && editForm.quantity !== undefined) {
      setIsSaving(true);
      try {
        await storageService.saveProduct({
          id: editForm.id || `p_${Date.now()}`,
          name: editForm.name,
          category: editForm.category || 'General',
          subcategory: editForm.subcategory || 'Otros',
          quantity: Number(editForm.quantity),
          unit: editForm.unit || 'unidades',
          minThreshold: Number(editForm.minThreshold) || 5
        } as Product);
        
        // Only close modal if successful
        setShowEditModal(false);
        setEditForm({});
      } catch (error: any) {
        // Only log the message to avoid "Converting circular structure to JSON" errors with full Firebase Error objects
        console.error("Error saving product:", error.message || error);
        alert(`Error al guardar: ${error.message || 'Inténtalo de nuevo.'}`);
      } finally {
        setIsSaving(false);
      }
    } else {
      alert("Por favor rellena al menos el Nombre y la Cantidad.");
    }
  };

  const openNewProduct = () => {
    setEditForm({ unit: 'unidades', category: 'Bebidas', subcategory: 'Varios' });
    setShowEditModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditForm({ ...product });
    setShowEditModal(true);
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.subcategory && p.subcategory.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading && products.length === 0) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;
  }

  // Common subcategories for autocomplete
  const subcatSuggestions = [
    'Cerveza', 'Ginebra', 'Ron', 'Vino', 'Licores', 'Leche', 'Bollería', 
    'Pan', 'Agua', 'Refrescos', 'Café', 'Limpieza', 'Papel', 'Tienda'
  ];

  return (
    <div className="pb-24 md:pb-6 font-sans">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Inventario</h2>
          {currentUser.role === UserRole.ADMIN && (
            <div className="flex gap-2">
               {/* Quick Demo Buttons */}
               <button 
                onClick={handleClearDemoData}
                disabled={isGenerating}
                className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-full shadow-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors active:scale-95 disabled:opacity-50"
                title="Limpiar Stock Demo"
              >
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Trash2 size={24} />}
              </button>
               <button 
                onClick={handleGenerateDemoData}
                disabled={isGenerating}
                className="bg-blue-600 dark:bg-blue-500 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors active:scale-95 disabled:opacity-50"
                title="Generar Stock Demo"
              >
                {isGenerating ? <Loader2 size={24} className="animate-spin" /> : <Zap size={24} />}
              </button>
              <button 
                onClick={openNewProduct}
                className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white p-3 rounded-full shadow-lg hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-colors active:scale-95"
                title="Añadir Producto Manual"
              >
                <Plus size={24} />
              </button>
            </div>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={22} />
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800 text-lg shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 dark:focus:border-red-500 focus:ring-0 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
          />
        </div>
      </div>

      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-8 animate-slide-up border border-transparent dark:border-slate-700/50 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white">
                {editForm.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => !isSaving && setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white" disabled={isSaving}>
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
                  disabled={isSaving}
                />
              </div>
              
              <div className="col-span-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Categoría Principal</label>
                <input 
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white" 
                  value={editForm.category || ''} 
                  onChange={e => setEditForm({...editForm, category: e.target.value})}
                  placeholder="Bebidas"
                  disabled={isSaving}
                />
              </div>

              <div className="col-span-1">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Sub-Categoría</label>
                <input 
                  list="subcats"
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white" 
                  value={editForm.subcategory || ''} 
                  onChange={e => setEditForm({...editForm, subcategory: e.target.value})}
                  placeholder="Ej. Ron, Vino..."
                  disabled={isSaving}
                />
                <datalist id="subcats">
                  {subcatSuggestions.map(s => <option key={s} value={s} />)}
                </datalist>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Unidad</label>
                <input 
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white" 
                  value={editForm.unit || ''} 
                  onChange={e => setEditForm({...editForm, unit: e.target.value})}
                  placeholder="latas"
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Stock Actual</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-mono font-bold dark:text-white" 
                  value={editForm.quantity || 0} 
                  onChange={e => setEditForm({...editForm, quantity: Number(e.target.value)})}
                  disabled={isSaving}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Alerta Mínimo</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-gray-100 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none font-mono font-bold text-red-600 dark:text-red-400" 
                  value={editForm.minThreshold || 0} 
                  onChange={e => setEditForm({...editForm, minThreshold: Number(e.target.value)})}
                  disabled={isSaving}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowEditModal(false)} 
                disabled={isSaving}
                className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProduct} 
                disabled={isSaving}
                className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-slide-up border border-transparent dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Producto?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Estás a punto de eliminar <strong className="text-gray-800 dark:text-slate-200">{productToDelete.name}</strong> del inventario.
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

      <div className="p-4 md:p-6 space-y-4">
        {filteredProducts.length === 0 && !loading && (
           <div className="text-center py-20 opacity-50">
              <div className="mb-4 flex justify-center"><Search size={48} className="text-gray-300" /></div>
              <p className="font-bold text-xl text-gray-400">Inventario vacío</p>
              {currentUser.role === UserRole.ADMIN && <p className="text-sm text-gray-400">Pulsa el botón ⚡ arriba para generar datos de prueba.</p>}
           </div>
        )}
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700/50 flex items-center justify-between hover:shadow-md dark:hover:border-slate-600 transition-all">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white tracking-tight truncate">{product.name}</h3>
                {product.quantity <= product.minThreshold && (
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 p-1 rounded-md shrink-0">
                    <AlertTriangle size={18} />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 overflow-x-auto no-scrollbar">
                <span className="text-xs font-bold text-gray-400 dark:text-slate-400 uppercase tracking-wide bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md whitespace-nowrap">
                   {product.category}
                </span>
                {product.subcategory && (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-md whitespace-nowrap flex items-center gap-1">
                    <Tag size={10} /> {product.subcategory}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-slate-500">• {product.unit}</span>
              </div>
              <div className={`text-lg font-bold mt-2 ${product.quantity <= product.minThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                Stock: {product.quantity}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
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
      </div>
    </div>
  );
};

export default Inventory;
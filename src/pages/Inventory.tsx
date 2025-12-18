import React, { useEffect, useState } from 'react';
import { Product, UserRole, User, Department } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, Minus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown, Check, RefreshCw } from 'lucide-react';

interface InventoryProps {
  currentUser: User;
}

const Inventory: React.FC<InventoryProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editProductForm, setEditProductForm] = useState<Partial<Product>>({});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  
  const [isDeletingDept, setIsDeletingDept] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
    });
    return () => {
      unsubscribeProducts();
      unsubscribeDepartments();
    };
  }, []);

  const handleDeleteProductClick = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      await storageService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleSaveProduct = async () => {
    if (!editProductForm.name || !editProductForm.departmentId) {
      alert('El nombre y el departamento son obligatorios.');
      return;
    }
    
    setLoading(true);
    const selectedDept = departments.find(d => d.id === editProductForm.departmentId);
    
    await storageService.saveProduct({
      id: editProductForm.id || undefined,
      name: editProductForm.name,
      category: editProductForm.category || 'General',
      quantity: Number(editProductForm.quantity) || 0,
      unit: editProductForm.unit || 'unidades',
      minThreshold: Number(editProductForm.minThreshold) || 5,
      departmentId: editProductForm.departmentId,
      departmentName: selectedDept?.name || 'Desconocido'
    });
    setShowEditProductModal(false);
    setEditProductForm({});
    setLoading(false);
  };

  const openNewProduct = () => {
    setEditProductForm({});
    setShowEditProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditProductForm({ ...product });
    setShowEditProductModal(true);
  };

  const handleSaveDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    const departmentData = { 
      id: editingDepartment?.id || undefined, 
      name: newDepartmentName.trim() 
    };
    await storageService.saveDepartment(departmentData);
    setEditingDepartment(null);
    setNewDepartmentName('');
  };

  const handleDeleteDepartment = async (departmentId: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();

    if (!departmentId) return;

    const productsInDept = products.filter(p => p.departmentId === departmentId);
    let confirmMessage = '¿Eliminar este departamento permanentemente?';
    
    if (productsInDept.length > 0) {
      confirmMessage = `ATENCIÓN: Hay ${productsInDept.length} productos asignados a este departamento. ¿Estás seguro de que quieres eliminarlo? Los productos quedarán huérfanos.`;
    }

    if (window.confirm(confirmMessage)) {
      setIsDeletingDept(departmentId);
      try {
        await storageService.deleteDepartment(departmentId);
        if (editingDepartment?.id === departmentId) {
          setEditingDepartment(null);
          setNewDepartmentName('');
        }
      } catch (error: any) {
        console.error("Error deleting department:", error);
        alert("No se pudo eliminar el departamento.");
      } finally {
        setIsDeletingDept(null);
      }
    }
  };
  
  const openEditDepartmentModal = (department: Department | null) => {
    setEditingDepartment(department);
    setNewDepartmentName(department ? department.name : '');
  };

  const filteredProducts = products.filter(p => 
    (selectedDepartmentFilter === 'all' || p.departmentId === selectedDepartmentFilter) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600 dark:text-red-400 font-bold text-xl uppercase tracking-tighter">Acceso Denegado</div>;

  if (loading && products.length === 0) {
    return <div className="flex h-screen items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;
  }

  return (
    <div className="font-sans relative">
      {/* CABECERA DE INVENTARIO FIJA - OPTIMIZADA */}
      <div 
        className="sticky z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-all"
        style={{ 
          top: 'calc(env(safe-area-inset-top) + 5.5rem)', // Altura exacta para quedar bajo el header principal
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-4 md:px-6">
          <div className="flex justify-between items-center mb-4 gap-3">
            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
              Stock <span className="text-red-600">Total</span>
            </h2>
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setShowManageDepartmentsModal(true)}
                className="btn-header-action !w-11 !h-11 sm:!w-12 sm:!h-12 !rounded-xl"
                title="Departamentos"
              >
                <ListTree size={20} />
              </button>
              <button 
                onClick={openNewProduct}
                className="bg-red-600 hover:bg-red-700 text-white w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/20 transition-all active:scale-90"
                title="Añadir Producto"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Buscar artículo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-sm font-bold focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-500/5 outline-none transition-all dark:text-white placeholder-slate-400"
              />
            </div>
            <div className="relative shrink-0">
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                className="w-full sm:w-auto pl-4 pr-10 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs font-black uppercase tracking-wider focus:border-red-500 outline-none transition-all dark:text-white appearance-none cursor-pointer"
              >
                <option value="all">Todas las Áreas</option>
                {departments.map(dep => (
                  <option key={dep.id} value={dep.id}>{dep.name.toUpperCase()}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center opacity-50 flex flex-col items-center">
            <Search size={48} className="mb-4 text-slate-300" />
            <p className="font-bold text-slate-500 uppercase tracking-widest text-sm">No se encontraron resultados</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div key={product.id} className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center justify-between hover:shadow-md hover:border-red-500/30 transition-all group overflow-hidden relative">
              {/* Indicador lateral de stock bajo */}
              {product.quantity <= product.minThreshold && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>
              )}
              
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-900 dark:text-white truncate uppercase tracking-tight text-base sm:text-lg">{product.name}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{product.departmentName}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                  <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase tracking-widest">{product.category}</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                   <div className={`px-3 py-1 rounded-lg font-black text-sm transition-colors ${product.quantity <= product.minThreshold ? 'bg-red-600 text-white shadow-lg shadow-red-600/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                     {product.quantity} <span className="text-[10px] opacity-70 uppercase ml-0.5">{product.unit}</span>
                   </div>
                   {product.quantity <= product.minThreshold && (
                     <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-black text-[10px] uppercase tracking-tighter animate-bounce">
                       <AlertTriangle size={12} /> CRÍTICO
                     </div>
                   )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => openEditProduct(product)}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all active:scale-90"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => handleDeleteProductClick(product)}
                  className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-90"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modales existentes sin cambios funcionales, solo visuales para consistencia */}
      {showEditProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 animate-pop-in border border-white/10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">
                {editProductForm.id ? 'Editar' : 'Nuevo'} <span className="text-red-600">Artículo</span>
              </h3>
              <button onClick={() => setShowEditProductModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Nombre Comercial</label>
                <input 
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:border-red-500 outline-none transition-all" 
                  value={editProductForm.name || ''} 
                  onChange={e => setEditProductForm({...editProductForm, name: e.target.value})}
                  placeholder="Ej. Coca Cola 330ml"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Área Asignada</label>
                <select 
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:border-red-500 outline-none appearance-none" 
                  value={editProductForm.departmentId || ''} 
                  onChange={e => setEditProductForm({...editProductForm, departmentId: e.target.value})}
                  required
                >
                  <option value="" disabled>Seleccionar departamento</option>
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Categoría</label>
                <input 
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:border-red-500 outline-none" 
                  value={editProductForm.category || ''} 
                  onChange={e => setEditProductForm({...editProductForm, category: e.target.value})}
                  placeholder="Ej. Bebidas"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Unidad de Medida</label>
                <input 
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-slate-900 dark:text-white focus:border-red-500 outline-none" 
                  value={editProductForm.unit || ''} 
                  onChange={e => setEditProductForm({...editProductForm, unit: e.target.value})}
                  placeholder="Ej. Latas"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Stock Actual</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 font-black text-slate-900 dark:text-white focus:border-red-500 outline-none" 
                  value={editProductForm.quantity || 0} 
                  onChange={e => setEditProductForm({...editProductForm, quantity: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1 block">Alerta Mínima</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 font-black text-red-600 focus:border-red-500 outline-none" 
                  value={editProductForm.minThreshold || 0} 
                  onChange={e => setEditProductForm({...editProductForm, minThreshold: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl hover:bg-slate-200 transition-colors active:scale-95">Cancelar</button>
              <button onClick={handleSaveProduct} className="flex-2 py-4 px-8 text-white font-black bg-red-600 rounded-2xl hover:bg-red-700 shadow-xl shadow-red-600/20 flex items-center justify-center gap-2 active:scale-95 uppercase tracking-widest text-sm">
                <Save size={20} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-sm shadow-2xl p-8 animate-pop-in text-center border border-white/10">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 shadow-inner">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase mb-2 tracking-tighter">¿Eliminar Artículo?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 font-bold">Esta acción no se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 rounded-2xl active:scale-95 transition-all">No</button>
              <button onClick={confirmDeleteProduct} className="flex-1 py-4 font-black text-white bg-red-600 rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 active:scale-95 transition-all uppercase tracking-widest text-sm">Sí, Borrar</button>
            </div>
          </div>
        </div>
      )}

      {showManageDepartmentsModal && (
         <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="absolute inset-0" onClick={() => { setShowManageDepartmentsModal(false); setEditingDepartment(null); setNewDepartmentName(''); }}></div>
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-md h-auto max-h-[85dvh] rounded-t-[3rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border-t md:border-2 border-white/10 relative z-10">
            <div className="px-6 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Áreas</h3>
              <button onClick={() => { setShowManageDepartmentsModal(false); setEditingDepartment(null); setNewDepartmentName(''); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800">
               <div className="flex gap-2">
                  <input 
                    className="flex-1 px-5 py-4 font-bold text-base bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl focus:border-red-500 outline-none transition-all dark:text-white shadow-sm"
                    value={newDepartmentName} 
                    onChange={e => setNewDepartmentName(e.target.value)}
                    placeholder="Nombre del Área"
                    onKeyDown={e => e.key === 'Enter' && handleSaveDepartment()}
                  />
                  <button 
                    onClick={handleSaveDepartment} 
                    disabled={!newDepartmentName.trim()}
                    className={`w-14 h-14 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center active:scale-90 ${editingDepartment ? 'bg-blue-600' : 'bg-red-600'} disabled:opacity-30`}
                  >
                    {editingDepartment ? <RefreshCw size={24} /> : <Plus size={28} strokeWidth={3} />}
                  </button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3 pb-safe">
              {departments.length === 0 ? (
                <div className="text-center py-10 opacity-30 italic text-sm">Sin departamentos creados</div>
              ) : (
                departments.map(dep => (
                  <div key={dep.id} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${editingDepartment?.id === dep.id ? 'border-blue-500 bg-blue-500/5' : 'border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900'}`}>
                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm truncate pr-4">{dep.name}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditDepartmentModal(dep)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"><Edit2 size={18} /></button>
                      <button onClick={(e) => handleDeleteDepartment(dep.id, e)} disabled={isDeletingDept === dep.id} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-30">
                          {isDeletingDept === dep.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
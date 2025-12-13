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
  
  // Track deleting state specifically to give UI feedback if delete takes time
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

    if (!departmentId) {
        console.error("Attempted to delete department with undefined ID");
        return;
    }

    // Check for associated products
    const productsInDept = products.filter(p => p.departmentId === departmentId);
    let confirmMessage = '¿Eliminar este departamento permanentemente?';
    
    if (productsInDept.length > 0) {
      confirmMessage = `ATENCIÓN: Hay ${productsInDept.length} productos asignados a este departamento. ¿Estás seguro de que quieres eliminarlo? Los productos quedarán huérfanos.`;
    }

    if (window.confirm(confirmMessage)) {
      setIsDeletingDept(departmentId);
      try {
        await storageService.deleteDepartment(departmentId);
        // Clear editing state if we deleted the item being edited
        if (editingDepartment?.id === departmentId) {
          setEditingDepartment(null);
          setNewDepartmentName('');
        }
      } catch (error: any) {
        console.error("Error deleting department:", error);
        alert("No se pudo eliminar el departamento. Verifica tu conexión o permisos.");
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

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600 dark:text-red-400 font-bold text-xl">Acceso Denegado.</div>;

  if (loading && products.length === 0) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-500" /></div>;
  }

  return (
    <div className="font-sans">
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg pt-6 pb-4 px-4 md:px-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5 gap-3">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tighter truncate">Inventario</h2>
          <div className="flex gap-3 shrink-0">
            <button 
              onClick={() => setShowManageDepartmentsModal(true)}
              className="bg-slate-200/60 dark:bg-slate-800 text-slate-800 dark:text-white w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:bg-slate-300/60 dark:hover:bg-slate-700 transition-all active:scale-95"
              title="Gestionar Departamentos"
            >
              <ListTree size={22} />
            </button>
            <button 
              onClick={openNewProduct}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 dark:hover:bg-slate-200 transition-all active:scale-95"
              title="Añadir Nuevo Producto"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-transparent bg-gray-100 dark:bg-slate-800/60 text-base shadow-sm focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="relative">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto pl-4 pr-10 py-3.5 rounded-xl border-2 border-transparent bg-gray-100 dark:bg-slate-800/60 text-base shadow-sm focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 outline-none transition-all dark:text-white appearance-none"
            >
              <option value="all">Todos los Departamentos</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" size={20} />
          </div>
        </div>
      </div>

      {showEditProductModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white drop-shadow-sm">
                {editProductForm.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowEditProductModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <X size={24} />
              </button>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Nombre</label>
                <input 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-bold text-gray-900 dark:text-white shadow-sm" 
                  value={editProductForm.name || ''} 
                  onChange={e => setEditProductForm({...editProductForm, name: e.target.value})}
                  placeholder="Ej. Coca Cola"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Departamento</label>
                <select 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm appearance-none" 
                  value={editProductForm.departmentId || ''} 
                  onChange={e => setEditProductForm({...editProductForm, departmentId: e.target.value})}
                  required
                >
                  <option value="" disabled>Selecciona un departamento</option>
                  {departments.map(dep => (
                    <option key={dep.id} value={dep.id}>{dep.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Categoría</label>
                <input 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm" 
                  value={editProductForm.category || ''} 
                  onChange={e => setEditProductForm({...editProductForm, category: e.target.value})}
                  placeholder="Bebidas"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Unidad</label>
                <input 
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm" 
                  value={editProductForm.unit || ''} 
                  onChange={e => setEditProductForm({...editProductForm, unit: e.target.value})}
                  placeholder="latas"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Stock Actual</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-mono font-bold dark:text-white shadow-sm" 
                  value={editProductForm.quantity || 0} 
                  onChange={e => setEditProductForm({...editProductForm, quantity: Number(e.target.value)})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Alerta Mínimo</label>
                <input 
                  type="number"
                  className="w-full p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-mono font-bold text-red-600 dark:text-red-400 shadow-sm" 
                  value={editProductForm.minThreshold || 0} 
                  onChange={e => setEditProductForm({...editProductForm, minThreshold: Number(e.target.value)})}
                />
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]">Cancelar</button>
              <button onClick={handleSaveProduct} className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red transition-all flex items-center justify-center gap-2 active:scale-[0.98]"><Save size={20} /> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Producto?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Estás a punto de eliminar <strong className="text-gray-800 dark:text-slate-200">{productToDelete.name}</strong>.</p>
            <div className="flex gap-3">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={confirmDeleteProduct} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE DEPARTMENTS MODAL - REDESIGNED FOR MOBILE */}
      {showManageDepartmentsModal && (
         <div className="fixed inset-0 bg-black/80 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in">
          {/* Dismiss overlay */}
          <div className="absolute inset-0" onClick={() => { setShowManageDepartmentsModal(false); setEditingDepartment(null); setNewDepartmentName(''); }}></div>
          
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-md h-auto max-h-[85dvh] rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border-t md:border-2 border-gray-100 dark:border-slate-800 relative z-10">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Departamentos</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 font-medium mt-0.5">Gestiona las áreas de tu negocio</p>
              </div>
              <button onClick={() => { setShowManageDepartmentsModal(false); setEditingDepartment(null); setNewDepartmentName(''); }} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Input Section - Fixed Top */}
            <div className="p-4 md:p-6 bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100 dark:border-slate-800 shrink-0">
               <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                 {editingDepartment ? 'Editar Departamento' : 'Nuevo Departamento'}
               </label>
               <div className="flex gap-2 md:gap-3">
                  <input 
                    className="flex-1 min-w-0 px-4 md:px-5 py-4 font-bold text-lg bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none dark:text-white shadow-sm transition-all"
                    value={newDepartmentName} 
                    onChange={e => setNewDepartmentName(e.target.value)}
                    placeholder="Ej. Barra"
                    onKeyDown={e => e.key === 'Enter' && handleSaveDepartment()}
                    autoFocus
                  />
                  {/* Action Buttons Grouped */}
                  <div className="flex gap-2 shrink-0">
                    {editingDepartment && (
                      <button 
                        onClick={() => { setEditingDepartment(null); setNewDepartmentName(''); }}
                        className="w-14 h-full bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-300 font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center"
                      >
                        <X size={24} />
                      </button>
                    )}
                    <button 
                      onClick={handleSaveDepartment} 
                      disabled={!newDepartmentName.trim()}
                      className={`w-14 h-full text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center active:scale-[0.98] ${editingDepartment ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none' : 'bg-red-600 hover:bg-red-700 shadow-button-red'} disabled:opacity-50 disabled:shadow-none`}
                    >
                      {editingDepartment ? <RefreshCw size={24} /> : <Plus size={28} strokeWidth={3} />}
                    </button>
                  </div>
               </div>
            </div>

            {/* List Section - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 bg-white dark:bg-slate-900 pb-safe">
              {departments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <ListTree size={40} className="mb-2 opacity-50"/>
                  <p>Sin departamentos</p>
                </div>
              ) : (
                departments.map(dep => (
                  <div key={dep.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${editingDepartment?.id === dep.id ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/30' : 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm'}`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                       <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${editingDepartment?.id === dep.id ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'}`}>
                         {dep.name.charAt(0).toUpperCase()}
                       </div>
                       <span className="font-bold text-gray-900 dark:text-white truncate text-base">{dep.name}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <button 
                        onClick={() => openEditDepartmentModal(dep)} 
                        className="p-2.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                          onClick={(e) => handleDeleteDepartment(dep.id, e)} 
                          disabled={isDeletingDept === dep.id}
                          className="p-2.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95 disabled:opacity-50"
                      >
                          {isDeletingDept === dep.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                      </button>
                    </div>
                  </div>
                ))
              )}
              {/* Spacer for bottom safe area */}
              <div className="h-6"></div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-md border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg dark:hover:border-slate-700 transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white">{product.name}</h3>
                {product.quantity <= product.minThreshold && (
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <AlertTriangle size={14} /> Stock Bajo
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-1">{product.departmentName} • {product.category} • {product.unit}</p>
              <div className={`text-lg font-black mt-2 ${product.quantity <= product.minThreshold ? 'text-red-500' : 'text-green-500'}`}>
                Stock: {product.quantity}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => openEditProduct(product)}
                className="w-12 h-12 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors active:scale-95 shadow-sm"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => handleDeleteProductClick(product)}
                className="w-12 h-12 flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors active:scale-95 shadow-sm"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
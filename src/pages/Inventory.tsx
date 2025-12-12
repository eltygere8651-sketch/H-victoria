import React, { useEffect, useState } from 'react';
import { Product, UserRole, User, Department } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, Minus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown, PackageOpen } from 'lucide-react';

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
    <div className="font-sans pb-24 bg-gray-50 dark:bg-slate-950 min-h-screen">
      <div className="sticky top-0 z-10 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-2xl md:text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic drop-shadow-sm truncate pr-2">Inventario</h2>
          <div className="flex gap-2 sm:gap-3 shrink-0">
            <button 
              onClick={() => setShowManageDepartmentsModal(true)}
              className="bg-gray-200/80 dark:bg-slate-800 text-gray-700 dark:text-white w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-sm hover:bg-gray-300 dark:hover:bg-slate-700 transition-all active:scale-95"
              title="Gestionar Departamentos"
            >
              <ListTree size={20} className="sm:w-[22px] sm:h-[22px]" />
            </button>
            <button 
              onClick={openNewProduct}
              className="bg-red-600 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30 hover:bg-red-700 transition-all active:scale-95"
              title="Añadir Nuevo Producto"
            >
              <Plus size={24} strokeWidth={3} className="sm:w-[26px] sm:h-[26px]" />
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
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-transparent bg-gray-100 dark:bg-slate-800/60 text-base shadow-sm focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500 font-medium"
            />
          </div>
          <div className="relative">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto pl-4 pr-10 py-3.5 rounded-2xl border-2 border-transparent bg-gray-100 dark:bg-slate-800/60 text-base shadow-sm focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none transition-all dark:text-white appearance-none font-bold text-gray-700"
            >
              <option value="all">Todos los Dptos.</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" size={20} />
          </div>
        </div>
      </div>

      {/* MODAL EDITAR / NUEVO PRODUCTO (BOTTOM SHEET ON MOBILE) */}
      {showEditProductModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 dark:bg-slate-950/90 backdrop-blur-sm p-0 sm:p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl h-[90vh] sm:h-auto sm:max-h-[90vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-slide-up border-t sm:border-2 border-gray-100 dark:border-slate-700 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0 sticky top-0 z-10">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
                {editProductForm.id ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setShowEditProductModal(false)} className="bg-gray-100 dark:bg-slate-800 p-2 rounded-full text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Nombre del Producto</label>
                  <input 
                    className="w-full px-5 py-4 text-lg font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white transition-all placeholder-gray-400" 
                    value={editProductForm.name || ''} 
                    onChange={e => setEditProductForm({...editProductForm, name: e.target.value})}
                    placeholder="Ej. Coca Cola"
                    autoFocus
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Departamento</label>
                  <div className="relative">
                    <select 
                      className="w-full px-5 py-4 font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white appearance-none transition-all" 
                      value={editProductForm.departmentId || ''} 
                      onChange={e => setEditProductForm({...editProductForm, departmentId: e.target.value})}
                      required
                    >
                      <option value="" disabled>Selecciona un departamento</option>
                      {departments.map(dep => (
                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Categoría</label>
                  <input 
                    className="w-full px-5 py-4 font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white transition-all" 
                    value={editProductForm.category || ''} 
                    onChange={e => setEditProductForm({...editProductForm, category: e.target.value})}
                    placeholder="Bebidas"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Unidad</label>
                  <input 
                    className="w-full px-5 py-4 font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white transition-all" 
                    value={editProductForm.unit || ''} 
                    onChange={e => setEditProductForm({...editProductForm, unit: e.target.value})}
                    placeholder="latas"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Stock Actual</label>
                  <div className="relative">
                    <input 
                      type="number"
                      className="w-full px-5 py-4 font-mono text-xl font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white transition-all" 
                      value={editProductForm.quantity || 0} 
                      onChange={e => setEditProductForm({...editProductForm, quantity: Number(e.target.value)})}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 block">Alerta Mínimo</label>
                  <div className="relative">
                    <input 
                      type="number"
                      className="w-full px-5 py-4 font-mono text-xl font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none text-red-600 dark:text-red-400 transition-all" 
                      value={editProductForm.minThreshold || 0} 
                      onChange={e => setEditProductForm({...editProductForm, minThreshold: Number(e.target.value)})}
                    />
                    <AlertTriangle className="absolute right-5 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none" size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex gap-4 pb-safe sticky bottom-0 z-10">
              <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]">
                Cancelar
              </button>
              <button onClick={handleSaveProduct} className="flex-[2] py-4 text-white font-black uppercase tracking-wide bg-red-600 rounded-2xl hover:bg-red-700 shadow-xl shadow-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <Save size={20} strokeWidth={2.5} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-sm p-8 text-center shadow-2xl border-2 border-gray-100 dark:border-slate-700 animate-pop-in">
            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600 dark:text-red-500 shadow-inner">
               <Trash2 size={40} />
            </div>
            <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase mb-2 tracking-tight">¿Eliminar Producto?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-8 font-bold text-lg">
              Estás a punto de eliminar <br/><strong className="text-gray-900 dark:text-white text-xl">{productToDelete.name}</strong>.
            </p>
            <div className="flex gap-4">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-4 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={confirmDeleteProduct} className="flex-1 py-4 font-bold text-white bg-red-600 rounded-2xl hover:bg-red-700 shadow-lg shadow-button-red transition-all">ELIMINAR</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GESTIONAR DEPARTAMENTOS (BOTTOM SHEET OPTIMIZADO) */}
      {showManageDepartmentsModal && (
         <div className="fixed inset-0 bg-black/80 dark:bg-slate-950/90 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full sm:max-w-lg h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col animate-slide-up border-t sm:border-2 border-gray-100 dark:border-slate-700 overflow-hidden">
            
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800 shrink-0 sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Departamentos</h3>
              <button 
                onClick={() => setShowManageDepartmentsModal(false)} 
                className="text-gray-400 p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Content */}
             <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-white dark:bg-slate-900">
              
              {/* Add/Edit Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  {editingDepartment ? 'Editar Departamento' : 'Crear Nuevo'}
                </h4>
                <div className="flex flex-col gap-3">
                  <input 
                    className="w-full p-4 text-lg font-bold border-2 border-gray-200 dark:border-slate-700 rounded-2xl bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 outline-none dark:text-white transition-all shadow-sm placeholder-gray-400" 
                    value={newDepartmentName} 
                    onChange={e => setNewDepartmentName(e.target.value)}
                    placeholder="Ej. Recepción"
                    onKeyDown={e => e.key === 'Enter' && handleSaveDepartment()}
                    autoFocus
                  />
                  <button 
                    onClick={handleSaveDepartment} 
                    disabled={!newDepartmentName.trim()}
                    className="w-full py-4 bg-red-600 disabled:bg-gray-300 dark:disabled:bg-slate-700 text-white font-black rounded-2xl shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-wide text-sm"
                  >
                    <Save size={20} strokeWidth={2.5} />
                    <span>{editingDepartment ? 'Guardar Cambios' : 'Añadir Departamento'}</span>
                  </button>
                </div>
              </div>

              {/* List Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                  Existentes ({departments.length})
                </h4>
                <div className="space-y-2">
                  {departments.map(dep => (
                    <div key={dep.id} className="group flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                      <span className="font-bold text-gray-900 dark:text-white text-base">{dep.name}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => openEditDepartmentModal(dep)} 
                          className="p-2.5 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors active:scale-95"
                        >
                          <Edit2 size={18} strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={(e) => handleDeleteDepartment(dep.id, e)} 
                            disabled={isDeletingDept === dep.id}
                            className="p-2.5 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors active:scale-95 disabled:opacity-50"
                            type="button"
                        >
                            {isDeletingDept === dep.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} strokeWidth={2.5} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {departments.length === 0 && (
                    <div className="text-center py-8 text-gray-400 dark:text-slate-600">
                      <PackageOpen size={48} className="mx-auto mb-2 opacity-50" strokeWidth={1.5} />
                      <p className="text-sm font-medium">No hay departamentos.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
             <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 pb-safe sticky bottom-0 z-10">
              <button 
                onClick={() => { setShowManageDepartmentsModal(false); setEditingDepartment(null); setNewDepartmentName(''); }} 
                className="w-full py-4 text-gray-600 dark:text-slate-400 font-bold bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg hover:scale-[1.01] transition-all group relative overflow-hidden">
            
            {/* Status indicator bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${product.quantity <= product.minThreshold ? 'bg-red-500' : 'bg-green-500'}`}></div>

            <div className="flex-1 pl-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight">{product.name}</h3>
                {product.quantity <= product.minThreshold && (
                  <span className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={12} /> Stock Bajo
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider mt-1.5">{product.departmentName} • {product.category}</p>
              <div className="mt-3 flex items-baseline gap-1">
                 <span className={`text-2xl font-black tracking-tight ${product.quantity <= product.minThreshold ? 'text-red-600 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>
                   {product.quantity}
                 </span>
                 <span className="text-xs font-bold text-gray-500 dark:text-slate-500 lowercase">{product.unit}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pl-4 border-l border-gray-100 dark:border-slate-800">
              <button 
                onClick={() => openEditProduct(product)}
                className="w-10 h-10 flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors active:scale-90"
              >
                <Edit2 size={18} />
              </button>
              <button 
                onClick={() => handleDeleteProductClick(product)}
                className="w-10 h-10 flex items-center justify-center text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors active:scale-90"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
        {filteredProducts.length === 0 && !loading && (
           <div className="py-20 text-center text-gray-400 dark:text-slate-600">
              <PackageOpen size={64} className="mx-auto mb-4 opacity-30" strokeWidth={1} />
              <p className="text-lg font-medium">No se encontraron productos.</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;
import React, { useEffect, useState } from 'react';
import { Product, UserRole, User, Department } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown, RefreshCw } from 'lucide-react';

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

  const handleSaveDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    await storageService.saveDepartment({ id: editingDepartment?.id || undefined, name: newDepartmentName.trim() });
    setEditingDepartment(null);
    setNewDepartmentName('');
  };

  const handleDeleteDepartment = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Eliminar este departamento?')) {
      setIsDeletingDept(id);
      await storageService.deleteDepartment(id);
      setIsDeletingDept(null);
    }
  };

  const filteredProducts = products.filter(p => 
    (selectedDepartmentFilter === 'all' || p.departmentId === selectedDepartmentFilter) &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600 uppercase font-black tracking-tighter">Acceso Denegado</div>;

  return (
    <div className="font-sans relative">
      {/* SUB-CABECERA DE INVENTARIO FIJA */}
      <div 
        className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-md px-4 py-6"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">
              Stock <span className="text-red-600">Total</span>
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setShowManageDepartmentsModal(true)} className="btn-header-action"><ListTree size={20} /></button>
              <button 
                onClick={() => { setEditProductForm({}); setShowEditProductModal(true); }}
                className="bg-red-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-90 transition-transform"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar artículo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:border-red-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="relative">
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                className="w-full sm:w-auto pl-4 pr-10 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-black uppercase tracking-wider focus:border-red-500 outline-none appearance-none dark:text-white"
              >
                <option value="all">Todas las Áreas</option>
                {departments.map(dep => <option key={dep.id} value={dep.id}>{dep.name.toUpperCase()}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center justify-between hover:shadow-md hover:border-red-500/30 transition-all relative overflow-hidden">
            {product.quantity <= product.minThreshold && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>}
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-black text-slate-900 dark:text-white truncate uppercase tracking-tight text-lg">{product.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.departmentName}</span>
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{product.category}</span>
              </div>
              <div className="mt-3 inline-flex items-center px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-black text-sm">
                {product.quantity} <span className="text-[10px] opacity-70 ml-1">{product.unit}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditProductForm(product); setShowEditProductModal(true); }} className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl active:scale-90"><Edit2 size={18} /></button>
              <button onClick={() => { storageService.deleteProduct(product.id); }} className="p-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl active:scale-90"><Trash2 size={18} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDICIÓN */}
      {showEditProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-lg shadow-2xl p-8 border border-white/10 animate-pop-in">
            <h3 className="text-2xl font-black uppercase italic mb-8">Editar <span className="text-red-600">Artículo</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre</label>
                <input className="w-full p-4 border-2 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold" value={editProductForm.name || ''} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Área</label>
                <select className="w-full p-4 border-2 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold" value={editProductForm.departmentId || ''} onChange={e => setEditProductForm({...editProductForm, departmentId: e.target.value})}>
                  <option value="">Seleccionar</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Stock</label>
                <input type="number" className="w-full p-4 border-2 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold" value={editProductForm.quantity || 0} onChange={e => setEditProductForm({...editProductForm, quantity: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Alerta</label>
                <input type="number" className="w-full p-4 border-2 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-red-600" value={editProductForm.minThreshold || 0} onChange={e => setEditProductForm({...editProductForm, minThreshold: Number(e.target.value)})} />
              </div>
            </div>
            <div className="flex gap-4 mt-10">
              <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-4 font-bold bg-slate-100 dark:bg-slate-800 rounded-2xl">Cerrar</button>
              <button onClick={handleSaveProduct} className="flex-2 py-4 px-8 text-white font-black bg-red-600 rounded-2xl shadow-xl">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* GESTIÓN DE ÁREAS */}
      {showManageDepartmentsModal && (
         <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-md h-auto max-h-[85dvh] rounded-t-[3rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border-t md:border-2 border-white/10 relative">
            <div className="px-6 py-6 border-b flex justify-between items-center">
              <h3 className="text-2xl font-black uppercase italic">Áreas</h3>
              <button onClick={() => setShowManageDepartmentsModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={24} /></button>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-950/50">
               <div className="flex gap-2">
                  <input className="flex-1 px-5 py-4 font-bold bg-white dark:bg-slate-800 rounded-2xl focus:border-red-500 outline-none" value={newDepartmentName} onChange={e => setNewDepartmentName(e.target.value)} placeholder="Nueva área..." />
                  <button onClick={handleSaveDepartment} className="w-14 h-14 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-lg"><Plus size={28} strokeWidth={3} /></button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {departments.map(dep => (
                <div key={dep.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="font-black text-slate-900 dark:text-white uppercase text-sm">{dep.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingDepartment(dep); setNewDepartmentName(dep.name); }} className="p-2 text-blue-600"><Edit2 size={18} /></button>
                    <button onClick={(e) => handleDeleteDepartment(dep.id, e)} className="p-2 text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
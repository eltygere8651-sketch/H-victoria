import React, { useEffect, useState } from 'react';
import { Product, UserRole, User, Department } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown, RefreshCw, Sparkles, Wand2, PackagePlus, ArrowRight, CheckCircle2 } from 'lucide-react';

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
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
  const [showCleanConfirm, setShowCleanConfirm] = useState(false);
  const [formError, setFormError] = useState('');
  const [smartSuggestion, setSmartSuggestion] = useState(false);

  // Receive Stock Feature State
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');
  const [receiveItems, setReceiveItems] = useState<{ product: Product, quantityToAdd: number }[]>([]);
  const [selectedProductToReceive, setSelectedProductToReceive] = useState<Product | null>(null);
  const [receiveQuantityInput, setReceiveQuantityInput] = useState('');

  useEffect(() => {
    if (!editProductForm.id && editProductForm.name) {
      const nameLower = editProductForm.name.toLowerCase();
      
      const isDrink = ['agua', 'zumo', 'refresco', 'cola', 'fanta', 'sprite', 'cerveza', 'vino', 'cafe', 'café', 'te', 'té', 'leche', 'batido', 'licor', 'ron', 'ginebra', 'vodka'].some(k => nameLower.includes(k));
      const isFood = ['pan', 'harina', 'azucar', 'sal', 'aceite', 'carne', 'pescado', 'pollo', 'verdura', 'fruta', 'queso', 'arroz', 'pasta', 'salsa'].some(k => nameLower.includes(k));
      const isSupply = ['servilleta', 'vaso', 'plato', 'cubierto', 'papel', 'limpieza', 'jabon', 'jabón', 'bolsa'].some(k => nameLower.includes(k));

      let suggestedCategory = editProductForm.category;
      let suggestedDeptIds = editProductForm.departmentIds || [];
      let suggestedUnit = editProductForm.unit;
      let changed = false;

      const barDept = departments.find(d => d.id === 'd-bar' || d.name.toLowerCase().includes('bar') || d.name.toLowerCase().includes('cafeteria'));
      const restDept = departments.find(d => d.id === 'd-restaurante' || d.name.toLowerCase().includes('restaurante'));

      if (isDrink && !editProductForm.category) {
        suggestedCategory = 'Bebidas';
        suggestedUnit = suggestedUnit || 'unidades';
        if (suggestedDeptIds.length === 0) {
          const ids = [];
          if (barDept) ids.push(barDept.id);
          if (restDept) ids.push(restDept.id);
          suggestedDeptIds = ids;
        }
        changed = true;
      } else if (isFood && !editProductForm.category) {
        suggestedCategory = 'Cocina/Despensa';
        suggestedUnit = suggestedUnit || 'kg';
        if (suggestedDeptIds.length === 0 && restDept) {
          suggestedDeptIds = [restDept.id];
        }
        changed = true;
      } else if (isSupply && !editProductForm.category) {
        suggestedCategory = 'Suministros';
        suggestedUnit = suggestedUnit || 'paquetes';
        if (suggestedDeptIds.length === 0 && restDept) {
          suggestedDeptIds = [restDept.id];
        }
        changed = true;
      }

      if (changed) {
        setEditProductForm(prev => ({
          ...prev,
          category: suggestedCategory,
          unit: suggestedUnit,
          departmentIds: suggestedDeptIds
        }));
        setSmartSuggestion(true);
      }
    } else if (!editProductForm.name) {
      setSmartSuggestion(false);
    }
  }, [editProductForm.name, editProductForm.id, departments]);

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
    const deptIds = editProductForm.departmentIds || (editProductForm.departmentId ? [editProductForm.departmentId] : []);
    if (!editProductForm.name || deptIds.length === 0) {
      setFormError('El nombre y al menos un área son obligatorios.');
      return;
    }
    setFormError('');
    setLoading(true);
    const primaryDeptId = deptIds[0];
    const primaryDept = departments.find(d => d.id === primaryDeptId);
    const deptNames = deptIds.map(id => departments.find(d => d.id === id)?.name || 'Desconocido');

    await storageService.saveProduct({
      id: editProductForm.id || undefined,
      name: editProductForm.name,
      category: editProductForm.category || 'General',
      quantity: Number(editProductForm.quantity) || 0,
      unit: editProductForm.unit || 'unidades',
      minThreshold: Number(editProductForm.minThreshold) || 5,
      departmentId: primaryDeptId,
      departmentName: primaryDept?.name || 'Desconocido',
      departmentIds: deptIds,
      departmentNames: deptNames
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

  const handleDeleteDepartment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeptToDelete(id);
  };

  const confirmDeleteDepartment = async () => {
    if (!deptToDelete) return;
    setIsDeletingDept(deptToDelete);
    await storageService.deleteDepartment(deptToDelete);
    setIsDeletingDept(null);
    setDeptToDelete(null);
  };

  const filteredProducts = products.filter(p => {
    const pDeptIds = p.departmentIds || (p.departmentId ? [p.departmentId] : []);
    const matchesDept = selectedDepartmentFilter === 'all' || pDeptIds.includes(selectedDepartmentFilter);
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDept && matchesSearch;
  });

  const handleCleanAndBoost = async () => {
    setLoading(true);
    setShowCleanConfirm(false);
    await storageService.cleanAndBoostStock();
    setLoading(false);
  };

  const handleAddReceiveItem = () => {
    if (!selectedProductToReceive) return;
    const qty = parseInt(receiveQuantityInput, 10);
    if (isNaN(qty) || qty <= 0) return;

    setReceiveItems(prev => {
      const existing = prev.find(item => item.product.id === selectedProductToReceive.id);
      if (existing) {
        return prev.map(item => item.product.id === selectedProductToReceive.id ? { ...item, quantityToAdd: item.quantityToAdd + qty } : item);
      }
      return [...prev, { product: selectedProductToReceive, quantityToAdd: qty }];
    });
    setSelectedProductToReceive(null);
    setReceiveQuantityInput('');
    setReceiveSearchTerm('');
  };

  const handleConfirmReceiveStock = async () => {
    if (receiveItems.length === 0) return;
    setLoading(true);
    await storageService.receiveStockBatch(
      receiveItems.map(item => ({ productId: item.product.id, quantityToAdd: item.quantityToAdd })),
      currentUser.name
    );
    setReceiveItems([]);
    setShowReceiveStockModal(false);
    setLoading(false);
  };

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
              <button 
                onClick={() => setShowReceiveStockModal(true)} 
                title="Ingreso de Mercancía"
                className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                <PackagePlus size={20} />
              </button>
              <button 
                onClick={() => setShowCleanConfirm(true)} 
                title="Limpiar duplicados y llenar stock"
                className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
              >
                <Wand2 size={20} />
              </button>
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
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {(product.departmentNames || [product.departmentName]).map((name, idx) => (
                  <span key={idx} className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{name}</span>
                ))}
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-auto">{product.category}</span>
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
            
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm font-bold flex items-center gap-2 mb-6">
                <AlertTriangle size={18} /> {formError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {smartSuggestion && !editProductForm.id && (
                <div className="md:col-span-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-sm font-bold animate-fade-in">
                  <Sparkles size={16} />
                  Stock Inteligente: Categoría, unidad y áreas sugeridas automáticamente.
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre</label>
                <input className="w-full p-4 border-2 rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold" value={editProductForm.name || ''} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Áreas</label>
                <div className="flex flex-wrap gap-2">
                  {departments.map(d => {
                    const isSelected = (editProductForm.departmentIds || (editProductForm.departmentId ? [editProductForm.departmentId] : [])).includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          const currentIds = editProductForm.departmentIds || (editProductForm.departmentId ? [editProductForm.departmentId] : []);
                          let newIds;
                          if (isSelected) {
                            newIds = currentIds.filter(id => id !== d.id);
                          } else {
                            newIds = [...currentIds, d.id];
                          }
                          setEditProductForm({ ...editProductForm, departmentIds: newIds });
                        }}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${isSelected ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
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

      {/* MODAL CONFIRMAR ELIMINAR PRODUCTO */}
      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">¿Eliminar producto?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-3 font-bold bg-slate-100 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">Cancelar</button>
              <button onClick={() => { storageService.deleteProduct(productToDelete.id); setProductToDelete(null); }} className="flex-1 py-3 font-bold bg-red-600 text-white rounded-xl shadow-lg shadow-red-600/30">Eliminar</button>
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

      {/* MODAL CONFIRMAR LIMPIEZA */}
      {showCleanConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 dark:bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-pop-in overflow-hidden animate-pop-in border border-gray-100 dark:border-slate-700/50">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center drop-shadow-sm">Limpiar y Rellenar Stock</h3>
                <p className="text-center text-gray-500 dark:text-slate-400 mt-2">¿Seguro que quieres eliminar duplicados y rellenar el stock de todos los productos a 500 unidades?</p>
              </div>
              <div className="p-6 flex gap-4">
                <button 
                  onClick={() => setShowCleanConfirm(false)}
                  className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCleanAndBoost}
                  className="flex-1 py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-colors"
                >
                  Confirmar
                </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR DEPARTAMENTO */}
      {deptToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 dark:bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-pop-in overflow-hidden animate-pop-in border border-gray-100 dark:border-slate-700/50">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center drop-shadow-sm">Eliminar Área</h3>
                <p className="text-center text-gray-500 dark:text-slate-400 mt-2">¿Seguro que quieres eliminar esta área? Los productos asignados podrían verse afectados.</p>
              </div>
              <div className="p-6 flex gap-4">
                <button 
                  onClick={() => setDeptToDelete(null)}
                  className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeleteDepartment}
                  className="flex-1 py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-colors"
                >
                  Eliminar
                </button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL INGRESO DE MERCANCÍA */}
      {showReceiveStockModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl shadow-2xl p-8 border border-white/10 flex flex-col max-h-[90vh] animate-pop-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black uppercase italic flex items-center gap-3">
                <PackagePlus className="text-blue-600" size={28} />
                Ingreso de <span className="text-blue-600">Mercancía</span>
              </h3>
              <button onClick={() => { setShowReceiveStockModal(false); setReceiveItems([]); setReceiveSearchTerm(''); setSelectedProductToReceive(null); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* Search & Add Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Buscar Producto</h4>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Escribe para buscar..." 
                    value={receiveSearchTerm}
                    onChange={(e) => setReceiveSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:border-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>

                {receiveSearchTerm && !selectedProductToReceive && (
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    {products.filter(p => p.name.toLowerCase().includes(receiveSearchTerm.toLowerCase())).slice(0, 5).map(p => (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedProductToReceive(p)}
                        className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center"
                      >
                        <span className="font-bold dark:text-white">{p.name}</span>
                        <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Stock: {p.quantity}</span>
                      </button>
                    ))}
                    {products.filter(p => p.name.toLowerCase().includes(receiveSearchTerm.toLowerCase())).length === 0 && (
                      <div className="p-4 text-center text-slate-500 font-bold text-sm">No se encontraron productos</div>
                    )}
                  </div>
                )}

                {selectedProductToReceive && (
                  <div className="flex items-center gap-3 animate-fade-in">
                    <div className="flex-1 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 min-w-0">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Seleccionado</span>
                      <span className="font-bold dark:text-white truncate block text-sm">{selectedProductToReceive.name}</span>
                    </div>
                    <input 
                      type="number" 
                      placeholder="Cant." 
                      value={receiveQuantityInput}
                      onChange={(e) => setReceiveQuantityInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddReceiveItem()}
                      className="w-24 px-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:border-blue-500 outline-none text-center dark:text-white"
                      autoFocus
                    />
                    <button 
                      onClick={handleAddReceiveItem}
                      className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex-shrink-0"
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>
                )}
              </div>

              {/* Pending List */}
              {receiveItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>Lista de Ingreso</span>
                    <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-lg text-xs">{receiveItems.length} items</span>
                  </h4>
                  <div className="space-y-2">
                    {receiveItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="font-bold dark:text-white truncate block">{item.product.name}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Stock actual: {item.product.quantity} <ArrowRight size={10} className="inline mx-1" /> {item.product.quantity + item.quantityToAdd}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-black text-lg text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-xl">
                            +{item.quantityToAdd}
                          </span>
                          <button 
                            onClick={() => setReceiveItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleConfirmReceiveStock}
                disabled={receiveItems.length === 0 || loading}
                className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-lg uppercase tracking-wider"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                Confirmar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
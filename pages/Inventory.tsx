import React, { useEffect, useState } from 'react';
import { Product, UserRole, User, Department } from '../types';
import { storageService } from '../services/storageService';
import { Search, Plus, Minus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown } from 'lucide-react';

interface InventoryProps {
  currentUser: User;
}

const Inventory: React.FC<InventoryProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all'); // 'all' or department.id
  
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editProductForm, setEditProductForm] = useState<Partial<Product>>({});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');

  useEffect(() => {
    // Subscribe to realtime updates for products
    const unsubscribeProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    // Subscribe to realtime updates for departments
    const unsubscribeDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
    });
    return () => {
      unsubscribeProducts();
      unsubscribeDepartments();
    };
  }, []);

  const handleWithdraw = async (productId: string) => {
    // Find product to check current quantity
    const p = products.find(prod => prod.id === productId);
    if (p && p.quantity > 0) {
      await storageService.saveProduct({ ...p, quantity: p.quantity - 1 });
    }
  };

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
    // Find department name based on selected ID
    const selectedDept = departments.find(d => d.id === editProductForm.departmentId);
    
    await storageService.saveProduct({
      id: editProductForm.id || `p_${Date.now()}`,
      name: editProductForm.name,
      category: editProductForm.category || 'General',
      quantity: Number(editProductForm.quantity) || 0,
      unit: editProductForm.unit || 'unidades',
      minThreshold: Number(editProductForm.minThreshold) || 5,
      departmentId: editProductForm.departmentId,
      departmentName: selectedDept?.name || 'Desconocido' // Use found name or default
    } as Product);
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

  // Department Management Handlers
  const handleSaveDepartment = async () => {
    if (!newDepartmentName.trim()) {
      alert('El nombre del departamento no puede estar vacío.');
      return;
    }
    if (editingDepartment) {
      await storageService.saveDepartment({ ...editingDepartment, name: newDepartmentName.trim() });
      setEditingDepartment(null);
    } else {
      await storageService.saveDepartment({ id: `d-temp-${Date.now()}`, name: newDepartmentName.trim() });
    }
    setNewDepartmentName('');
    setShowManageDepartmentsModal(false); // Close modal after saving
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este departamento? Los productos asociados quedarán sin departamento.')) {
      await storageService.deleteDepartment(departmentId);
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

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600 dark:text-red-400 font-bold text-xl">Acceso Denegado: Solo administradores pueden ver el inventario.</div>;

  if (loading && products.length === 0) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;
  }

  return (
    <div className="pb-24 md:pb-6 font-sans">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight drop-shadow-sm">Inventario</h2>
          {currentUser.role === UserRole.ADMIN && (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowManageDepartmentsModal(true)}
                className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white p-3 rounded-full shadow-lg shadow-red-200/50 dark:shadow-slate-700/50 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-all active:scale-95"
                title="Gestionar Departamentos"
              >
                <ListTree size={24} />
              </button>
              <button 
                onClick={openNewProduct}
                className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white p-3 rounded-full shadow-lg shadow-red-200/50 dark:shadow-slate-700/50 hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-all active:scale-95"
                title="Añadir Nuevo Producto"
              >
                <Plus size={24} />
              </button>
            </div>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={22} />
            <input 
              type="text" 
              placeholder="Buscar producto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800 text-lg shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
          <div className="relative">
            <select
              value={selectedDepartmentFilter}
              onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
              className="w-full sm:w-auto pl-4 pr-10 py-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800 text-lg shadow-sm focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none transition-all dark:text-white appearance-none"
            >
              <option value="all">Todos los Departamentos</option>
              {departments.map(dep => (
                <option key={dep.id} value={dep.id}>{dep.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" size={22} />
          </div>
        </div>
      </div>

      {/* --- Product Edit/New Modal --- */}
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
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" size={22} />
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
              <button 
                onClick={() => setShowEditProductModal(false)} 
                className="flex-1 py-4 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveProduct} 
                className="flex-1 py-4 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <Save size={20} /> Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Product Delete Confirmation Modal --- */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 drop-shadow-sm">¿Eliminar Producto?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Estás a punto de eliminar <strong className="text-gray-800 dark:text-slate-200">{productToDelete.name}</strong> del inventario.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteProduct}
                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Manage Departments Modal --- */}
      {showManageDepartmentsModal && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg shadow-pop-in p-8 animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-gray-900 dark:text-white drop-shadow-sm">Gestionar Departamentos</h3>
              <button onClick={() => setShowManageDepartmentsModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-2 -mr-2 rounded-full hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="mb-6 space-y-4">
              <h4 className="font-bold text-gray-700 dark:text-slate-300">Añadir Nuevo / Editar</h4>
              <div className="flex gap-3">
                <input 
                  className="flex-1 p-4 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-900 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none font-bold text-gray-900 dark:text-white shadow-sm" 
                  value={newDepartmentName} 
                  onChange={e => setNewDepartmentName(e.target.value)}
                  placeholder="Ej. Recepción, Mantenimiento"
                />
                <button 
                  onClick={handleSaveDepartment} 
                  className="bg-red-600 text-white p-4 rounded-xl shadow-lg shadow-button-red hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  <span>{editingDepartment ? 'Actualizar' : 'Añadir'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              <h4 className="font-bold text-gray-700 dark:text-slate-300">Departamentos Existentes</h4>
              {departments.length === 0 && (
                 <p className="text-gray-500 dark:text-slate-400 text-sm italic">No hay departamentos creados.</p>
              )}
              {departments.map(dep => (
                <div key={dep.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 p-3 rounded-xl border border-gray-100 dark:border-slate-700/50 shadow-sm">
                  <span className="font-semibold text-gray-900 dark:text-white">{dep.name}</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openEditDepartmentModal(dep)}
                      className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95 shadow-sm"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteDepartment(dep.id)}
                      className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95 shadow-sm"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-8">
              <button 
                onClick={() => { setShowManageDepartmentsModal(false); setEditingDepartment(null); setNewDepartmentName(''); }}
                className="py-3 px-6 text-gray-600 dark:text-slate-400 font-bold bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors active:scale-[0.98]"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Products List --- */}
      <div className="p-4 md:p-6 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-700/50 flex items-center justify-between hover:shadow-xl dark:hover:border-slate-600 transition-all group">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-xl text-gray-900 dark:text-white tracking-tight drop-shadow-sm">{product.name}</h3>
                {product.quantity <= product.minThreshold && (
                  <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-500 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 drop-shadow-sm">
                    <AlertTriangle size={14} /> Bajo Stock
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-slate-400 uppercase tracking-wide mt-1">{product.category} • {product.unit} • <span className="text-red-600 dark:text-red-400 font-bold">{product.departmentName}</span></p>
              <div className={`text-lg font-black mt-2 ${product.quantity <= product.minThreshold ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'} drop-shadow-sm`}>
                Stock: {product.quantity}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {currentUser.role === UserRole.ADMIN ? (
                <>
                  <button 
                    onClick={() => openEditProduct(product)}
                    className="p-3 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors active:scale-95 shadow-sm"
                  >
                    <Edit2 size={20} />
                  </button>
                  <button 
                    onClick={() => handleDeleteProductClick(product)}
                    className="p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors active:scale-95 shadow-sm"
                  >
                    <Trash2 size={20} />
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => handleWithdraw(product.id)}
                  disabled={product.quantity <= 0}
                  className="bg-red-600 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400 dark:disabled:text-slate-500 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-button-red dark:shadow-none active:scale-95 transition-all"
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
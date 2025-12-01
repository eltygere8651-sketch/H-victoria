import React, { useEffect, useState } from 'react';
import { Product, AuthenticatedUser, Department } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, Minus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown } from 'lucide-react';

interface InventoryProps {
  currentUser: AuthenticatedUser;
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

  const canManageInventory = currentUser.role === 'ADMIN';

  useEffect(() => {
    const unsubscribeProducts = storageService.subscribeToProducts((data) => { setProducts(data); setLoading(false); });
    const unsubscribeDepartments = storageService.subscribeToDepartments(setDepartments);
    return () => { unsubscribeProducts(); unsubscribeDepartments(); };
  }, []);

  const handleDeleteProductClick = (product: Product) => setProductToDelete(product);
  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      await storageService.deleteProduct(productToDelete.id);
      setProductToDelete(null);
    }
  };

  const handleSaveProduct = async () => {
    if (!editProductForm.name || !editProductForm.departmentId) return;
    const selectedDept = departments.find(d => d.id === editProductForm.departmentId);
    await storageService.saveProduct({
      ...editProductForm,
      departmentName: selectedDept?.name || 'N/A'
    });
    setShowEditProductModal(false);
    setEditProductForm({});
  };

  const openNewProduct = () => { setEditProductForm({}); setShowEditProductModal(true); };
  const openEditProduct = (product: Product) => { setEditProductForm({ ...product }); setShowEditProductModal(true); };

  const handleSaveDepartment = async () => {
    if (!newDepartmentName.trim()) return;
    if (editingDepartment) {
      await storageService.saveDepartment({ ...editingDepartment, name: newDepartmentName.trim() });
    } else {
      await storageService.saveDepartment({ name: newDepartmentName.trim() });
    }
    setEditingDepartment(null);
    setNewDepartmentName('');
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (window.confirm('¿Seguro?')) await storageService.deleteDepartment(departmentId);
  };
  
  const filteredProducts = products.filter(p => 
    (selectedDepartmentFilter === 'all' || p.departmentId === selectedDepartmentFilter) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (currentUser.role !== 'ADMIN') return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
  if (loading && products.length === 0) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="pb-24 md:pb-6">
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur pt-6 pb-4 px-4 md:px-6 border-b">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-3xl font-extrabold">Inventario</h2>
          {canManageInventory && (
            <div className="flex gap-2">
              <button onClick={() => setShowManageDepartmentsModal(true)}><ListTree /></button>
              <button onClick={openNewProduct}><Plus /></button>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-4 rounded-2xl border-2" />
          <select value={selectedDepartmentFilter} onChange={e => setSelectedDepartmentFilter(e.target.value)} className="w-full sm:w-auto p-4 rounded-2xl border-2">
            <option value="all">Todos</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {showEditProductModal && canManageInventory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8">
            <h3>{editProductForm.id ? 'Editar' : 'Nuevo'} Producto</h3>
            <input value={editProductForm.name||''} onChange={e=>setEditProductForm({...editProductForm, name: e.target.value})} placeholder="Nombre" />
            <select value={editProductForm.departmentId||''} onChange={e=>setEditProductForm({...editProductForm, departmentId: e.target.value})}>
                <option value="" disabled>Selecciona Dpto.</option>
                {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input value={editProductForm.quantity||0} onChange={e=>setEditProductForm({...editProductForm, quantity: Number(e.target.value)})} type="number" placeholder="Stock"/>
            <button onClick={handleSaveProduct}>Guardar</button>
            <button onClick={() => setShowEditProductModal(false)}>Cancelar</button>
          </div>
        </div>
      )}

      {productToDelete && canManageInventory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 text-center">
            <h3>¿Eliminar {productToDelete.name}?</h3>
            <button onClick={confirmDeleteProduct}>Sí, Eliminar</button>
            <button onClick={() => setProductToDelete(null)}>Cancelar</button>
          </div>
        </div>
      )}
      
      {showManageDepartmentsModal && canManageInventory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg p-8">
            <h3>Gestionar Departamentos</h3>
            <input value={newDepartmentName} onChange={e => setNewDepartmentName(e.target.value)} placeholder="Nombre" />
            <button onClick={handleSaveDepartment}>{editingDepartment ? 'Actualizar' : 'Añadir'}</button>
            {departments.map(d => <div key={d.id}>{d.name} <button onClick={()=>handleDeleteDepartment(d.id)}>X</button> <button onClick={()=>{setEditingDepartment(d); setNewDepartmentName(d.name)}}>E</button></div>)}
            <button onClick={() => setShowManageDepartmentsModal(false)}>Cerrar</button>
          </div>
        </div>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {filteredProducts.map(p => (
          <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <h3>{p.name} {p.quantity <= p.minThreshold && <AlertTriangle/>}</h3>
              <p>Stock: {p.quantity}</p>
            </div>
            {canManageInventory && (
              <div className="flex gap-3">
                <button onClick={() => openEditProduct(p)}><Edit2/></button>
                <button onClick={() => handleDeleteProductClick(p)}><Trash2/></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Inventory;
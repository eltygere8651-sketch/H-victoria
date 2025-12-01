import React, { useState, useEffect } from 'react';
import { AuthenticatedUser, Product, AppNotification, OrderBatch, Role, Permission, ALL_PERMISSIONS, User } from '../types';
import * as storageService from '../services/storageService';
import { Users, Package, Trash2, Edit2, X, Save, Eye, Download, AlertTriangle, Loader2, BarChart as BarChartIcon, BellRing, CheckCircle2, Shield, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Logo } from '../components/Logo';
import { NotificationIcon } from '../components/NotificationIcon';
import { generatePdfFromElement } from '../utils/pdfGenerator';

interface AdminProps {
  currentUser: AuthenticatedUser;
  unreadNotificationsCount: number;
  initialTab?: 'requests' | 'users' | 'reports' | 'roles';
}

const Admin: React.FC<AdminProps> = ({ currentUser, unreadNotificationsCount, initialTab = 'requests' }) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newUser, setNewUser] = useState<Omit<User, 'id'>>({ name: '', roleId: '', pin: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<Omit<Role, 'id'>>({ name: '', permissions: [], isEditable: true });
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  useEffect(() => { setActiveTab(initialTab); }, [initialTab]);

  useEffect(() => {
    const unsubOrders = storageService.subscribeToBatches(setOrders);
    const unsubUsers = storageService.subscribeToUsers(setUsers);
    const unsubRoles = storageService.subscribeToRoles(setRoles);
    const unsubProducts = storageService.subscribeToProducts((data) => { setProducts(data); setIsLoading(false); });
    const unsubNotifications = storageService.subscribeToNotifications(setNotifications, false);
    return () => { unsubOrders(); unsubUsers(); unsubRoles(); unsubProducts(); unsubNotifications(); };
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    setIsGeneratingPdf(true);
    try {
      await generatePdfFromElement('print-area', `Pedido_${selectedOrder.batchId}.pdf`);
    } catch (error) { console.error("PDF Fail:", error); } 
    finally { setIsGeneratingPdf(false); }
  };

  const handleDeleteBatchClick = (batchId: string) => setBatchToDelete(batchId);
  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      storageService.deleteBatch(batchToDelete);
      if (selectedOrder?.batchId === batchToDelete) setSelectedOrder(null);
      setBatchToDelete(null);
    }
  };

  const handleSaveUser = () => {
    if (editingUser) {
      if (editingUser.name && editingUser.pin && editingUser.roleId) {
        storageService.updateUser(editingUser);
        setEditingUser(null);
      }
    } else {
      if (newUser.name && newUser.pin && newUser.roleId) {
        storageService.addUser(newUser);
        setNewUser({ name: '', roleId: roles.find(r => r.isEditable)?.id || '', pin: '' });
      }
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) { alert("No puedes eliminar tu propio usuario."); return; }
    if (window.confirm('¿Seguro?')) storageService.deleteUser(id);
  };
  
  const handleSaveRole = () => {
    if (editingRole) {
      if (editingRole.name) {
        storageService.saveRole(editingRole);
        setEditingRole(null);
      }
    } else {
      if (newRole.name) {
        storageService.saveRole(newRole);
        setNewRole({ name: '', permissions: [], isEditable: true });
      }
    }
  };
  
  const handleDeleteRole = (role: Role) => {
    if (!role.isEditable) { alert('No se puede eliminar el rol de Administrador.'); return; }
    if (users.some(u => u.roleId === role.id)) { alert('No se puede eliminar un rol que está asignado a usuarios.'); return; }
    if (window.confirm(`¿Seguro que quieres eliminar el rol "${role.name}"?`)) storageService.deleteRole(role.id);
  };
  
  const togglePermission = (role: Role | Omit<Role, 'id'>, setRole: Function, permission: Permission) => {
    const newPermissions = role.permissions.includes(permission)
      ? role.permissions.filter(p => p !== permission)
      : [...role.permissions, permission];
    setRole({ ...role, permissions: newPermissions });
  };

  const handleMarkAllNotificationsAsRead = async () => await storageService.markAllNotificationsAsRead(currentUser.name);

  const lowStockData = products.filter(p => p.quantity <= p.minThreshold * 2).map(p => ({ name: p.name, stock: p.quantity, min: p.minThreshold })).sort((a, b) => a.stock - b.stock).slice(0, 10);
  
  if (currentUser.role.id !== 'admin') return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  const renderRoleEditor = (role: Role | Omit<Role, 'id'>, setRole: Function) => (
    <div className="space-y-4">
      <input type="text" placeholder="Nombre del Rol" value={role.name} onChange={e => setRole({...role, name: e.target.value})} className="w-full p-3 border-2 rounded-xl bg-gray-50 dark:bg-slate-700/50 outline-none focus:border-red-500 shadow-sm" required />
      <div className="space-y-2 pt-2">
        <h4 className="font-bold">Permisos</h4>
        {ALL_PERMISSIONS.map(p => (
          (p.id !== 'CAN_MANAGE_ROLES' || currentUser.role.id === 'admin') &&
          <label key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50 cursor-pointer">
            <input type="checkbox" className="w-5 h-5 rounded text-red-600 focus:ring-red-500" checked={role.permissions.includes(p.id)} onChange={() => togglePermission(role, setRole, p.id)} />
            <span className="font-semibold">{p.name}</span>
          </label>
        ))}
      </div>
    </div>
  );

  return (
    <div className="pb-20 md:pb-6">
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700/50 sticky top-0 z-10 shadow-sm">
        <div className="flex overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('requests')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 ${activeTab === 'requests' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Pedidos</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 relative ${activeTab === 'reports' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Reportes {unreadNotificationsCount > 0 && <span className="absolute top-2 right-2 md:right-4 w-4 h-4 bg-red-500 rounded-full text-white text-xs font-bold">!</span>}</button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 ${activeTab === 'users' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Usuarios</button>
          <button onClick={() => setActiveTab('roles')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 ${activeTab === 'roles' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:bg-gray-50'}`}>Roles</button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-900 min-h-[calc(100vh-140px)]">
        {activeTab === 'requests' && <div className="space-y-4">{orders.length === 0 && <div className="py-20 text-center text-gray-400"><Package size={40} className="mx-auto mb-2" /><p>No hay pedidos.</p></div>}{orders.map(o=>(<div key={o.batchId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card-soft p-6 flex items-center justify-between gap-6"><div className="flex-1"><span className="bg-red-50 text-red-600 text-xs font-black px-2 py-1 rounded">{o.departmentName}</span><h3 className="font-bold text-lg">Pedido #{o.batchId}</h3><p className="text-sm text-gray-500">Solicitado por: {o.requestedBy}</p></div><div className="flex items-center gap-3"><button onClick={()=>setSelectedOrder(o)} className="bg-gray-900 text-white px-5 py-3 rounded-xl font-bold"><Eye/></button><button onClick={()=>handleDeleteBatchClick(o.batchId)} className="p-3 text-gray-400 hover:text-red-600"><Trash2/></button></div></div>))}</div>}
        
        {activeTab === 'users' && <div><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft mb-6"><h3 className="font-bold text-xl mb-4"><Users className="inline mr-2" />Añadir Usuario</h3><form onSubmit={(e)=>{e.preventDefault(); handleSaveUser();}} className="space-y-4"><div className="grid md:grid-cols-3 gap-4"><input placeholder="Nombre" value={newUser.name} onChange={e=>setNewUser({...newUser,name:e.target.value})} className="p-3 border-2 rounded-xl" required /><input placeholder="PIN" value={newUser.pin} onChange={e=>setNewUser({...newUser,pin:e.target.value})} className="p-3 border-2 rounded-xl" required /><select value={newUser.roleId} onChange={e=>setNewUser({...newUser,roleId:e.target.value})} className="p-3 border-2 rounded-xl"><option value="" disabled>Selecciona Rol</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div><button type="submit" className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold"><Save/> Registrar</button></form></div><div className="space-y-3">{users.map(u=>(<div key={u.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between"><div className="flex items-center gap-3"><div><h4 className="font-bold">{u.name}</h4><p className="text-xs text-gray-500">Rol: {roles.find(r=>r.id===u.roleId)?.name || 'N/A'}</p></div></div><div className="flex items-center gap-2"><button onClick={()=>setEditingUser(u)} className="p-2"><Edit2/></button>{u.id!==currentUser.id&&<button onClick={()=>handleDeleteUser(u.id)} className="p-2"><Trash2/></button>}</div></div>))}</div></div>}
        
        {activeTab === 'roles' && <div><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft mb-6"><h3 className="font-bold text-xl mb-4"><Shield className="inline mr-2"/>Crear Rol</h3><form onSubmit={(e)=>{e.preventDefault(); handleSaveRole();}} className="space-y-4">{renderRoleEditor(newRole, setNewRole)}<button type="submit" className="bg-red-600 text-white px-8 py-3 rounded-xl font-bold"><Save/> Crear</button></form></div><div className="space-y-3">{roles.map(r=>(<div key={r.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between"><h4 className="font-bold">{r.name} {!r.isEditable && <Lock size={12}/>}</h4><div className="flex items-center gap-2">{r.isEditable && <><button onClick={()=>setEditingRole(r)} className="p-2"><Edit2/></button><button onClick={()=>handleDeleteRole(r)} className="p-2"><Trash2/></button></>}</div></div>))}</div></div>}

        {activeTab === 'reports' && <div className="space-y-8"><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft"><h3 className="text-lg font-bold mb-4"><BarChartIcon/> Stock Crítico</h3><div className="h-64">{lowStockData.length>0?<ResponsiveContainer width="100%" height="100%"><BarChart data={lowStockData}><CartesianGrid/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis/><Tooltip/><Bar dataKey="stock">{lowStockData.map((e,i)=><Cell key={i} fill={e.stock<=e.min?'#dc2626':'#f59e0b'}/>)}</Bar></BarChart></ResponsiveContainer>:<p>No hay datos.</p>}</div></div><div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-bold"><BellRing/> Notificaciones</h3>{unreadNotificationsCount>0&&<button onClick={handleMarkAllNotificationsAsRead} className="text-sm font-bold text-red-600"><CheckCircle2/> Marcar leídas</button>}</div><div className="max-h-96 overflow-y-auto space-y-3 pr-2">{notifications.map(n=>(<div key={n.id} className={`flex gap-3 p-4 rounded-xl border ${!n.readStatus?'bg-red-50/50':'opacity-70'}`}><NotificationIcon iconName={n.icon} className={!n.readStatus?'text-red-600':''}/><div className="flex-1"><p className="font-bold text-sm">{n.title}</p><p className="text-sm">{n.message}</p></div></div>))}</div></div></div>}
      </div>

      {editingUser && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6"><h3 className="font-bold text-xl mb-4">Editar Usuario</h3><div className="space-y-4"><input value={editingUser.name} onChange={e=>setEditingUser({...editingUser,name:e.target.value})} className="w-full p-3 border-2 rounded-xl" /><input value={editingUser.pin} onChange={e=>setEditingUser({...editingUser,pin:e.target.value})} className="w-full p-3 border-2 rounded-xl"/><select value={editingUser.roleId} onChange={e=>setEditingUser({...editingUser,roleId:e.target.value})} className="w-full p-3 border-2 rounded-xl">{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div><div className="flex gap-4 mt-6"><button onClick={()=>setEditingUser(null)}>Cancelar</button><button onClick={handleSaveUser}>Guardar</button></div></div></div>}
      {editingRole && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6"><h3 className="font-bold text-xl mb-4">Editar Rol</h3>{renderRoleEditor(editingRole, setEditingRole)}<div className="flex gap-4 mt-6"><button onClick={()=>setEditingRole(null)}>Cancelar</button><button onClick={handleSaveRole}>Guardar</button></div></div></div>}
      {batchToDelete && <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center"><h3 className="font-bold text-lg">¿Eliminar Pedido?</h3><p className="text-sm my-4">Se eliminará el pedido #{batchToDelete}.</p><div className="flex gap-4"><button onClick={()=>setBatchToDelete(null)}>Cancelar</button><button onClick={confirmDeleteBatch}>Eliminar</button></div></div></div>}
      {selectedOrder && <div className="fixed inset-0 z-40 bg-gray-900/90 flex flex-col items-center p-6"><div className="w-full max-w-3xl flex justify-between mb-6"><div/><div className="flex gap-3"><button onClick={handleDownloadPDF} disabled={isGeneratingPdf}>{isGeneratingPdf?<Loader2/>:<Download/>}</button><button onClick={()=>setSelectedOrder(null)}><X/></button></div></div><div id="print-area" className="bg-white text-black p-12 rounded-2xl max-w-3xl w-full"><div className="flex justify-between items-start pb-8 mb-8"><div className="flex items-center gap-4"><Logo size="lg" solid/><div><h1>Hub</h1><p>Reporte de Pedido</p></div></div><div><h2>#{selectedOrder.batchId}</h2><p>{selectedOrder.date}</p></div></div><div className="grid grid-cols-2 gap-8 mb-10"><p><span>Departamento</span><br/><span>{selectedOrder.departmentName}</span></p><p><span>Solicitante</span><br/><span>{selectedOrder.requestedBy}</span></p></div><table className="w-full mb-12"><thead><tr><th>Producto</th><th>Cant.</th></tr></thead><tbody>{selectedOrder.items.map((i,x)=><tr key={x}><td>{i.productName}</td><td>{i.quantity}</td></tr>)}</tbody></table></div></div>}
    </div>
  );
};

export default Admin;
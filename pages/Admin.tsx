import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, Product, Department, AppNotification, OrderBatch } from '../types';
import { storageService } from '../services/storageService';
import { Download, Users, Package, Trash2, Edit2, Key, X, Save, Shield, Eye, FileDown, Upload, Database, AlertTriangle, Loader2, Image as ImageIcon, FileText, ZoomIn, ZoomOut, Maximize, Printer, BarChart as BarChartIcon, BellRing, Bell, CheckCircle2, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Logo } from '../components/Logo';
import { NotificationIcon } from '../components/NotificationIcon';
import { generatePdfFromElement } from '../utils/pdfGenerator';

interface AdminProps {
  currentUser: User;
  unreadNotificationsCount: number;
  initialTab?: 'requests' | 'users' | 'reports'; // New prop
}

const Admin: React.FC<AdminProps> = ({ currentUser, unreadNotificationsCount, initialTab = 'requests' }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'reports'>(initialTab); // Use initialTab prop
  
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newUser, setNewUser] = useState({ name: '', role: UserRole.STAFF, pin: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  useEffect(() => {
    // If initialTab changes, update activeTab state
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    // Realtime subscriptions
    const unsubOrders = storageService.subscribeToBatches(setOrders);
    const unsubUsers = storageService.subscribeToUsers(setUsers);
    const unsubProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setIsLoading(false);
    });
    // Subscribe to all notifications for the Admin panel
    const unsubNotifications = storageService.subscribeToNotifications(setNotifications, false);
    
    return () => {
        unsubOrders();
        unsubUsers();
        unsubProducts();
        unsubNotifications();
    };
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    setIsGeneratingPdf(true);
    try {
      const filename = `Pedido_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`;
      await generatePdfFromElement('print-area', filename);
    } catch (error) {
      console.error("PDF Generation Failed:", error);
      alert('Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDeleteBatchClick = (batchId: string) => setBatchToDelete(batchId);
  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      storageService.deleteBatch(batchToDelete);
      if (selectedOrder?.batchId === batchToDelete) setSelectedOrder(null);
      setBatchToDelete(null);
    }
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name && newUser.pin) {
      storageService.addUser({
        id: `u_${Date.now()}`,
        name: newUser.name,
        role: newUser.role,
        pin: newUser.pin
      });
      setNewUser({ name: '', role: UserRole.STAFF, pin: '' });
    }
  };

  const handleUpdateUser = () => {
    if (editingUser && editingUser.name && editingUser.pin) {
      storageService.updateUser(editingUser);
      setEditingUser(null);
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) { alert("No puedes eliminar tu propio usuario."); return; }
    if (window.confirm('¿Seguro que quieres eliminar este usuario?')) {
      storageService.deleteUser(id);
    }
  };

  const handleMarkNotificationAsRead = async (notificationId: string) => {
    await storageService.markNotificationAsRead(notificationId, currentUser.id, currentUser.name);
  };

  const handleMarkAllNotificationsAsRead = async () => {
    await storageService.markAllNotificationsAsRead(currentUser.id, currentUser.name);
  };

  // Calculated from state instead of sync call
  const lowStockData = products
    .filter(p => p.quantity <= p.minThreshold * 2)
    .map(p => ({ name: p.name, stock: p.quantity, min: p.minThreshold }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="pb-20 md:pb-6 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700/50 sticky top-0 z-10 shadow-sm transition-colors duration-300">
        <div className="flex overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('requests')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 ${activeTab === 'requests' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner drop-shadow-sm' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>Pedidos</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 relative ${activeTab === 'reports' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner drop-shadow-sm' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
            Reportes
            {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 md:right-4 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-800 animate-pulse !important" aria-label={`${unreadNotificationsCount} nuevas notificaciones`}>
                    !
                </span>
            )}
          </button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 ${activeTab === 'users' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner drop-shadow-sm' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>Usuarios</button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-900 min-h-[calc(100vh-140px)] transition-colors duration-300">
        {activeTab === 'requests' && (
          <div className="space-y-4">
             {orders.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600"><Package size={40} className="mx-auto mb-2 opacity-50" /><p>No hay pedidos registrados.</p></div>}
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {orders.map((order) => (
                  <div key={order.batchId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-200 dark:border-slate-700/50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-200 dark:hover:border-red-900/50 hover:shadow-xl transition-all group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black px-2 py-1 rounded uppercase tracking-wider border border-red-100 dark:border-red-900/30 drop-shadow-sm">{order.departmentName}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{order.date}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg drop-shadow-sm">Pedido <span className="font-mono text-gray-500 dark:text-slate-400">#{order.batchId}</span></h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Solicitado por: <span className="font-bold text-gray-700 dark:text-slate-300">{order.requestedBy}</span></p>
                      <p className="text-sm font-extrabold text-gray-600 dark:text-slate-400 mt-2 flex items-center gap-2 drop-shadow-sm"><Package size={16} /> {order.items.reduce((acc, i) => acc + i.quantity, 0)} productos</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button onClick={() => setSelectedOrder(order)} className="flex-1 md:flex-none bg-gray-900 dark:bg-white dark:text-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-600 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95"><Eye size={18} /> Ver Albarán</button>
                      <button onClick={() => handleDeleteBatchClick(order.batchId)} className="p-3 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-100 dark:border-slate-700/50 shadow-sm active:scale-95"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-700/50 mb-6">
              <div className="flex items-center gap-2 mb-4 text-gray-900 dark:text-white"><Users className="text-red-600 dark:text-red-400 drop-shadow-sm" size={24} /><h3 className="font-bold text-xl drop-shadow-sm">Registrar Nuevo Empleado</h3></div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Nombre" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="p-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm" required />
                  <input type="text" placeholder="PIN" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} className="p-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm" required />
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="p-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm">
                    <option value={UserRole.STAFF}>Personal</option><option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-button-red flex items-center justify-center gap-2 active:scale-95"><Save size={18} /> Registrar</button>
              </form>
            </div>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex items-center justify-between hover:shadow-lg transition-shadow group">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{u.name.charAt(0)}</div>
                    <div><h4 className="font-bold text-gray-900 dark:text-white drop-shadow-sm">{u.name}</h4><p className="text-xs text-gray-500 dark:text-slate-400 drop-shadow-sm">{u.role} • PIN: {u.pin}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingUser(u)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-colors shadow-sm"><Edit2 size={18} /></button>
                    {u.id !== currentUser.id && <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-colors shadow-sm"><Trash2 size={18} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
           <div className="space-y-8">
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-700/50">
               <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white drop-shadow-sm flex items-center gap-2">
                 <BarChartIcon size={20} className="text-red-600 dark:text-red-400" /> Top 10 Productos en Stock Crítico
               </h3>
               <div className="h-64 w-full">
                  {lowStockData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={lowStockData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128, 128, 128, 0.2)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'currentColor' }} interval={0} angle={-45} textAnchor="end" height={50} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'currentColor' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(4px)',
                                border: '1px solid rgba(200, 200, 200, 0.5)',
                                borderRadius: '1rem',
                                color: '#333'
                            }}
                            cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }}
                        />
                        <Bar dataKey="stock" name="Stock Actual" radius={[4, 4, 0, 0]}>
                            {lowStockData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.stock <= entry.min ? '#dc2626' : '#f59e0b'} />
                            ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400 dark:text-slate-500">
                      <p>No hay datos de stock bajo para mostrar.</p>
                    </div>
                  )}
               </div>
             </div>
             
             <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-700/50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white drop-shadow-sm flex items-center gap-2">
                    <BellRing size={20} className="text-red-600 dark:text-red-400" />
                    Registro de Actividad y Notificaciones
                  </h3>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={handleMarkAllNotificationsAsRead}
                      className="text-sm font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 drop-shadow-sm"
                    >
                      <CheckCircle2 size={16} /> Marcar todas como leídas
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
                  {notifications.length === 0 ? (
                    <p className="text-gray-400 dark:text-slate-500 text-center py-8">No hay notificaciones.</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${notif.readStatus ? 'bg-gray-50/50 dark:bg-slate-800/50 border-gray-100 dark:border-slate-700/50 opacity-70' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30 shadow-sm'}`}>
                        <div className="pt-1">
                          <NotificationIcon iconName={notif.icon} size={20} className={notif.readStatus ? 'text-gray-400' : 'text-red-600'} />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-800 dark:text-slate-200 text-sm drop-shadow-sm">{notif.title}</p>
                          <p className="text-gray-600 dark:text-slate-400 text-sm mt-1">{notif.message}</p>
                          <div className="text-xs text-gray-400 dark:text-slate-500 mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                             <span>{new Date(notif.timestamp).toLocaleString()}</span>
                             {notif.reviewedBy && <span>Revisado por: {notif.reviewedBy}</span>}
                          </div>
                        </div>
                        {!notif.readStatus && (
                          <button
                            onClick={() => handleMarkNotificationAsRead(notif.id)}
                            className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-full transition-colors"
                            title="Marcar como leída"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        )}
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-pop-in animate-pop-in">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl text-gray-900 dark:text-white">Editar Usuario</h3><button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X /></button></div>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm" required />
              <input type="text" placeholder="PIN" value={editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} className="w-full p-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm" required />
              <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full p-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm appearance-none">
                <option value={UserRole.STAFF}>Personal</option><option value={UserRole.ADMIN}>Admin</option>
              </select>
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Cancelar</button>
              <button onClick={handleUpdateUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {batchToDelete && (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-pop-in animate-pop-in">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">¿Eliminar Pedido?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Se eliminará el pedido <span className="font-bold text-gray-800 dark:text-slate-200">#{batchToDelete}</span>. Esta acción no se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={() => setBatchToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Cancelar</button>
              <button onClick={confirmDeleteBatch} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-40 bg-gray-900/90 backdrop-blur-sm flex flex-col items-center p-0 md:p-6 overflow-y-auto animate-fade-in" onClick={() => setSelectedOrder(null)}>
          <div className="w-full max-w-3xl flex items-center justify-between px-4 pt-safe pb-4 md:p-0 md:mb-6 sticky top-0 md:static bg-gray-900/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none z-20" onClick={e => e.stopPropagation()}>
            <h2 className="text-white font-bold text-lg hidden md:block">Vista Previa</h2>
            <div className="flex gap-3 ml-auto">
              <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="bg-red-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-button-red flex items-center gap-2 hover:bg-red-700 transition-colors disabled:bg-red-400 active:scale-95">
                {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <Download />} {isGeneratingPdf ? 'Generando...' : 'PDF'}
              </button>
              <button onClick={() => setSelectedOrder(null)} className="p-3 bg-white text-gray-900 rounded-xl font-bold shadow-md hover:bg-gray-100 active:scale-95"><X /></button>
            </div>
          </div>
          <div id="print-area" className="bg-white text-black p-6 md:p-12 rounded-t-2xl md:rounded-2xl shadow-2xl max-w-3xl w-full h-auto animate-slide-up dark:bg-white dark:text-black" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b-2 border-black pb-8 mb-8">
              <div className="flex items-center gap-4"><Logo size="lg" solid /><div className="mt-2"><h1 className="text-3xl font-black uppercase tracking-tighter">Hotel Victoria</h1><p className="text-red-600 font-bold uppercase tracking-[0.3em] text-sm">Pedidos Internos</p></div></div>
              <div className="text-right"><h2 className="text-2xl font-mono font-bold">#{selectedOrder.batchId}</h2><p className="text-sm font-semibold text-gray-500 mt-1">{selectedOrder.date}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-8 mb-10"><p><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Departamento</span><br /><span className="text-2xl font-extrabold">{selectedOrder.departmentName}</span></p><p><span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Solicitante</span><br /><span className="text-2xl font-extrabold">{selectedOrder.requestedBy}</span></p></div>
            <table className="w-full mb-12">
              <thead><tr className="border-b-2 border-black"><th className="text-left py-3 text-sm font-black uppercase tracking-wider">Producto</th><th className="text-center py-3 text-sm font-black uppercase tracking-wider w-32">Cant.</th><th className="hidden md:table-cell text-right py-3 text-sm font-black uppercase tracking-wider w-24">Unidad</th><th className="text-right py-3 text-sm font-black uppercase tracking-wider w-20">Check</th></tr></thead>
              <tbody>
                {selectedOrder.items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200"><td className="py-4 font-bold text-lg">{item.productName}</td><td className="py-4 text-center font-black text-xl">{item.quantity}</td><td className="hidden md:table-cell py-4 text-right text-gray-500 font-semibold">{item.unit || 'uds.'}</td><td className="py-4 text-right"><div className="w-8 h-8 border-2 border-gray-300 rounded-lg inline-block"></div></td></tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-16 mt-auto pt-12 border-t-2 border-gray-200">
              <div><div className="h-24 border-b-2 border-gray-300 mb-2"></div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Firma Entregado (Almacén)</p></div>
              <div><div className="h-24 border-b-2 border-gray-300 mb-2"></div><p className="text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Firma Recibido ({selectedOrder.departmentName})</p></div>
            </div>
          </div>
          <div className="h-24 w-full no-print"></div>
        </div>
      )}
    </div>
  );
};

export default Admin;
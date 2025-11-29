import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, Product, Department, AppNotification, OrderBatch } from '../types';
import { storageService } from '../services/storageService';
import { Download, Users, Package, Trash2, Edit2, Key, X, Save, Shield, Eye, FileDown, Upload, Database, AlertTriangle, Loader2, Image as ImageIcon, FileText, ZoomIn, ZoomOut, Maximize, Printer, BarChart as BarChartIcon, BellRing, Bell, CheckCircle2, ChevronDown } from 'lucide-react'; // Added BarChartIcon, BellRing, Bell, CheckCircle2, ChevronDown
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Logo } from '../components/Logo';
import { NotificationIcon } from '../components/NotificationIcon';

interface AdminProps {
  currentUser: User;
  unreadNotificationsCount: number; // New prop for badge
}

const Admin: React.FC<AdminProps> = ({ currentUser, unreadNotificationsCount }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'reports' | 'notifications'>('requests'); // Changed 'data' to 'reports', added 'notifications'
  
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]); // New state for notifications
  const [isLoading, setIsLoading] = useState(true); // Renamed from 'loading' for clarity
  
  const [newUser, setNewUser] = useState({ name: '', role: UserRole.STAFF, pin: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Realtime subscriptions
    const unsubOrders = storageService.subscribeToBatches(setOrders);
    const unsubUsers = storageService.subscribeToUsers(setUsers);
    const unsubProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setIsLoading(false); // Set loading to false once products are loaded
    });
    const unsubNotifications = storageService.subscribeToNotifications(setNotifications, false); // Subscribe to all for Admin panel
    
    return () => {
        unsubOrders();
        unsubUsers();
        unsubProducts();
        unsubNotifications();
    };
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
      alert('La librería de PDF está cargando. Por favor espera unos segundos.');
      return;
    }

    setIsGeneratingPdf(true);
    // Give UI a moment to update button state
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = document.getElementById('print-area');
    const opt = {
      margin: [10, 10, 10, 10], // mm
      filename: `Pedido_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`, // Updated
      image: { type: 'png', quality: 1.0 }, // PNG for lossless text sharpness
      html2canvas: { 
        scale: 4, // High resolution (approx 300-400 DPI)
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff', 
        letterRendering: true,
        scrollX: 0, // CRITICAL: Fixes left-cropping issues
        scrollY: 0, // CRITICAL: Fixes top-cropping issues
        // windowWidth removed to allow auto-detection and prevent centering offsets
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => setIsGeneratingPdf(false)).catch((err) => { console.error(err); setIsGeneratingPdf(false); alert('Error al generar PDF.'); });
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
        id: `u_${Date.now()}`, // Generate ID here for setDoc
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
          <button onClick={() => setActiveTab('reports')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 ${activeTab === 'reports' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner drop-shadow-sm' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>Reportes</button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 ${activeTab === 'users' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner drop-shadow-sm' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>Usuarios</button>
          <button onClick={() => setActiveTab('notifications')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 relative ${activeTab === 'notifications' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner drop-shadow-sm' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
            Notificaciones
            {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 md:right-4 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-800 animate-pulse !important" aria-label={`${unreadNotificationsCount} nuevas notificaciones`}>
                    !
                </span>
            )}
          </button>
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

        {activeTab === 'reports' && ( // Changed 'data' to 'reports'
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-700/50">
             <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white drop-shadow-sm flex items-center gap-2">
               <BarChartIcon size={20} className="text-red-600 dark:text-red-400" /> Top 10 Productos en Stock Crítico
             </h3>
             <div className="h-64 w-full">
                {lowStockData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lowStockData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} stroke="#94a3b8" tick={{ fill: 'currentColor', fontSize: 12 }} className="text-gray-600 dark:text-slate-400" />
                      <YAxis 
                        stroke="#94a3b8" 
                        label={{ value: 'Stock Actual', angle: -90, position: 'insideLeft', fill: '#94a3b8', fontSize: 12 }} 
                        tick={{ fill: 'currentColor', fontSize: 12 }} 
                        className="text-gray-600 dark:text-slate-400"
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(220, 38, 38, 0.1)' }} // Light red background for hover
                        contentStyle={{ 
                          backgroundColor: 'rgba(30, 41, 59, 0.9)', // slate-800 with opacity
                          border: '1px solid rgba(71, 85, 105, 0.5)', // slate-600 border
                          borderRadius: '12px', 
                          color: '#fff', 
                          boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                        }}
                        itemStyle={{ color: '#fff', padding: '0px' }}
                        labelStyle={{ color: '#cbd5e1', fontWeight: 'bold' }}
                        formatter={(value: number, name: string, props: any) => {
                          if (name === 'stock') return [`${value} unidades`, 'Stock'];
                          if (name === 'min') return [`${value} unidades`, 'Mínimo'];
                          return value;
                        }}
                        labelFormatter={(label: string) => <span className="text-red-300">Producto: {label}</span>}
                      />
                      <Bar dataKey="stock" fill="#f87171" stroke="#ef4444" strokeWidth={1} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-slate-600">
                    <AlertTriangle size={40} className="mb-2 opacity-50" />
                    <p className="font-bold">No hay productos en stock crítico.</p>
                  </div>
                )}
             </div>
           </div>
        )}

        {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-100 dark:border-slate-700/50">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                  <BellRing size={24} className="text-red-600 dark:text-red-400 drop-shadow-sm" />
                  <h3 className="font-bold text-xl text-gray-900 dark:text-white drop-shadow-sm">Notificaciones</h3>
                </div>
                {notifications.some(n => !n.readStatus) && (
                  <button 
                    onClick={handleMarkAllNotificationsAsRead}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-button-red hover:bg-red-700 active:scale-95 transition-all"
                  >
                    <CheckCircle2 size={18} /> Marcar todas como leídas
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 dark:text-slate-600">
                    <Bell size={40} className="mx-auto mb-2 opacity-50" />
                    <p>No hay notificaciones.</p>
                  </div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`
                        flex items-start gap-4 p-4 rounded-xl border transition-all duration-200
                        ${notif.readStatus 
                          ? 'bg-gray-50 dark:bg-slate-700/50 border-gray-100 dark:border-slate-700/50 text-gray-500' 
                          : 'bg-white dark:bg-slate-800 border-red-200 dark:border-red-900/50 shadow-md hover:shadow-lg'
                        }
                      `}
                    >
                      <div className="flex-shrink-0 pt-1">
                        <NotificationIcon 
                          iconName={notif.icon} 
                          size={24} 
                          className={`
                            ${notif.readStatus ? 'text-gray-400' : 
                              (notif.type === 'LOW_STOCK' ? 'text-amber-500' : 'text-red-600')}
                          `}
                        />
                      </div>
                      <div className="flex-1">
                        <p className={`font-bold ${notif.readStatus ? 'text-gray-600 dark:text-slate-400' : 'text-gray-900 dark:text-white'} drop-shadow-sm`}>
                          {notif.title}
                        </p>
                        <p className={`text-sm mt-1 ${notif.readStatus ? 'text-gray-500 dark:text-slate-500' : 'text-gray-700 dark:text-slate-300'}`}>
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                          {new Date(notif.timestamp).toLocaleString()}
                          {notif.readStatus && notif.reviewedBy && (
                            <span className="ml-2"> • Leída por {notif.reviewedBy}</span>
                          )}
                        </p>
                      </div>
                      {!notif.readStatus && (
                        <button 
                          onClick={() => handleMarkNotificationAsRead(notif.id)}
                          className="flex-shrink-0 p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full transition-colors active:scale-95"
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
        )}
      </div>

      {/* MODALS (Edit User, Confirm Delete, Preview PDF) */}
      {editingUser && <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-pop-in animate-pop-in"><h3 className="font-bold text-lg mb-4 dark:text-white drop-shadow-sm">Editar Usuario</h3><input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 mb-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm" /><input value={editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} className="w-full p-3 mb-3 border-2 border-gray-200 dark:border-slate-700/50 rounded-xl dark:bg-slate-700/50 dark:text-white outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 shadow-sm" /><div className="flex gap-3 mt-4"><button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-[0.98]">Cancelar</button><button onClick={handleUpdateUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Guardar</button></div></div></div>}
      
      {/* PDF Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[70] bg-gray-900/95 flex flex-col items-center justify-start p-0 md:p-6 overflow-y-auto animate-fade-in" onClick={() => setSelectedOrder(null)}>
           <div className="w-full max-w-3xl flex justify-between items-center p-4 sticky top-0 bg-gray-900/80 backdrop-blur-md z-20" onClick={e => e.stopPropagation()}>
             <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-button-red flex items-center gap-2 disabled:bg-gray-600 disabled:shadow-none hover:bg-red-700 active:scale-95">{isGeneratingPdf ? <Loader2 className="animate-spin" /> : <Download size={20} />} {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</button>
             <button onClick={() => setSelectedOrder(null)} className="bg-white text-gray-900 px-4 py-3 rounded-xl font-bold shadow-md hover:bg-gray-100 active:scale-95"><X size={24} /></button>
           </div>
           
           {/* Printable Area */}
           <div 
             id="print-area" 
             className="bg-white dark:bg-white text-black dark:text-black p-6 md:p-12 shadow-2xl max-w-3xl w-full h-auto relative overflow-visible" 
             style={{ backgroundColor: '#ffffff', color: '#000000' }} 
             onClick={e => e.stopPropagation()}
           >
              <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-6">
                <div className="flex items-center gap-6"><Logo size="lg" solid={true} /><div><h1 className="text-3xl font-black uppercase text-black">Hotel Victoria</h1></div></div>
                <h2 className="text-xl font-mono font-bold text-black">#{selectedOrder.batchId}</h2>
              </div>
              <table className="w-full"><thead><tr className="border-b-2 border-black"><th className="text-left py-4 text-black font-black">Producto</th><th className="text-center py-4 text-black font-black">Cant.</th></tr></thead><tbody>{selectedOrder.items.map((item, idx) => (<tr key={idx} className="border-b border-gray-200"><td className="py-4 font-bold text-black">{item.productName}</td><td className="py-4 text-center text-black font-black bg-gray-100 rounded-lg">{item.quantity}</td></tr>))}</tbody></table>
              
              <div className="mt-12 pt-8 border-t-2 border-gray-100 text-center">
                 <p className="text-xs text-gray-400 font-bold uppercase">Generado el {new Date().toLocaleString()}</p>
              </div>
           </div>
        </div>
      )}
      
      {/* Confirm Batch Delete */}
      {batchToDelete && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"><div className="bg-white dark:bg-slate-800 rounded-3xl p-6 text-center shadow-pop-in animate-pop-in"><h3 className="text-xl font-black mb-2 dark:text-white drop-shadow-sm">¿Eliminar Pedido?</h3><p className="text-gray-500 dark:text-slate-400 mb-6">Esta acción no se puede deshacer.</p><div className="flex gap-3"><button onClick={() => setBatchToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 rounded-xl font-bold text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-[0.98]">Cancelar</button><button onClick={confirmDeleteBatch} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98]">Eliminar</button></div></div></div>}
      
    </div>
  );
};

export default Admin;
import React, { useState, useEffect } from 'react';
import { UserRole, User, Product, AppNotification, OrderBatch } from '../types';
import * as storageService from '../services/storageService';
import { Download, Users, Package, Trash2, Edit2, X, Save, Eye, Loader2, BarChart as BarChartIcon, BellRing, CheckCircle2, Share2, Smartphone, Activity, TrendingUp, ShieldAlert, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { NotificationIcon } from '../components/NotificationIcon';
import { generatePdfFromReactComponent, sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { OrderPdfDocument } from '../components/OrderPdfDocument';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';

interface AdminProps {
  currentUser: User;
  unreadNotificationsCount: number;
  initialTab?: 'requests' | 'users' | 'reports';
}

const Admin: React.FC<AdminProps> = ({ currentUser, unreadNotificationsCount, initialTab = 'requests' }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'reports'>(initialTab);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [newUser, setNewUser] = useState({ name: '', role: UserRole.STAFF, pin: '', permissions: [] as ('CAN_MANAGE_TASKS')[] });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('unread');

  // New states for clearing history
  const [showClearNotificationsConfirm, setShowClearNotificationsConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const isSuperAdmin = storageService.auth.currentUser?.email === storageService.SUPER_ADMIN_EMAIL;

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    // If not super admin and on users tab, move to requests
    if (!isSuperAdmin && activeTab === 'users') {
      setActiveTab('requests');
    }
  }, [isSuperAdmin, activeTab]);

  useEffect(() => {
    const unsubOrders = storageService.subscribeToBatches(setOrders);
    const unsubUsers = storageService.subscribeToUsers(setUsers);
    const unsubProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setIsLoading(false);
    });
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
      const isIngreso = selectedOrder.departmentId === 'INGRESO' || selectedOrder.departmentName === 'Ingreso de Proveedor';
      const prefix = isIngreso ? 'Albaran_de_Entrega' : 'Pedido_Interno';
      const filename = `${prefix}_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`;
      // Pass preview=false to ensure it uses the fixed A4 width styles
      await generatePdfFromReactComponent(<OrderPdfDocument order={selectedOrder} preview={false} />, filename);
    } catch (error) {
      console.error("PDF Generation Failed:", error);
      alert('Hubo un error al generar el PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSharePDF = async () => {
    if (!selectedOrder) return;
    setIsGeneratingPdf(true);
    try {
      const isIngreso = selectedOrder.departmentId === 'INGRESO' || selectedOrder.departmentName === 'Ingreso de Proveedor';
      const prefix = isIngreso ? 'Albaran_de_Entrega' : 'Pedido_Interno';
      const title = isIngreso ? 'Albarán de Entrega' : 'Pedido Interno';
      const text = isIngreso ? 'Aquí tienes el albarán de entrega en formato PDF.' : 'Aquí tienes el pedido interno en formato PDF.';
      const filename = `${prefix}_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`;
      await sharePdfFromReactComponent(<OrderPdfDocument order={selectedOrder} preview={false} />, filename, `${title} #${selectedOrder.batchId}`, text);
    } catch (error) {
      console.error("PDF Share Failed:", error);
      alert('Hubo un error al compartir el PDF.');
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
        name: newUser.name,
        role: newUser.role,
        pin: newUser.pin,
        permissions: newUser.role === UserRole.STAFF ? newUser.permissions : undefined
      });
      setNewUser({ name: '', role: UserRole.STAFF, pin: '', permissions: [] });
    }
  };

  const handleUpdateUser = () => {
    if (editingUser && editingUser.name) {
      const userToUpdate = { ...editingUser };
      
      // If pin is empty, it means we don't want to change it. 
      // But we need to make sure we don't overwrite the existing hash with empty string.
      if (!userToUpdate.pin) {
        // Find the original user to get current PIN
        const original = users.find(u => u.id === editingUser.id);
        if (original) userToUpdate.pin = original.pin;
      }

      if (userToUpdate.role === UserRole.ADMIN) {
        userToUpdate.permissions = [];
      }
      storageService.updateUser(userToUpdate);
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
  
  const handleClearAllNotifications = async () => {
    setIsClearing(true);
    await storageService.deleteAllNotifications();
    setIsClearing(false);
    setShowClearNotificationsConfirm(false);
  };

  const lowStockData = products
    .filter(p => p.quantity <= p.minThreshold * 2)
    .map(p => ({ name: p.name, stock: p.quantity, min: p.minThreshold }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  // New KPI Calculations
  const totalProducts = products.length;
  const criticalProductsCount = products.filter(p => p.quantity <= p.minThreshold).length;
  const healthPercentage = totalProducts > 0 ? Math.round(((totalProducts - criticalProductsCount) / totalProducts) * 100) : 0;
  
  const recentOrdersCount = orders.filter(o => {
    const orderDate = new Date(o.date);
    const now = new Date();
    return (now.getTime() - orderDate.getTime()) < (24 * 60 * 60 * 1000);
  }).length;

  const managementEfficiency = notifications.length > 0 
    ? Math.round((notifications.filter(n => n.readStatus).length / notifications.length) * 100) 
    : 100;

  // New: Order fulfillment efficiency (real data)
  const orderEfficiency = orders.length > 0 ? 100 : 100; // Placeholder for future logic if orders had status

  // Consolidated Activity Timeline
  const activityTimeline = (() => {
    const timelineItems = [
      ...orders.map(o => ({
        id: o.batchId,
        type: 'order' as const,
        title: `Albarán #${o.batchId}`,
        message: `${o.requestedBy} solicitó ${o.items.length} productos para ${o.departmentName}`,
        timestamp: new Date(o.date).getTime(),
        icon: Package,
        color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        read: true // Orders are always "read" as they are history
      })),
      ...notifications
        .map(n => ({
          id: n.id,
          type: 'notification' as const,
          title: n.title,
          message: n.message,
          timestamp: n.timestamp,
          icon: Activity,
          color: n.readStatus ? 'text-slate-400 bg-slate-50 dark:bg-slate-800/50' : 'text-red-600 bg-red-50 dark:bg-red-900/20',
          read: n.readStatus
        }))
    ];

    return timelineItems
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);
  })();

  const filteredNotifications = notificationFilter === 'unread'
    ? notifications.filter(n => !n.readStatus)
    : notifications;

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="transition-colors duration-300 min-h-screen pb-24 bg-gray-50 dark:bg-slate-950">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b dark:border-slate-800 sticky top-[var(--header-h)] z-30 shadow-md transition-all duration-300">
        <div className="flex overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('requests')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 ${activeTab === 'requests' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Historial de Albaranes</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 relative ${activeTab === 'reports' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
            Reportes
            {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-2 md:right-4 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold ring-2 ring-white dark:ring-slate-900 animate-pulse" aria-label={`${unreadNotificationsCount} nuevas notificaciones`}>
                    {unreadNotificationsCount}
                </span>
            )}
          </button>
          {isSuperAdmin && (
            <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[120px] py-4 text-sm font-extrabold border-b-2 transition-colors duration-200 ${activeTab === 'users' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Usuarios</button>
          )}
        </div>
      </div>

      <div className="p-4 transition-colors duration-300">
        {activeTab === 'requests' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Registro de</span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  Historial de <span className="text-red-600 dark:text-red-500 italic">Albaranes</span>
                </h2>
              </div>
            </div>
            <div className="space-y-4">
               {orders.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600"><Package size={40} className="mx-auto mb-2 opacity-50" /><p>No hay albaranes registrados.</p></div>}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {orders.map((order) => (
                    <div key={order.batchId} className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-500/50 dark:hover:border-red-500/50 hover:shadow-lg transition-all group">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black px-2 py-1 rounded uppercase tracking-wider border border-red-100 dark:border-red-900/30">{order.departmentName}</span>
                          <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{order.date}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-lg">Albarán <span className="font-mono text-gray-500 dark:text-slate-400">#{order.batchId}</span></h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Solicitado por: <span className="font-bold text-gray-700 dark:text-slate-300">{order.requestedBy}</span></p>
                        <p className="text-sm font-extrabold text-gray-600 dark:text-slate-400 mt-2 flex items-center gap-2"><Package size={16} /> {order.items.reduce((acc, i) => acc + i.quantity, 0)} productos</p>
                      </div>
                      <div className="flex items-center gap-3 w-full md:w-auto">
                        <button onClick={() => setSelectedOrder(order)} className="flex-1 md:flex-none bg-gray-900 dark:bg-white dark:text-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-600 dark:hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95"><Eye size={18} /> Ver Albarán</button>
                        <button onClick={() => handleDeleteBatchClick(order.batchId)} className="p-3 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-100 dark:border-slate-700 shadow-sm active:scale-95"><Trash2 size={18} /></button>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            {isSuperAdmin && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-600/30">
                    <Share2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white leading-none">Enlace de Registro</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comparte este enlace para que nuevos empleados se registren.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => {
                      const url = new URL(window.location.origin);
                      url.searchParams.set('register', 'true');
                      navigator.clipboard.writeText(url.toString());
                      alert('Enlace de registro copiado al portapapeles. ¡Ya puedes enviarlo!');
                    }}
                    className="w-full sm:w-auto px-6 py-3 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-bold rounded-xl border-2 border-blue-200 dark:border-blue-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 dark:hover:text-white transition-all active:scale-95 shadow-sm"
                  >
                    Copiar Enlace
                  </button>
                </div>
              </div>
            )}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Gestión de</span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                    Registrar <span className="text-red-600 dark:text-red-500 italic">Empleado</span>
                  </h2>
                </div>
              </div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Nombre" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 shadow-sm" required />
                  <input type="password" placeholder="PIN" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} className="p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 shadow-sm" required />
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 shadow-sm appearance-none">
                    <option value={UserRole.STAFF}>Personal</option><option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
                 {newUser.role === UserRole.STAFF && (
                  <div className="pt-2">
                    <label className="flex items-center gap-3 p-3 border-2 border-transparent rounded-xl bg-gray-100 dark:bg-slate-800/60 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700"
                        checked={!!newUser.permissions?.includes('CAN_MANAGE_TASKS')}
                        onChange={e => {
                          const newPermissions = e.target.checked
                            ? ['CAN_MANAGE_TASKS']
                            : [];
                          setNewUser({ ...newUser, permissions: newPermissions as ('CAN_MANAGE_TASKS')[] });
                        }}
                      />
                      <span className="font-semibold text-gray-700 dark:text-slate-300">Permitir gestionar tareas (crear, editar, eliminar)</span>
                    </label>
                  </div>
                )}
                <button type="submit" className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-button-red flex items-center justify-center gap-2 active:scale-95"><Save size={18} /> Registrar</button>
              </form>
            </div>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-100 dark:border-slate-800 flex items-center justify-between hover:shadow-lg transition-shadow group">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${u.role === UserRole.ADMIN ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300'}`}>{u.name.charAt(0)}</div>
                    <div><h4 className="font-bold text-gray-900 dark:text-white">{u.name}</h4><p className="text-xs text-gray-500 dark:text-slate-400">{u.role} • PIN: ••••••••</p></div>
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
               {/* Quick Actions Header */}
               <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
                  <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Panel de Control</h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowClearNotificationsConfirm(true)}
                      disabled={notifications.length === 0}
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${notifications.length > 0 ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                    >
                      <Trash2 size={14} /> Limpiar Actividad
                    </button>
                  </div>
               </div>

               {/* KPI Dashboard Section */}
               <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-2xl text-green-600 dark:text-green-400 mb-3">
                      <TrendingUp size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Salud Stock</span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{healthPercentage}%</h4>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-600 dark:text-red-400 mb-3">
                      <ShieldAlert size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Críticos</span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{criticalProductsCount}</h4>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 mb-3">
                      <Activity size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Albaranes 24h</span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{recentOrdersCount}</h4>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group hover:scale-[1.02] transition-all">
                    <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl text-amber-600 dark:text-amber-400 mb-3">
                      <Zap size={24} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Eficiencia</span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-none">{managementEfficiency}%</h4>
                  </div>
               </div>

               <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800">
                 <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">
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
                              contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(4px)', border: '1px solid rgba(200, 200, 200, 0.5)', borderRadius: '1rem', color: '#333' }}
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
                      <div className="flex h-full items-center justify-center text-gray-400 dark:text-slate-500"><p>No hay datos de stock bajo.</p></div>
                    )}
                 </div>
               </div>

             
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-md border border-gray-100 dark:border-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <Activity size={20} className="text-red-600 dark:text-red-400" />
                    Cronograma de Actividad
                  </h3>
                  <div className="flex items-center gap-4">
                    {unreadNotificationsCount > 0 && (
                      <button onClick={handleMarkAllNotificationsAsRead} className="text-xs font-black text-blue-600 dark:text-blue-400 hover:opacity-80 transition-opacity flex items-center gap-1">
                        <CheckCircle2 size={14} /> Marcar todo como leído
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-6 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-slate-800">
                  {activityTimeline.length === 0 ? (
                    <div className="pl-12 py-8 text-gray-400 dark:text-slate-500 font-bold italic">No hay actividad reciente registrada.</div>
                  ) : (
                    activityTimeline.map((item, idx) => (
                      <div key={item.id} className={`relative pl-12 animate-fade-in group ${!item.read ? 'opacity-100' : 'opacity-70'}`} style={{ animationDelay: `${idx * 40}ms` }}>
                        <div className={`absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center z-10 border-4 border-white dark:border-slate-900 transition-transform group-hover:scale-110 ${item.color}`}>
                          <item.icon size={16} />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-black text-sm tracking-tight ${!item.read ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                {item.title}
                              </h4>
                              {!item.read && (
                                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-sm shadow-red-600/30"></span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                              {item.message}
                            </p>
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end shrink-0 gap-2">
                            <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase">
                              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {item.type === 'notification' && !item.read && (
                              <button 
                                onClick={() => handleMarkNotificationAsRead(item.id)}
                                className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                                title="Marcar como leída"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[9px] font-black text-slate-300 dark:text-slate-600 mt-2 uppercase tracking-widest">
                           {new Date(item.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
        )}
      </div>

      {/* Editing User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-pop-in animate-pop-in">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl text-gray-900 dark:text-white">Editar Usuario</h3><button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600"><X /></button></div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre de Usuario</label>
                <input type="text" placeholder="Usuario" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm font-bold" required />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Contraseña Nueva</label>
                <input type="password" placeholder="•••••••• (dejar vacío para no cambiar)" value={editingUser.pin.length === 64 ? '' : editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Rol del Sistema</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm appearance-none font-bold">
                  <option value={UserRole.STAFF}>Personal</option><option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              {editingUser.role === UserRole.STAFF && (
                <div className="pt-2">
                    <label className="flex items-center gap-3 p-3 border-2 border-transparent rounded-xl bg-gray-100 dark:bg-slate-800/60 cursor-pointer">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700"
                            checked={!!editingUser.permissions?.includes('CAN_MANAGE_TASKS')}
                            onChange={e => {
                                const newPermissions = e.target.checked ? ['CAN_MANAGE_TASKS'] : [];
                                setEditingUser({ ...editingUser, permissions: newPermissions as ('CAN_MANAGE_TASKS')[] });
                            }}
                        />
                        <span className="font-semibold text-gray-700 dark:text-slate-300">Puede gestionar tareas</span>
                    </label>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-6">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Cancelar</button>
              <button onClick={handleUpdateUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {batchToDelete && (
         <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-pop-in animate-pop-in">
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">¿Eliminar Albarán?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Se eliminará el albarán <span className="font-bold text-gray-800 dark:text-slate-200">#{batchToDelete}</span>. Esta acción no se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={() => setBatchToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95">Cancelar</button>
              <button onClick={confirmDeleteBatch} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {showClearNotificationsConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-pop-in p-6 animate-pop-in border border-gray-100 dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Limpiar Registro?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">Esta acción eliminará permanentemente <strong>todas</strong> las notificaciones y registros de actividad.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearNotificationsConfirm(false)} disabled={isClearing} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleClearAllNotifications} disabled={isClearing} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98] flex items-center justify-center gap-2">
                {isClearing ? <Loader2 className="animate-spin" /> : 'Sí, Limpiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-[100dvh] w-screen">
          
          <div className="flex-none bg-slate-900 border-b border-slate-800 z-50 pt-[max(env(safe-area-inset-top),16px)] pb-3 px-4 shadow-xl">
             <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
                <h2 className="text-white font-bold text-lg hidden md:block">Vista Previa</h2>
                {/* Space for mobile back/close visual balance if needed */}
                <div className="md:hidden"></div> 

                <div className="flex gap-2 ml-auto">
                      <button 
                        onClick={() => handleDeleteBatchClick(selectedOrder.batchId)}
                        className="p-2.5 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg font-bold flex items-center justify-center active:scale-95"
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    
                    <button 
                      onClick={handleSharePDF} 
                      disabled={isGeneratingPdf}
                      className="bg-green-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-green-900/40 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                      title="Compartir por WhatsApp"
                    >
                      {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                      <span className="hidden sm:inline">Compartir</span> 
                    </button>

                    <button 
                      onClick={handleDownloadPDF} 
                      disabled={isGeneratingPdf}
                      className="bg-red-600 text-white px-4 py-2.5 rounded-lg font-bold shadow-lg shadow-red-900/40 flex items-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                      {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
                      <span className="hidden sm:inline">{isGeneratingPdf ? 'Generando...' : 'PDF'}</span> 
                    </button>

                    <button 
                      onClick={() => setSelectedOrder(null)} 
                      className="p-2.5 bg-white text-black rounded-lg font-bold shadow-md hover:bg-gray-200 active:scale-95"
                    >
                      <X size={24} />
                    </button>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-900 p-4 pb-safe overscroll-contain">
            <div className="min-h-full flex flex-col items-center py-4">
                <div 
                  id="print-area" 
                  className="bg-white text-black w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()} 
                >
                  <OrderPdfDocument order={selectedOrder} preview={true} />
                </div>
                
                <p className="text-gray-500 text-xs mt-6 mb-12">Vista previa digital adaptada a pantalla.</p>
            </div>
          </div>
        </div>
      )}
      
      <PWAInstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </div>
  );
};

export default Admin;
import React, { useState, useEffect, useMemo } from 'react';
import { UserRole, User, Product, AppNotification, OrderBatch, AppLocation } from '../types';
import * as storageService from '../services/storageService';
import { Download, Users, Package, Trash2, Edit2, X, Save, Eye, Loader2, BarChart as BarChartIcon, BellRing, CheckCircle2, Share2, Smartphone, Activity, TrendingUp, ShieldAlert, Zap, Search, Filter, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { NotificationIcon } from '../components/NotificationIcon';
import { generatePdfFromReactComponent, sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { OrderPdfDocument } from '../components/OrderPdfDocument';
import { PWAInstallPrompt } from '../components/PWAInstallPrompt';
import { motion } from 'motion/react';

interface AdminProps {
  currentUser: User;
  unreadNotificationsCount: number;
  initialTab?: 'requests' | 'users' | 'reports';
}

const Admin: React.FC<AdminProps> = ({ currentUser, unreadNotificationsCount, initialTab = 'requests' }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'reports' | 'workspaces' | 'locations' | 'my_business' | 'super_admin'>(initialTab);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // My Business state
  const [myBusinessName, setMyBusinessName] = useState('');
  const [isSavingMyBusiness, setIsSavingMyBusiness] = useState(false);
  
  const [newUser, setNewUser] = useState({ name: '', role: UserRole.STAFF, contraseña: '', permissions: [] as ('CAN_MANAGE_TASKS')[] });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [notificationFilter, setNotificationFilter] = useState<'all' | 'unread'>('unread');

  // New states for clearing history
  const [showClearNotificationsConfirm, setShowClearNotificationsConfirm] = useState(false);
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Workspace state
  const [workspaces, setWorkspaces] = useState<storageService.Workspace[]>([]);
  const [editingWorkspace, setEditingWorkspace] = useState<storageService.Workspace | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<storageService.Workspace | null>(null);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceId, setNewWorkspaceId] = useState('');
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);

  // Super Admin state
  const [systemWorkspaces, setSystemWorkspaces] = useState<storageService.Workspace[]>([]);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState(false);

  // Location (Salones) state
  const [locations, setLocations] = useState<AppLocation[]>([]);

  const loadSystemWorkspaces = async () => {
    if (isSuperAdmin) {
      const data = await storageService.getOwnerWorkspaces(currentUser.email!);
      setSystemWorkspaces(data);
    }
  };

  const handleUpdateSubscription = async (wsId: string, status: 'TRIAL' | 'ACTIVE' | 'EXPIRED', addDays: number) => {
    setIsUpdatingSubscription(true);
    try {
      const ws = systemWorkspaces.find(w => w.id === wsId);
      let newEnd = ws?.subscriptionEndsAt || Date.now();
      if (newEnd < Date.now()) newEnd = Date.now(); // If expired, start from now
      
      const newEndsAt = newEnd + (addDays * 24 * 60 * 60 * 1000);
      await storageService.updateWorkspaceSubscription(wsId, { status, subscriptionEndsAt: newEndsAt });
      await loadSystemWorkspaces();
      alert('Suscripción actualizada.');
    } catch (error) {
      console.error(error);
      alert('Error al actualizar la suscripción.');
    } finally {
      setIsUpdatingSubscription(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'super_admin') {
      loadSystemWorkspaces();
    }
  }, [activeTab]);
  const [editingLocation, setEditingLocation] = useState<AppLocation | null>(null);
  const [locationToDelete, setLocationToDelete] = useState<AppLocation | null>(null);
  const [showCreateLocationModal, setShowCreateLocationModal] = useState(false);
  const [newLocationName, setNewLocationName] = useState('');
  const [isSavingLocation, setIsSavingLocation] = useState(false);

  const isSuperAdmin = storageService.auth.currentUser?.email === storageService.SUPER_ADMIN_EMAIL;
  const isAdmin = currentUser.role === UserRole.ADMIN || !!currentUser.isSuperAdmin || isSuperAdmin;
  const isOwner = !!currentUser.isSuperAdmin || isSuperAdmin;

  const loadWorkspaces = async () => {
    if (isOwner && storageService.auth.currentUser?.email) {
      const data = await storageService.getOwnerWorkspaces(storageService.auth.currentUser.email);
      setWorkspaces(data);
    }
  };

  useEffect(() => {
    if (activeTab === 'workspaces') {
      loadWorkspaces();
    }
  }, [activeTab, isOwner]);

  useEffect(() => {
    const loadMyBusiness = async () => {
      if (activeTab === 'my_business') {
        const wsId = storageService.activeWorkspaceId;
        if (wsId) {
          const ws = await storageService.getWorkspace(wsId);
          if (ws && ws.name) {
            setMyBusinessName(ws.name);
          }
        }
      }
    };
    loadMyBusiness();
  }, [activeTab]);

  const handleSaveMyBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myBusinessName.trim()) return;
    const wsId = storageService.activeWorkspaceId;
    if (!wsId) return;

    setIsSavingMyBusiness(true);
    try {
      await storageService.updateWorkspace(wsId, myBusinessName.trim());
      storageService.setActiveWorkspaceId(wsId, myBusinessName.trim());
      window.dispatchEvent(new CustomEvent('workspaceNameChanged', { detail: myBusinessName.trim() }));
      alert('Nombre del negocio actualizado correctamente. Se reflejará de inmediato en los documentos y menú.');
    } catch (error) {
      console.error(error);
      alert('Error al guardar el nombre del negocio');
    } finally {
      setIsSavingMyBusiness(false);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    // If not admin and on users tab, move to requests
    if (!isAdmin && activeTab === 'users') {
      setActiveTab('requests');
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    const unsubOrders = storageService.subscribeToBatches(setOrders);
    const unsubUsers = storageService.subscribeToUsers(setUsers);
    const unsubProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setIsLoading(false);
    });
    const unsubNotifications = storageService.subscribeToNotifications(setNotifications, false);
    const unsubLocations = storageService.subscribeToLocations(setLocations);
    
    // Check for auto-cleanup when admin dashboard loads
    storageService.checkAutoCleanup();
    // Ensure admin session doc exists for Firestore security rules
    storageService.ensureAdminSession(currentUser);
    
    return () => {
        unsubOrders();
        unsubUsers();
        unsubProducts();
        unsubNotifications();
        unsubLocations();
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
    if (newUser.name && newUser.contraseña) {
      storageService.addUser({
        name: newUser.name,
        role: newUser.role,
        contraseña: newUser.contraseña,
        isSuperAdmin: false, // Default to false for UI addition
        permissions: newUser.role === UserRole.STAFF ? newUser.permissions : undefined
      });
      setNewUser({ name: '', role: UserRole.STAFF, contraseña: '', permissions: [] });
    }
  };

  const handleUpdateUser = () => {
    if (editingUser && editingUser.name) {
      const userToUpdate = { ...editingUser };
      
      // If contraseña is empty, it means we don't want to change it. 
      // But we need to make sure we don't overwrite the existing hash with empty string.
      if (!userToUpdate.contraseña) {
        // Find the original user to get current password hash
        const original = users.find(u => u.id === editingUser.id);
        if (original) userToUpdate.contraseña = original.contraseña;
      }

      if (userToUpdate.role === UserRole.ADMIN) {
        userToUpdate.permissions = [];
      }
      storageService.updateUser(userToUpdate);
      setEditingUser(null);
    }
  };

  const handleDeleteUserClick = (user: User) => {
    if (user.id === currentUser.id) { alert("No puedes eliminar tu propio usuario."); return; }
    setUserToDelete(user);
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      storageService.deleteUser(userToDelete.id);
      setUserToDelete(null);
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

  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      await storageService.clearAllReplenishmentRequests();
      setOrders([]);
      setShowClearHistoryConfirm(false);
    } catch (error) {
      console.error("Error clearing history:", error);
      alert('Error al limpiar el historial de albaranes.');
    } finally {
      setIsClearing(false);
    }
  };

  const lowStockData = useMemo(() => products
    .filter(p => p.quantity <= p.minThreshold * 2)
    .map(p => ({ name: p.name, stock: p.quantity, min: p.minThreshold }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10), [products]);

  // New KPI Calculations
  const stats = useMemo(() => {
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

    return { totalProducts, criticalProductsCount, healthPercentage, recentOrdersCount, managementEfficiency };
  }, [products, orders, notifications]);

  const { totalProducts, criticalProductsCount, healthPercentage, recentOrdersCount, managementEfficiency } = stats;

  // Consolidated Activity Timeline
  const activityTimeline = useMemo(() => {
    const timelineItems = notifications
      .map(n => ({
        id: n.id,
        type: 'notification' as const,
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
        icon: n.icon === 'AlertTriangle' ? ShieldAlert : 
              (n.icon === 'PackagePlus' ? Package : 
              (n.icon === 'ShieldAlert' ? ShieldAlert :
              (n.icon === 'Trash2' ? Trash2 : 
              (n.icon === 'Plus' ? Zap : 
              (n.icon === 'CheckCircle2' ? CheckCircle2 : Activity))))),
        color: n.readStatus 
          ? 'text-slate-400 bg-slate-50 dark:bg-slate-800/50' 
          : (n.icon === 'ShieldAlert' 
              ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' 
              : (n.icon === 'CheckCircle2'
                  ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                  : 'text-red-600 bg-red-50 dark:bg-red-900/20')),
        read: n.readStatus
      }));

    return timelineItems
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 30);
  }, [notifications]);

  const filteredNotifications = useMemo(() => notificationFilter === 'unread'
    ? notifications.filter(n => !n.readStatus)
    : notifications, [notifications, notificationFilter]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWorkspace) return;
    try {
      await storageService.updateWorkspace(editingWorkspace.id, editingWorkspace.name);
      await loadWorkspaces();
      setEditingWorkspace(null);
    } catch (error) {
      console.error(error);
      alert('Error al actualizar salón');
    }
  };

  const handleConfirmDeleteWorkspace = async () => {
    if (!workspaceToDelete) return;
    if (workspaceToDelete.id === storageService.activeWorkspaceId) {
      alert('No puedes eliminar el salón en el que estás actualmente.');
      setWorkspaceToDelete(null);
      return;
    }
    try {
      await storageService.deleteWorkspace(workspaceToDelete.id);
      await loadWorkspaces();
      setWorkspaceToDelete(null);
    } catch (error) {
      console.error(error);
      alert('Error al eliminar salón');
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim() || !newWorkspaceId.trim()) return;
    const ownerEmail = storageService.auth.currentUser?.email;
    if (!ownerEmail) {
      alert('Error: No se encontró el correo del propietario.');
      return;
    }

    const idToUse = newWorkspaceId.trim().toLowerCase();
    if (!/^[a-z0-9\-]+$/.test(idToUse)) {
      alert('El código del salón solo puede contener letras minúsculas, números y guiones.');
      return;
    }

    setIsCreatingWorkspace(true);
    try {
      const exists = await storageService.checkWorkspaceExists(idToUse);
      if (exists) {
        alert('Este código de salón ya está registrado por otro negocio. Elige un código único.');
        setIsCreatingWorkspace(false);
        return;
      }

      await storageService.createWorkspace(idToUse, newWorkspaceName.trim(), ownerEmail);
      await loadWorkspaces();
      
      setNewWorkspaceName('');
      setNewWorkspaceId('');
      setShowCreateWorkspaceModal(false);
    } catch (error) {
      console.error(error);
      alert('Error al crear el salón.');
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameToSave = editingLocation ? editingLocation.name : newLocationName;
    if (!nameToSave.trim()) return;
    setIsSavingLocation(true);
    try {
      await storageService.saveLocation({
        id: editingLocation?.id || nameToSave.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: nameToSave.trim()
      });
      setShowCreateLocationModal(false);
      setEditingLocation(null);
      setNewLocationName('');
    } catch (error) {
      console.error(error);
      alert('Error al guardar salón');
    } finally {
      setIsSavingLocation(false);
    }
  };

  const confirmDeleteLocation = async () => {
    if (!locationToDelete) return;
    try {
      await storageService.deleteLocation(locationToDelete.id);
      setLocationToDelete(null);
    } catch (error) {
      console.error(error);
      alert('Error al eliminar salón');
    }
  };

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="transition-colors duration-300 min-h-screen pb-24 bg-gray-50 dark:bg-slate-950">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b dark:border-slate-800 sticky top-[var(--header-h)] z-30 shadow-md transition-all duration-300">
        <div className="flex overflow-x-auto no-scrollbar max-w-7xl mx-auto">
          <button onClick={() => setActiveTab('requests')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-wider ${activeTab === 'requests' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Historial</button>
          <button onClick={() => setActiveTab('reports')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 relative uppercase tracking-wider ${activeTab === 'reports' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>
            Reportes
            {unreadNotificationsCount > 0 && (
                <span className="absolute top-2 right-1 md:right-4 w-4 h-4 md:w-5 md:h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] md:text-xs font-bold ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadNotificationsCount}
                </span>
            )}
          </button>
          {isAdmin && (
            <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-wider ${activeTab === 'users' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Personal</button>
          )}
          {isAdmin && (
            <button onClick={() => setActiveTab('my_business')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-wider ${activeTab === 'my_business' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Mi Negocio</button>
          )}
          {isOwner && (
            <button onClick={() => setActiveTab('workspaces')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-wider ${activeTab === 'workspaces' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Negocios</button>
          )}
          {isAdmin && (
            <button onClick={() => setActiveTab('locations')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-wider ${activeTab === 'locations' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400 bg-red-50 dark:bg-red-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Salones</button>
          )}
          {isSuperAdmin && (
            <button onClick={() => setActiveTab('super_admin')} className={`flex-1 min-w-[100px] py-4 text-[11px] md:text-sm font-black border-b-2 transition-colors duration-200 uppercase tracking-wider ${activeTab === 'super_admin' ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/10 shadow-inner' : 'border-transparent text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/50'}`}>Sistema</button>
          )}
        </div>
      </div>

      <div className="p-4 transition-colors duration-300">
        {activeTab === 'requests' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Registro de</span>
                <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                  Historial de <span className="text-red-600 dark:text-red-500 italic">Albaranes</span>
                </h2>
              </div>
              
              <button
                onClick={() => setShowClearHistoryConfirm(true)}
                disabled={orders.length === 0}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black transition-all shadow-lg text-xs uppercase tracking-wider border ${
                  orders.length > 0 
                  ? 'bg-red-600 hover:bg-black text-white border-red-500 shadow-red-600/20 active:scale-95 animate-pulse-slow' 
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                }`}
              >
                <Trash2 size={14} /> Limpiar Historial
              </button>
            </div>
            <div className="space-y-4">
               {orders.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600"><Package size={40} className="mx-auto mb-2 opacity-50" /><p>No hay albaranes registrados.</p></div>}
               <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {orders.map((order) => (
                    <div key={order.batchId} className="bg-white dark:bg-slate-900 rounded-2xl shadow-md border border-gray-100 dark:border-slate-800 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-500/50 dark:hover:border-red-500/50 hover:shadow-lg transition-all group">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] md:text-xs font-black px-2 py-1 rounded uppercase tracking-tighter md:tracking-wider border border-red-100 dark:border-red-900/30 break-words max-w-full">{order.departmentName}</span>
                          <span className="text-[10px] md:text-xs text-gray-400 dark:text-slate-500 font-mono">{order.date}</span>
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
                  <input type="password" placeholder="Contraseña" value={newUser.contraseña} onChange={e => setNewUser({...newUser, contraseña: e.target.value})} className="p-3 border-2 border-gray-200 dark:border-slate-700 rounded-xl bg-gray-100 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 dark:focus:ring-red-500/50 shadow-sm" required />
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
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 dark:text-white">{u.name}</h4>
                        {u.isSuperAdmin && (
                          <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-black px-1.5 py-0.5 rounded uppercase border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <ShieldAlert size={10} /> Creador
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{u.role} • Contraseña: ••••••••</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingUser(u)} className="p-2 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-colors shadow-sm"><Edit2 size={18} /></button>
                    {u.id !== currentUser.id && <button onClick={() => handleDeleteUserClick(u)} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 active:scale-95 transition-colors shadow-sm"><Trash2 size={18} /></button>}
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black transition-all ${
                        notifications.length > 0 
                        ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-100' 
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed border border-gray-100'
                      }`}
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
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-2">Salud Almacén</span>
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
                   <BarChartIcon size={20} className="text-red-600 dark:text-red-400" /> Top 10 Productos en Almacén Crítico
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
                          <Bar dataKey="stock" name="Almacén Actual" radius={[4, 4, 0, 0]}>
                              {lowStockData.map((entry: any, index: number) => (
                                  <Cell key={`cell-${index}`} fill={entry.stock <= entry.min ? '#dc2626' : '#f59e0b'} />
                              ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-400 dark:text-slate-500"><p>No hay datos de almacén bajo.</p></div>
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
                    activityTimeline.map((item: any, idx: number) => (
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

        {activeTab === 'my_business' && isAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Configuración de Mi Negocio</h2>
                <p className="text-xs text-slate-400 px-2 mt-0.5 font-medium">Personaliza el nombre de tu aplicación</p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-slate-800">
              <div className="max-w-xl mb-8 pb-8 border-b border-gray-100 dark:border-slate-800">
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Código de Salón (Para Personal)</label>
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700/50">
                  <code className="text-lg font-black text-red-600 dark:text-red-400 select-all">{storageService.activeWorkspaceId}</code>
                </div>
                <p className="text-xs text-slate-400 mt-2 ml-1 font-medium">
                  Comparte este código con tu personal para que puedan iniciar sesión en este negocio.
                </p>
              </div>

              <form onSubmit={handleSaveMyBusiness} className="max-w-xl">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Nombre del Negocio (Marca blanca)</label>
                    <input 
                      type="text" 
                      placeholder="Ej. Mi Restaurante, Empresa SA..." 
                      className="w-full p-4 border-2 border-slate-200 dark:border-slate-700/50 rounded-2xl bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-white focus:border-amber-500 focus:bg-white dark:focus:bg-slate-800 outline-none transition-all"
                      value={myBusinessName}
                      onChange={e => setMyBusinessName(e.target.value)}
                      required
                    />
                    <p className="text-xs text-slate-400 mt-2 ml-1 font-medium">
                      Este nombre se mostrará en la cabecera principal de la aplicación para todos tus empleados.
                    </p>
                  </div>
                  
                  <div className="pt-4">
                    <button 
                      type="submit" 
                      disabled={isSavingMyBusiness || !myBusinessName.trim()}
                      className="w-full sm:w-auto px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-2xl font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingMyBusiness ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'workspaces' && isOwner && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Mis Salones / Negocios</h2>
                <p className="text-xs text-slate-400 px-2 mt-0.5 font-medium">Gestiona los salones de tu negocio o crea nuevos entornos</p>
              </div>
              <button 
                onClick={() => {
                  setNewWorkspaceName('');
                  setNewWorkspaceId(Math.random().toString(36).substring(2, 8).toLowerCase());
                  setShowCreateWorkspaceModal(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={16} strokeWidth={3} /> Nuevo Salón
              </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {workspaces.map(ws => (
                <div key={ws.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                  {ws.id === storageService.activeWorkspaceId && (
                     <div className="absolute top-0 left-0 w-full h-1 bg-green-500"></div>
                  )}
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white">{ws.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">ID: {ws.id}</p>
                    </div>
                    {ws.id === storageService.activeWorkspaceId && (
                      <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">Activo</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => setEditingWorkspace(ws)}
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex justify-center items-center gap-1"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    {ws.id !== storageService.activeWorkspaceId && (
                      <button 
                        onClick={() => setWorkspaceToDelete(ws)}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                        title="Eliminar Salón"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
               <h4 className="font-black text-blue-800 dark:text-blue-400 mb-2 flex items-center gap-2"><ShieldAlert size={18} /> Nota sobre Salones y Áreas</h4>
               <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                 Un <strong>Salón (Negocio)</strong> es un entorno completamente aislado con su propio inventario, usuarios y configuraciones. Puedes crear nuevos salones cerrando sesión y registrándolos desde la pantalla de login.
                 <br/><br/>
                 Para cambiar los nombres de las <strong>Áreas (Ej. Bar, Restaurante)</strong> dentro de este Salón, dirígete a la pestaña de <strong>Inventario</strong> y usa el botón de editar en la cabecera.
               </p>
            </div>
          </div>
        )}

        {activeTab === 'locations' && isAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Gestor de Salones (Espacios)</h2>
                <p className="text-xs text-slate-400 px-2 mt-0.5 font-medium">Configura los salones para Montajes y Reservas</p>
              </div>
              <button 
                onClick={() => {
                  setNewLocationName('');
                  setShowCreateLocationModal(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 text-xs font-black uppercase tracking-widest transition-all"
              >
                <Plus size={16} strokeWidth={3} /> Nuevo Salón
              </button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {locations.map(loc => (
                <div key={loc.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-wider">{loc.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={() => setEditingLocation(loc)}
                      className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors flex justify-center items-center gap-1 uppercase tracking-widest"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button 
                      onClick={() => setLocationToDelete(loc)}
                      className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                      title="Eliminar Salón"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {locations.length === 0 && (
                <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800">
                  <span className="text-gray-400 mb-2"><Search size={32} /></span>
                  <p className="text-sm font-bold text-gray-500">No hay salones configurados.</p>
                  <p className="text-xs text-gray-400 mt-1">Crea un salón (ej. Restaurante, Cafetería) para poder realizar reservas.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'super_admin' && isSuperAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-2">Panel del Sistema</h2>
                <p className="text-xs text-slate-400 px-2 mt-0.5 font-medium">Gestión de suscripciones de todos los clientes</p>
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {systemWorkspaces.map(ws => {
                const now = Date.now();
                const isExpired = ws.status === 'EXPIRED' || (ws.subscriptionEndsAt && ws.subscriptionEndsAt < now);
                const displayStatus = isExpired ? 'EXPIRED' : ws.status || 'ACTIVE';
                const remainingMs = ws.subscriptionEndsAt ? Math.max(0, ws.subscriptionEndsAt - now) : 0;
                const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
                const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

                return (
                <div key={ws.id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-wider">{ws.name}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">ID: {ws.id}</p>
                      <p className="text-xs text-slate-400 font-medium mt-1">{ws.ownerEmail}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      displayStatus === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      displayStatus === 'TRIAL' ? 'bg-blue-100 text-blue-700' :
                      displayStatus === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {displayStatus}
                    </span>
                  </div>
                  
                  <div className="text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl text-center border border-slate-100 dark:border-slate-800">
                    {ws.subscriptionEndsAt ? (
                      <>
                        <div className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">Vence: {new Date(ws.subscriptionEndsAt).toLocaleDateString()}</div>
                        {!isExpired && (
                          <div className="font-black text-slate-700 dark:text-slate-300">
                            {remainingDays > 0 ? `${remainingDays} días, ` : ''}{remainingHours} horas restantes
                          </div>
                        )}
                        {isExpired && (
                          <div className="font-black text-red-600 dark:text-red-400">
                            Suscripción Expirada
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="font-black text-slate-400 dark:text-slate-500 py-1">
                        Sin fecha de vencimiento configurada
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleUpdateSubscription(ws.id, 'TRIAL', 30)}
                        disabled={isUpdatingSubscription}
                        className="py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-colors uppercase tracking-widest disabled:opacity-50"
                      >
                        Dar 1 Mes
                      </button>
                      <button 
                        onClick={() => handleUpdateSubscription(ws.id, 'ACTIVE', 365)}
                        disabled={isUpdatingSubscription}
                        className="py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-bold hover:bg-green-100 transition-colors uppercase tracking-widest disabled:opacity-50"
                      >
                        Dar 1 Año
                      </button>
                    </div>
                    <button 
                      onClick={() => handleUpdateSubscription(ws.id, 'EXPIRED', 0)}
                      disabled={isUpdatingSubscription}
                      className="py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold hover:bg-red-100 transition-colors uppercase tracking-widest disabled:opacity-50"
                    >
                      Expirar Suscripción
                    </button>
                  </div>
                </div>
                );
              })}
              {systemWorkspaces.length === 0 && (
                <div className="col-span-full py-12 text-center flex flex-col items-center justify-center bg-gray-50/50 dark:bg-slate-900/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-800">
                  <p className="text-sm font-bold text-gray-500">No hay negocios registrados en el sistema.</p>
                </div>
              )}
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
                <input type="password" placeholder="•••••••• (dejar vacío para no cambiar)" value={editingUser.contraseña.length === 64 ? '' : editingUser.contraseña} onChange={e => setEditingUser({...editingUser, contraseña: e.target.value})} className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Rol del Sistema</label>
                <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm appearance-none font-bold">
                  <option value={UserRole.STAFF}>Personal</option><option value={UserRole.ADMIN}>Admin</option>
                </select>
              </div>
              {isSuperAdmin && (
                <div className="pt-2">
                    <label className="flex items-center gap-3 p-3 border-2 border-transparent rounded-xl bg-amber-50 dark:bg-amber-900/10 cursor-pointer border-dashed border-amber-200 dark:border-amber-800">
                        <input
                            type="checkbox"
                            className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 border-gray-300 dark:border-slate-600 bg-gray-200 dark:bg-slate-700"
                            checked={!!editingUser.isSuperAdmin}
                            onChange={e => setEditingUser({ ...editingUser, isSuperAdmin: e.target.checked })}
                        />
                        <div className="flex flex-col">
                          <span className="font-black text-amber-600 dark:text-amber-400 text-sm italic">Poder de Creador (Master)</span>
                          <span className="text-[10px] text-amber-500/70 font-medium leading-tight">Acceso total sin restricciones de seguridad. Solo el Creador Maestro puede otorgar este rango.</span>
                        </div>
                    </label>
                </div>
              )}
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
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Se eliminará el albarán <span className="font-bold text-gray-800 dark:text-slate-200">#{batchToDelete}</span>. Esta acción es permanente y los datos desaparecerán para siempre. ¿Estás seguro?</p>
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
            <p className="text-gray-500 dark:text-slate-400 mb-6">Esta acción es permanente y los datos desaparecerán para siempre. Eliminará todas las notificaciones. ¿Estás seguro?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearNotificationsConfirm(false)} disabled={isClearing} className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 active:scale-[0.98]">Cancelar</button>
              <button onClick={handleClearAllNotifications} disabled={isClearing} className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-button-red active:scale-[0.98] flex items-center justify-center gap-2">
                {isClearing ? <Loader2 className="animate-spin" /> : 'Sí, Limpiar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearHistoryConfirm && (
        <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-md p-8 text-center shadow-2xl animate-pop-in border border-red-100 dark:border-red-900/30">
            <div className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-600/40 relative">
               <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                 <Trash2 size={40} />
               </motion.div>
            </div>
            <h3 className="font-black text-2xl text-gray-900 dark:text-white uppercase tracking-tighter mb-2">¡LIMPIEZA TOTAL!</h3>
            <p className="text-gray-500 dark:text-slate-300 font-bold mb-8 leading-relaxed text-sm">
              Estás a punto de borrar <span className="text-red-600 font-black">TODO el historial</span> de albaranes del sistema. Esta acción NO se puede deshacer.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleClearHistory} 
                disabled={isClearing}
                className="w-full py-4 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isClearing ? <Loader2 className="animate-spin" size={24} /> : 'BORRAR TODO EL HISTORIAL'}
              </button>
              <button 
                onClick={() => setShowClearHistoryConfirm(false)}
                disabled={isClearing}
                className="w-full py-3 text-gray-400 dark:text-slate-500 font-bold hover:text-gray-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateWorkspaceModal && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">Crear Nuevo Salón</h3>
              <button onClick={() => setShowCreateWorkspaceModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Salón (Negocio)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Gastrobar El Sol" 
                  value={newWorkspaceName} 
                  onChange={e => {
                    const val = e.target.value;
                    setNewWorkspaceName(val);
                  }} 
                  className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm font-bold" 
                  required 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1 flex justify-between">
                  <span>Código de Salón</span>
                </label>
                <input 
                  type="text" 
                  placeholder="ej. sx9w3z" 
                  value={newWorkspaceId} 
                  onChange={e => setNewWorkspaceId(e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))} 
                  className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm font-mono font-bold text-xs" 
                  required 
                />
                <p className="text-[10px] text-slate-400 mt-1 px-1">
                  Este código sirve para identificar tu negocio de forma exclusiva. Cada salón mantiene su propio inventario y personal.
                </p>
              </div>

              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => setShowCreateWorkspaceModal(false)} 
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isCreatingWorkspace}
                  className="flex-1 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isCreatingWorkspace ? <Loader2 className="animate-spin" size={18} /> : 'Crear Salón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingWorkspace && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6 shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-xl text-gray-900 dark:text-white">Renombrar Salón</h3><button onClick={() => setEditingWorkspace(null)} className="text-gray-400 hover:text-gray-600"><X /></button></div>
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Salón</label>
                <input type="text" value={editingWorkspace.name} onChange={e => setEditingWorkspace({...editingWorkspace, name: e.target.value})} className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm font-bold" required />
              </div>
              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setEditingWorkspace(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95 transition-all">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {workspaceToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase">¿Eliminar Salón?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Se eliminará permanentemente el salón <span className="font-bold text-gray-800 dark:text-slate-200">{workspaceToDelete.name}</span> y TODOS sus datos asociados (inventario, usuarios). Esta acción NO se puede deshacer. ¿Estás seguro?</p>
            <div className="flex gap-4">
              <button onClick={() => setWorkspaceToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors">Cancelar</button>
              <button onClick={handleConfirmDeleteWorkspace} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95 transition-all">Eliminar TODO</button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase">¿Eliminar Usuario?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Se eliminará el usuario <span className="font-bold text-gray-800 dark:text-slate-200">{userToDelete.name}</span>. Esta acción es permanente y los datos desaparecerán para siempre. ¿Estás seguro?</p>
            <div className="flex gap-4">
              <button onClick={() => setUserToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors">Cancelar</button>
              <button onClick={confirmDeleteUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95 transition-all">Eliminar</button>
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
      
      {(showCreateLocationModal || editingLocation) && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md p-6 shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-xl text-gray-900 dark:text-white">{editingLocation ? 'Editar Salón' : 'Nuevo Salón'}</h3>
              <button onClick={() => { setShowCreateLocationModal(false); setEditingLocation(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300">
                <X />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Nombre del Salón (Espacio)</label>
                <input 
                  type="text" 
                  placeholder="Ej. Restaurante, Cafetería, Eventos..." 
                  value={editingLocation ? editingLocation.name : newLocationName} 
                  onChange={e => {
                    const val = e.target.value;
                    if (editingLocation) setEditingLocation({...editingLocation, name: val});
                    else setNewLocationName(val);
                  }} 
                  className="w-full p-3 border-2 border-slate-200 dark:border-slate-700/50 rounded-xl bg-slate-50 dark:bg-slate-800/60 dark:text-white outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 shadow-sm font-bold uppercase" 
                  required 
                />
              </div>

              <div className="flex gap-4 mt-6">
                <button 
                  type="button" 
                  onClick={() => { setShowCreateLocationModal(false); setEditingLocation(null); }} 
                  className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingLocation}
                  className="flex-1 py-3 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900 rounded-xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSavingLocation ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Salón'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {locationToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6 text-center shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md"><Trash2 size={32} /></div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white uppercase">¿Eliminar Salón?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4">Se eliminará permanentemente el salón <span className="font-bold text-gray-800 dark:text-slate-200">{locationToDelete.name}</span>. Las reservas y tareas asociadas a este salón podrían no mostrarse correctamente. Esta acción NO se puede deshacer.</p>
            <div className="flex gap-4">
              <button onClick={() => setLocationToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors">Cancelar</button>
              <button onClick={confirmDeleteLocation} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95 transition-all">Eliminar</button>
            </div>
          </div>
        </div>
      )}
      
      <PWAInstallPrompt isOpen={showInstallPrompt} onClose={() => setShowInstallPrompt(false)} />
    </div>
  );
};

export default Admin;
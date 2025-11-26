
import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, UploadedFile } from '../types';
import { storageService, OrderBatch } from '../services/storageService';
import { Download, Users, Package, Trash2, Edit2, Key, X, Save, Shield, Eye, FileDown, Upload, Database, AlertTriangle, Loader2, Image as ImageIcon, FileText, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Logo } from '../components/Logo';

interface AdminProps {
  currentUser: User;
}

const Admin: React.FC<AdminProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'data' | 'files'>('requests');
  
  // Data States
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  
  // New User Form State
  const [newUser, setNewUser] = useState({ name: '', role: UserRole.STAFF, pin: '' });
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // PDF Viewer State
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Image Preview State (Advanced Lightbox)
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Delete Confirmation State (Batches)
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);

  // Delete Confirmation State (Files)
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  // Restore State
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Data
  useEffect(() => {
    refreshData();
  }, [activeTab]);

  // Reset zoom when opening a new file
  useEffect(() => {
    setZoomLevel(1);
  }, [previewFile]);

  const refreshData = () => {
    setOrders(storageService.getBatches());
    setUsers(storageService.getUsers());
    setFiles(storageService.getFiles());
  };

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
      alert('La librería de PDF está cargando. Por favor espera unos segundos e intenta de nuevo.');
      return;
    }

    setIsGeneratingPdf(true);

    // Wait a brief moment for UI to update
    await new Promise(resolve => setTimeout(resolve, 100));

    const element = document.getElementById('print-area');
    
    // CONFIGURACIÓN DE ALTA CALIDAD PARA PDF (Hi-DPI)
    const opt = {
      margin: [10, 10, 10, 10], // Margen
      filename: `Pedido_${selectedOrder.batchId}_${selectedOrder.department}.pdf`,
      image: { type: 'png', quality: 0.98 }, // PNG es lossless (sin borrosidad).
      html2canvas: { 
        scale: 4, // 4x = ~400 DPI. Nítido para impresión.
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff', // Fondo blanco explícito
        windowWidth: 1200, // Simular escritorio para evitar columnas aplastadas
        letterRendering: true // Corrige kerning de fuentes
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    // @ts-ignore
    window.html2pdf().set(opt).from(element).save().then(() => {
      setIsGeneratingPdf(false);
    }).catch((err) => {
      console.error(err);
      setIsGeneratingPdf(false);
      alert('Hubo un error al generar el PDF.');
    });
  };

  const handleDeleteBatchClick = (batchId: string) => {
    setBatchToDelete(batchId);
  };

  const confirmDeleteBatch = () => {
    if (batchToDelete) {
      storageService.deleteBatch(batchToDelete);
      if (selectedOrder?.batchId === batchToDelete) {
        setSelectedOrder(null);
      }
      setBatchToDelete(null);
      refreshData();
    }
  };

  const handleDeleteFileClick = (fileId: string) => {
    setFileToDelete(fileId);
  };

  const confirmDeleteFile = () => {
    if (fileToDelete) {
      storageService.deleteFile(fileToDelete);
      setFileToDelete(null);
      // Close preview if the deleted file is currently open
      if (previewFile?.id === fileToDelete) {
        setPreviewFile(null);
      }
      refreshData();
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
      refreshData();
    }
  };

  const handleUpdateUser = () => {
    if (editingUser && editingUser.name && editingUser.pin) {
      storageService.updateUser(editingUser);
      setEditingUser(null);
      refreshData();
    }
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      alert("No puedes eliminar tu propio usuario.");
      return;
    }
    if (window.confirm('¿Seguro que quieres eliminar este usuario?')) {
      storageService.deleteUser(id);
      refreshData();
    }
  };

  // Backup & Restore Handlers
  const handleBackupDownload = () => {
    const data = storageService.createBackup();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_hotel_victoria_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRestoreBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        if (window.confirm('¡ADVERTENCIA! Al restaurar una copia de seguridad se SOBRESCRIBIRÁN todos los datos actuales (inventario, pedidos, usuarios). ¿Estás seguro?')) {
          const success = storageService.restoreBackup(content);
          if (success) {
            alert('Copia de seguridad restaurada con éxito. La página se recargará.');
            window.location.reload();
          } else {
            alert('Error al restaurar. El archivo parece dañado o incorrecto.');
          }
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Prepare Chart Data
  const products = storageService.getProducts();
  const lowStockData = products
    .filter(p => p.quantity <= p.minThreshold * 2) // Show items near threshold
    .map(p => ({ name: p.name, stock: p.quantity, min: p.minThreshold }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  if (currentUser.role !== UserRole.ADMIN) {
    return <div className="p-8 text-center text-red-600 dark:text-red-400">Acceso Denegado</div>;
  }

  return (
    <div className="pb-20 md:pb-6 transition-colors duration-300">
      {/* Admin Nav */}
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700/50 sticky top-0 z-10 transition-colors duration-300">
        <div className="flex overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 min-w-[120px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
          >
            Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('files')}
            className={`flex-1 min-w-[150px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'files' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
          >
            Archivos Subidos
          </button>
          <button 
            onClick={() => setActiveTab('data')}
            className={`flex-1 min-w-[120px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'data' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
          >
            Datos
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[120px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'users' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200'}`}
          >
            Usuarios
          </button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-900 min-h-[calc(100vh-140px)] transition-colors duration-300">
        
        {/* REQUESTS TAB (BATCH ORDERS) */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
             {orders.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700/50">
                  <Package size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No hay pedidos registrados.</p>
                </div>
              )}

             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {orders.map((order) => (
                  <div key={order.batchId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700/50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black px-2 py-1 rounded uppercase tracking-wider">
                          {order.department}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{order.date}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                        Pedido <span className="font-mono text-gray-500 dark:text-slate-400">#{order.batchId}</span>
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                        Solicitado por: <span className="font-bold text-gray-700 dark:text-slate-300">{order.requestedBy}</span>
                      </p>
                      <p className="text-sm font-semibold text-gray-600 dark:text-slate-400 mt-2 flex items-center gap-2">
                         <Package size={16} /> 
                         {order.items.reduce((acc, i) => acc + i.quantity, 0)} productos
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="flex-1 md:flex-none bg-gray-900 dark:bg-white dark:text-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-600 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-sm"
                      >
                        <Eye size={18} /> Ver Albarán
                      </button>
                      <button 
                        onClick={() => handleDeleteBatchClick(order.batchId)}
                        className="p-3 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-100 dark:border-slate-700/50"
                        title="Eliminar Pedido"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {/* FILES TAB - OPTIMIZED WITH EXPLICIT ACTIONS */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {files.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700/50">
                  <ImageIcon size={40} className="mx-auto mb-2 opacity-50" />
                  <p>No hay fotos ni archivos subidos por el personal.</p>
                </div>
              )}

             {files.map(file => (
              <div key={file.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 hover:shadow-md transition-all group overflow-hidden flex flex-col">
                <div 
                  className="aspect-video bg-gray-100 dark:bg-slate-700 relative cursor-pointer" 
                  onClick={() => file.type === 'image' && setPreviewFile(file)}
                >
                  {file.type === 'image' ? (
                    <img src={file.data} alt={file.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-500 dark:text-red-400">
                      <FileText size={48} />
                      <span className="text-xs font-bold mt-2 uppercase">PDF</span>
                    </div>
                  )}
                  
                  {/* Overlay Icon to indicate clickable */}
                  {file.type === 'image' && (
                     <div className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full backdrop-blur-sm shadow-sm pointer-events-none">
                        <Eye size={16} />
                     </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm mb-1" title={file.name}>{file.name}</h3>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                       <span className="font-bold text-gray-700 dark:text-slate-300">{file.uploadedBy}</span>
                    </p>
                    <span className="text-[10px] text-gray-400">{file.date.split(',')[0]}</span>
                  </div>

                  {/* Action Buttons - Always Visible (Mobile Friendly) */}
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-slate-700/50">
                     {file.type === 'image' && (
                       <button 
                         onClick={() => setPreviewFile(file)}
                         className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                         title="Ver"
                       >
                         <Eye size={18} />
                       </button>
                     )}
                     
                     <a 
                       href={file.data} 
                       download={file.name} 
                       className="flex-1 py-2 bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                       title="Descargar"
                     >
                       <Download size={18} />
                     </a>
                     
                     <button 
                       onClick={() => handleDeleteFileClick(file.id)} 
                       className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                       title="Eliminar"
                     >
                       <Trash2 size={18} />
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DATA & REPORTS TAB */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            {/* Chart */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Stock Crítico</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lowStockData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    />
                    <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                      {lowStockData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.stock <= entry.min ? '#ef4444' : '#f59e0b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-center text-gray-500 dark:text-slate-500 mt-2">Productos con stock bajo o cercano al mínimo</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               {/* CSV Reports */}
               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700/50 space-y-4">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                     <FileDown size={20} className="text-blue-500" /> Reportes CSV
                  </h4>
                  <button 
                    onClick={storageService.downloadStockCSV}
                    className="w-full bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-colors"
                  >
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Inventario Completo</span>
                    <Download size={18} className="text-gray-400 group-hover:text-blue-500" />
                  </button>
                  <button 
                    onClick={storageService.downloadRequestsCSV}
                    className="w-full bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 group transition-colors"
                  >
                    <span className="text-sm font-bold text-gray-600 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">Historial de Pedidos</span>
                    <Download size={18} className="text-gray-400 group-hover:text-blue-500" />
                  </button>
               </div>

               {/* Backup & Restore */}
               <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700/50 space-y-4">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                     <Database size={20} className="text-purple-500" /> Copia de Seguridad
                  </h4>
                  <button 
                    onClick={handleBackupDownload}
                    className="w-full bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-900/20 group transition-colors"
                  >
                    <div className="text-left">
                       <span className="block text-sm font-bold text-gray-600 dark:text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400">Descargar Copia</span>
                       <span className="text-xs text-gray-400">Guarda todos los datos en un archivo seguro</span>
                    </div>
                    <Download size={18} className="text-gray-400 group-hover:text-purple-500" />
                  </button>

                  <div className="relative">
                    <input 
                       type="file" 
                       accept=".json"
                       ref={fileInputRef}
                       onChange={handleRestoreBackup}
                       className="hidden"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full bg-gray-50 dark:bg-slate-700/50 p-4 rounded-xl flex items-center justify-center hover:bg-orange-50 dark:hover:bg-orange-900/20 group transition-colors"
                    >
                        <div className="text-left w-full flex items-center justify-between">
                            <div>
                                <span className="block text-sm font-bold text-gray-600 dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-orange-400">Restaurar Copia</span>
                                <span className="text-xs text-gray-400">Carga un archivo .json de respaldo</span>
                            </div>
                            <Upload size={18} className="text-gray-400 group-hover:text-orange-500" />
                        </div>
                    </button>
                  </div>
               </div>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            {/* Create User Card */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 mb-6">
              <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white">
                <Users className="text-red-600 dark:text-red-400" size={24} />
                <h3 className="font-bold text-lg">Registrar Nuevo Empleado</h3>
              </div>
              
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input 
                    type="text" 
                    placeholder="Nombre y Apellidos" 
                    value={newUser.name}
                    onChange={e => setNewUser({...newUser, name: e.target.value})}
                    className="p-3 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-white focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-400 dark:placeholder-slate-500"
                    required
                  />
                  <div className="relative">
                     <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                     <input 
                      type="text" 
                      placeholder="Contraseña / PIN" 
                      value={newUser.pin}
                      onChange={e => setNewUser({...newUser, pin: e.target.value})}
                      className="w-full p-3 pl-10 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-white focus:ring-2 focus:ring-red-500 outline-none placeholder-gray-400 dark:placeholder-slate-500"
                      required
                    />
                  </div>
                  <select 
                    value={newUser.role}
                    onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="p-3 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value={UserRole.STAFF}>Camarero / Staff</option>
                    <option value={UserRole.ADMIN}>Administrador</option>
                  </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2">
                  <Save size={18} /> Registrar Usuario
                </button>
              </form>
            </div>

            {/* Users List */}
            <div className="space-y-3">
              <h3 className="font-bold text-gray-700 dark:text-slate-300 ml-1">Usuarios Activos</h3>
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        {u.name}
                        {u.id === currentUser.id && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">Tú</span>}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-500 flex items-center gap-2">
                        <span>{u.role === UserRole.ADMIN ? 'Administrador' : 'Personal'}</span>
                        <span className="w-1 h-1 bg-gray-300 dark:bg-slate-600 rounded-full"></span>
                        <span className="flex items-center gap-1"><Key size={10} /> {u.pin}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setEditingUser(u)}
                      className="p-2 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      title="Editar Usuario"
                    >
                      <Edit2 size={18} />
                    </button>
                    
                    {u.id !== currentUser.id && (
                      <button 
                        onClick={() => handleDeleteUser(u.id)}
                        className="p-2 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        title="Eliminar Usuario"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-transparent dark:border-slate-700/50">
            <div className="bg-gray-50 dark:bg-slate-700/30 px-6 py-4 border-b border-gray-100 dark:border-slate-700/50 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">Editar Usuario</h3>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Nombre</label>
                <input 
                  type="text" 
                  value={editingUser.name}
                  onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                  className="w-full p-3 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Contraseña / PIN</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <input 
                    type="text" 
                    value={editingUser.pin}
                    onChange={e => setEditingUser({...editingUser, pin: e.target.value})}
                    className="w-full p-3 pl-10 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:border-slate-600/50 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-red-500 outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">Rol de Acceso</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setEditingUser({...editingUser, role: UserRole.STAFF})}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${editingUser.role === UserRole.STAFF ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <Users size={20} />
                    <span className="text-xs font-bold">Personal</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setEditingUser({...editingUser, role: UserRole.ADMIN})}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${editingUser.role === UserRole.ADMIN ? 'border-red-600 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : 'border-gray-200 dark:border-slate-700/50 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                  >
                    <Shield size={20} />
                    <span className="text-xs font-bold">Admin</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-3 text-gray-600 dark:text-slate-400 font-medium bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleUpdateUser}
                  className="flex-1 py-3 text-white font-bold bg-red-600 rounded-xl hover:bg-red-700 shadow-md transition-colors flex items-center justify-center gap-2"
                >
                  <Save size={18} /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE BATCH CONFIRMATION MODAL (High Z-Index) */}
      {batchToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-slide-up border border-transparent dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Pedido?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Esta acción borrará el pedido <b>#{batchToDelete}</b> permanentemente del registro.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setBatchToDelete(null)}
                className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteBatch}
                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE FILE CONFIRMATION MODAL */}
      {fileToDelete && (
        <div className="fixed inset-0 bg-black/60 dark:bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm shadow-2xl p-6 animate-slide-up border border-transparent dark:border-slate-700/50 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2">¿Eliminar Archivo?</h3>
            <p className="text-gray-500 dark:text-slate-400 mb-6">
              Esta acción borrará el archivo permanentemente.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setFileToDelete(null)}
                className="flex-1 py-3 font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700/50 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDeleteFile}
                className="flex-1 py-3 font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ADVANCED IMAGE LIGHTBOX */}
      {previewFile && previewFile.type === 'image' && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in"
          onClick={() => setPreviewFile(null)}
        >
          {/* Lightbox Header */}
          <div className="flex justify-between items-center p-4 md:p-6 bg-black/40 text-white z-10" onClick={e => e.stopPropagation()}>
             <div>
               <h3 className="font-bold text-lg">{previewFile.name}</h3>
               <p className="text-xs text-gray-400">Subido por {previewFile.uploadedBy} • {previewFile.date}</p>
             </div>
             <button 
              onClick={() => setPreviewFile(null)} 
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
             >
               <X size={24} />
             </button>
          </div>

          {/* Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-hidden p-4 relative" onClick={e => e.stopPropagation()}>
             <img 
               src={previewFile.data} 
               alt={previewFile.name} 
               className="max-h-[85vh] max-w-[95vw] object-contain transition-transform duration-200 ease-out shadow-2xl rounded-lg"
               style={{ transform: `scale(${zoomLevel})` }}
             />
             
             {/* Simple Background Pattern for professionalism */}
             <div className="absolute inset-0 z-[-1] opacity-20" 
                  style={{ backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)', backgroundSize: '20px 20px' }}
             ></div>
          </div>

          {/* Lightbox Toolbar */}
          <div className="flex justify-center items-center gap-6 p-6 bg-black/40 z-10" onClick={e => e.stopPropagation()}>
             <div className="flex items-center gap-2 bg-gray-900/80 rounded-full px-4 py-2 border border-white/10">
               <button 
                 onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))}
                 className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
               >
                 <ZoomOut size={20} />
               </button>
               <span className="text-xs font-mono w-12 text-center text-gray-400">{Math.round(zoomLevel * 100)}%</span>
               <button 
                 onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))}
                 className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
               >
                 <ZoomIn size={20} />
               </button>
               <button 
                 onClick={() => setZoomLevel(1)}
                 className="p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors ml-2 border-l border-white/10 pl-3"
                 title="Reset Zoom"
               >
                 <Maximize size={18} />
               </button>
             </div>

             <a 
               href={previewFile.data} 
               download={previewFile.name}
               className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-colors shadow-lg shadow-red-900/20"
             >
               <Download size={18} /> <span className="hidden md:inline">Descargar Original</span>
             </a>
          </div>
        </div>
      )}

      {/* PDF / VISUALIZATION MODAL (Highest Z-Index) */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-[70] bg-gray-900/95 dark:bg-slate-950/98 backdrop-blur-md flex flex-col items-center justify-start p-0 md:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedOrder(null)} // Click background to close
        >
          
          {/* Controls Bar */}
          <div 
            className="w-full max-w-3xl flex flex-wrap justify-between items-center p-4 md:p-0 md:mb-6 sticky top-0 md:static bg-gray-900/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none z-20 gap-3 no-print border-b md:border-none border-white/10"
            onClick={(e) => e.stopPropagation()} 
          >
            <h2 className="text-white font-bold text-lg hidden md:block">Vista Previa</h2>
            
            <div className="flex gap-2 ml-auto w-full md:w-auto">
              {/* Only Download and Close buttons for clean UX */}
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPdf}
                className={`flex-1 md:flex-none bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-red-500 transition-all ${isGeneratingPdf ? 'opacity-75 cursor-wait' : ''}`}
              >
                {isGeneratingPdf ? (
                   <> <Loader2 size={20} className="animate-spin" /> Generando... </>
                ) : (
                   <> <FileDown size={20} /> <span className="md:hidden">Descargar</span> <span className="hidden md:inline">Descargar PDF</span> </>
                )}
              </button>

              <button 
                onClick={() => setSelectedOrder(null)} 
                className="bg-white text-gray-900 px-4 py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Printable Area - STRICT WHITE PAPER MODE */}
          <div 
             id="print-area"
             className="bg-white p-6 md:p-12 md:rounded-3xl shadow-2xl max-w-3xl w-full h-auto animate-slide-up relative overflow-visible"
             style={{ backgroundColor: '#ffffff', color: '#000000', minHeight: 'auto' }} // Inline styles for PDF generator
             onClick={(e) => e.stopPropagation()} 
          >
             {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-black pb-6 mb-6 gap-6 mt-4 md:mt-0">
              <div className="flex items-center gap-6">
                <Logo size="lg" solid={true} />
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tighter">Hotel Victoria</h1>
                  <p className="text-red-600 font-bold uppercase tracking-[0.3em] text-sm mt-1">Pedidos Internos</p>
                </div>
              </div>
              <div className="text-left md:text-right w-full md:w-auto mt-4 md:mt-0">
                <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                  <h2 className="text-xl md:text-2xl font-mono font-bold text-black">#{selectedOrder.batchId}</h2>
                </div>
                <p className="text-sm font-semibold text-gray-600 mt-2 uppercase tracking-wide">{selectedOrder.date}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-8 bg-gray-50 p-6 rounded-2xl border border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Departamento</p>
                <p className="text-xl md:text-2xl font-extrabold text-black">{selectedOrder.department}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Solicitante</p>
                <p className="text-xl md:text-2xl font-extrabold text-black">{selectedOrder.requestedBy}</p>
              </div>
            </div>

            {/* Table */}
            <div className="mb-12">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-black">
                    <th className="text-left py-4 text-sm font-black text-black uppercase tracking-wider">Producto</th>
                    <th className="text-center py-4 text-sm font-black text-black uppercase tracking-wider w-24 md:w-32">Cant.</th>
                    <th className="hidden md:table-cell text-right py-4 text-sm font-black text-black uppercase tracking-wider w-24">Unidad</th>
                    <th className="text-right py-4 text-sm font-black text-black uppercase tracking-wider w-16 md:w-20">Check</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-4 font-bold text-black text-base md:text-lg">
                        {item.productName}
                        <span className="md:hidden text-xs text-gray-500 block uppercase font-normal">{item.unit || 'ud.'}</span>
                      </td>
                      <td className="py-4 text-center">
                         <span className="font-black text-lg md:text-xl text-black bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">{item.quantity}</span>
                      </td>
                      <td className="hidden md:table-cell py-4 text-right text-gray-600 font-semibold text-sm uppercase">{item.unit || 'Ud.'}</td>
                      <td className="py-4 text-right">
                         <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-gray-300 rounded-lg inline-block"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Signatures */}
            <div className="grid grid-cols-2 gap-8 md:gap-16 mt-auto pt-12 border-t-2 border-gray-200 page-break-inside-avoid">
              <div className="text-center">
                 <div className="h-20 md:h-24 border-b-2 border-gray-300 mb-3 border-dashed"></div>
                 <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Firma Entregado (Almacén)</p>
              </div>
              <div className="text-center">
                 <div className="h-20 md:h-24 border-b-2 border-gray-300 mb-3 border-dashed"></div>
                 <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest">Firma Recibido ({selectedOrder.department})</p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Generado Digitalmente por Sistema Hotel Victoria</p>
            </div>

          </div>
           {/* Spacer for mobile scroll */}
           <div className="h-24 w-full md:hidden"></div>
        </div>
      )}

    </div>
  );
};

export default Admin;

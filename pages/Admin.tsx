import React, { useState, useEffect, useRef } from 'react';
import { UserRole, User, UploadedFile, Product } from '../types';
import { storageService, OrderBatch } from '../services/storageService';
import { Download, Users, Package, Trash2, Edit2, Key, X, Save, Shield, Eye, FileDown, Upload, Database, AlertTriangle, Loader2, Image as ImageIcon, FileText, ZoomIn, ZoomOut, Maximize, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Logo } from '../components/Logo';

interface AdminProps {
  currentUser: User;
}

const Admin: React.FC<AdminProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'data' | 'files'>('requests');
  
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newUser, setNewUser] = useState({ name: '', role: UserRole.STAFF, pin: '' });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [batchToDelete, setBatchToDelete] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Realtime subscriptions
    const unsubOrders = storageService.subscribeToBatches(setOrders);
    const unsubUsers = storageService.subscribeToUsers(setUsers);
    const unsubFiles = storageService.subscribeToFiles(setFiles);
    const unsubProducts = storageService.subscribeToProducts(setProducts);
    
    // Fake loading delay for initial render smoothening
    setTimeout(() => setLoading(false), 500);

    return () => {
        unsubOrders();
        unsubUsers();
        unsubFiles();
        unsubProducts();
    };
  }, []);

  useEffect(() => {
    setZoomLevel(1);
  }, [previewFile]);

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
      filename: `Pedido_${selectedOrder.batchId}_${selectedOrder.department}.pdf`,
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

  const handleDeleteFileClick = (fileId: string) => setFileToDelete(fileId);
  const confirmDeleteFile = () => {
    if (fileToDelete) {
      storageService.deleteFile(fileToDelete);
      setFileToDelete(null);
      if (previewFile?.id === fileToDelete) setPreviewFile(null);
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

  // Calculated from state instead of sync call
  const lowStockData = products
    .filter(p => p.quantity <= p.minThreshold * 2)
    .map(p => ({ name: p.name, stock: p.quantity, min: p.minThreshold }))
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 10);

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600">Acceso Denegado</div>;
  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="pb-20 md:pb-6 transition-colors duration-300">
      <div className="bg-white dark:bg-slate-800 border-b dark:border-slate-700/50 sticky top-0 z-10 transition-colors duration-300">
        <div className="flex overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveTab('requests')} className={`flex-1 min-w-[120px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'requests' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400'}`}>Pedidos</button>
          <button onClick={() => setActiveTab('files')} className={`flex-1 min-w-[150px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'files' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400'}`}>Archivos Subidos</button>
          <button onClick={() => setActiveTab('data')} className={`flex-1 min-w-[120px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'data' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400'}`}>Datos</button>
          <button onClick={() => setActiveTab('users')} className={`flex-1 min-w-[120px] py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'users' ? 'border-red-600 text-red-600 dark:text-red-400 dark:border-red-400' : 'border-transparent text-gray-500 dark:text-slate-400'}`}>Usuarios</button>
        </div>
      </div>

      <div className="p-4 bg-gray-50 dark:bg-slate-900 min-h-[calc(100vh-140px)] transition-colors duration-300">
        {activeTab === 'requests' && (
          <div className="space-y-4">
             {orders.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600"><Package size={40} className="mx-auto mb-2 opacity-50" /><p>No hay pedidos registrados.</p></div>}
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {orders.map((order) => (
                  <div key={order.batchId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700/50 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-red-200 dark:hover:border-red-900/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black px-2 py-1 rounded uppercase tracking-wider">{order.department}</span>
                        <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{order.date}</span>
                      </div>
                      <h3 className="font-bold text-gray-900 dark:text-white text-lg">Pedido <span className="font-mono text-gray-500 dark:text-slate-400">#{order.batchId}</span></h3>
                      <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Solicitado por: <span className="font-bold text-gray-700 dark:text-slate-300">{order.requestedBy}</span></p>
                      <p className="text-sm font-semibold text-gray-600 dark:text-slate-400 mt-2 flex items-center gap-2"><Package size={16} /> {order.items.reduce((acc, i) => acc + i.quantity, 0)} productos</p>
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <button onClick={() => setSelectedOrder(order)} className="flex-1 md:flex-none bg-gray-900 dark:bg-white dark:text-slate-900 text-white px-5 py-3 rounded-xl font-bold hover:bg-red-600 dark:hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 shadow-sm"><Eye size={18} /> Ver Albarán</button>
                      <button onClick={() => handleDeleteBatchClick(order.batchId)} className="p-3 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-100 dark:border-slate-700/50"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'files' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
             {files.length === 0 && <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600"><ImageIcon size={40} className="mx-auto mb-2 opacity-50" /><p>No hay fotos.</p></div>}
             {files.map(file => (
              <div key={file.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 hover:shadow-md transition-all group overflow-hidden flex flex-col">
                <div className="aspect-video bg-gray-100 dark:bg-slate-700 relative cursor-pointer" onClick={() => file.type === 'image' && setPreviewFile(file)}>
                  {file.type === 'image' ? <img src={file.data} alt={file.name} className="w-full h-full object-cover" /> : <div className="w-full h-full flex flex-col items-center justify-center text-red-500 dark:text-red-400"><FileText size={48} /><span className="text-xs font-bold mt-2 uppercase">PDF</span></div>}
                  {file.type === 'image' && <div className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full backdrop-blur-sm shadow-sm pointer-events-none"><Eye size={16} /></div>}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white truncate text-sm mb-1">{file.name}</h3>
                  <div className="flex justify-between items-center mb-4"><p className="text-xs text-gray-500 dark:text-slate-400"><span className="font-bold text-gray-700 dark:text-slate-300">{file.uploadedBy}</span></p><span className="text-[10px] text-gray-400">{file.date.split(',')[0]}</span></div>
                  <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-slate-700/50">
                     {file.type === 'image' && <button onClick={() => setPreviewFile(file)} className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"><Eye size={18} /></button>}
                     <a href={file.data} download={file.name} className="flex-1 py-2 bg-gray-50 dark:bg-slate-700/50 text-gray-600 dark:text-slate-300 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"><Download size={18} /></a>
                     <button onClick={() => handleDeleteFileClick(file.id)} className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center hover:bg-red-100 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50 mb-6">
              <div className="flex items-center gap-2 mb-4 text-gray-800 dark:text-white"><Users className="text-red-600 dark:text-red-400" size={24} /><h3 className="font-bold text-lg">Registrar Nuevo Empleado</h3></div>
              <form onSubmit={handleAddUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input type="text" placeholder="Nombre" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="p-3 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none" required />
                  <input type="text" placeholder="PIN" value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} className="p-3 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none" required />
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="p-3 border rounded-xl bg-gray-50 dark:bg-slate-700/50 dark:text-white outline-none">
                    <option value={UserRole.STAFF}>Personal</option><option value={UserRole.ADMIN}>Admin</option>
                  </select>
                </div>
                <button type="submit" className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold shadow-md flex items-center justify-center gap-2"><Save size={18} /> Registrar</button>
              </form>
            </div>
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700/50 flex items-center justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${u.role === UserRole.ADMIN ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>{u.name.charAt(0)}</div>
                    <div><h4 className="font-bold text-gray-800 dark:text-white">{u.name}</h4><p className="text-xs text-gray-500">{u.role} • PIN: {u.pin}</p></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setEditingUser(u)} className="p-2 text-blue-600 bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                    {u.id !== currentUser.id && <button onClick={() => handleDeleteUser(u.id)} className="p-2 text-red-600 bg-red-50 rounded-lg"><Trash2 size={18} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'data' && (
           <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700/50">
             <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Stock Crítico</h3>
             <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={lowStockData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="name" hide />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }} />
                    <Bar dataKey="stock" radius={[4, 4, 0, 0]}><Cell fill="#ef4444" /></Bar>
                  </BarChart>
                </ResponsiveContainer>
             </div>
           </div>
        )}
      </div>

      {/* MODALS (Edit User, Confirm Delete, Preview PDF, Lightbox) */}
      {editingUser && <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md p-6"><h3 className="font-bold text-lg mb-4 dark:text-white">Editar Usuario</h3><input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 mb-3 border rounded-xl dark:bg-slate-700/50 dark:text-white" /><input value={editingUser.pin} onChange={e => setEditingUser({...editingUser, pin: e.target.value})} className="w-full p-3 mb-3 border rounded-xl dark:bg-slate-700/50 dark:text-white" /><div className="flex gap-3"><button onClick={() => setEditingUser(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">Cancelar</button><button onClick={handleUpdateUser} className="flex-1 py-3 bg-red-600 text-white rounded-xl">Guardar</button></div></div></div>}
      
      {/* Lightbox */}
      {previewFile && previewFile.type === 'image' && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in" onClick={() => setPreviewFile(null)}>
          <div className="flex justify-between items-center p-4 bg-black/40 text-white z-10"><h3 className="font-bold">{previewFile.name}</h3><button onClick={() => setPreviewFile(null)}><X size={24} /></button></div>
          <div className="flex-1 flex items-center justify-center p-4"><img src={previewFile.data} className="max-h-[85vh] max-w-[95vw] object-contain transition-transform" style={{ transform: `scale(${zoomLevel})` }} /></div>
          <div className="flex justify-center items-center gap-6 p-6 bg-black/40 z-10" onClick={e => e.stopPropagation()}><button onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.25))} className="p-2 text-white"><ZoomOut /></button><button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} className="p-2 text-white"><ZoomIn /></button></div>
        </div>
      )}

      {/* PDF Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[70] bg-gray-900/95 flex flex-col items-center justify-start p-0 md:p-6 overflow-y-auto animate-fade-in" onClick={() => setSelectedOrder(null)}>
           <div className="w-full max-w-3xl flex justify-between items-center p-4 sticky top-0 bg-gray-900/80 backdrop-blur-md z-20" onClick={e => e.stopPropagation()}>
             <button onClick={handleDownloadPDF} disabled={isGeneratingPdf} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 disabled:bg-gray-600">{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</button>
             <button onClick={() => setSelectedOrder(null)} className="bg-white text-gray-900 px-4 py-3 rounded-xl font-bold"><X size={24} /></button>
           </div>
           
           {/* Printable Area */}
           <div 
             id="print-area" 
             className="bg-white text-black p-6 md:p-12 shadow-2xl max-w-3xl w-full h-auto relative overflow-visible" 
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
      {batchToDelete && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-800 rounded-3xl p-6 text-center"><h3 className="text-xl font-black mb-2 dark:text-white">¿Eliminar Pedido?</h3><div className="flex gap-3"><button onClick={() => setBatchToDelete(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">Cancelar</button><button onClick={confirmDeleteBatch} className="flex-1 py-3 bg-red-600 text-white rounded-xl">Eliminar</button></div></div></div>}
      
      {/* Confirm File Delete */}
      {fileToDelete && <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4"><div className="bg-white dark:bg-slate-800 rounded-3xl p-6 text-center"><h3 className="text-xl font-black mb-2 dark:text-white">¿Eliminar Archivo?</h3><div className="flex gap-3"><button onClick={() => setFileToDelete(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">Cancelar</button><button onClick={confirmDeleteFile} className="flex-1 py-3 bg-red-600 text-white rounded-xl">Eliminar</button></div></div></div>}

    </div>
  );
};

export default Admin;
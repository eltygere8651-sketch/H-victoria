import React, { useState, useEffect } from 'react';
import * as storageService from '../services/storageService';
import { User, UserRole, OrderBatch } from '../types';
import { FileText, Trash2, X, Eye, Package, Download, Loader2, Share2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { generatePdfFromReactComponent, sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { OrderPdfDocument } from '../components/OrderPdfDocument';
import { motion } from 'motion/react';


interface OrdersHistoryProps {
  currentUser: User;
}

const OrdersHistory: React.FC<OrdersHistoryProps> = ({ currentUser }) => {
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [showClearAllModal, setShowClearAllModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToBatches(setOrders);
    return () => unsubscribe();
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    setIsGeneratingPdf(true);
    try {
      const isIngreso = selectedOrder.departmentId === 'INGRESO' || selectedOrder.departmentName === 'Ingreso de Proveedor';
      const prefix = isIngreso ? 'Albaran_de_Entrega' : 'Pedido_Interno';
      const filename = `${prefix}_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`;
      // Pass preview=false to ensure PDF dimensions are enforced (A4 fixed width)
      await generatePdfFromReactComponent(<OrderPdfDocument order={selectedOrder} preview={false} />, filename);
    } catch (error) {
      console.error("PDF Generation Failed:", error);
      alert('Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.');
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
      alert('Hubo un error al compartir el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const confirmDelete = () => {
    if (orderToDelete) {
      storageService.deleteBatch(orderToDelete);
      if (selectedOrder?.batchId === orderToDelete) {
        setSelectedOrder(null);
      }
      setOrders(prev => prev.filter(o => o.batchId !== orderToDelete));
      setOrderToDelete(null);
    }
  };

  const handleClearAll = async () => {
    setIsClearing(true);
    try {
      await storageService.clearAllReplenishmentRequests();
      setOrders([]);
      setShowClearAllModal(false);
    } catch (error) {
      console.error("Error clearing history:", error);
      alert('Error al limpiar el historial.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-full pb-24 md:pb-6 font-sans transition-colors duration-300">
      
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 drop-shadow-sm">
            <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-xl shadow-sm"><FileText size={32} /></span>
            Historial de Albaranes
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-base mt-2 ml-1 drop-shadow-sm">Consulta y reimprime los albaranes anteriores</p>
        </div>

        {currentUser.role === UserRole.ADMIN && (
          <button
            onClick={() => setShowClearAllModal(true)}
            disabled={orders.length === 0}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black transition-all shadow-lg text-sm uppercase tracking-wider border-2 ${
              orders.length > 0 
                ? 'bg-red-600 hover:bg-black text-white border-red-500 shadow-red-600/30 active:scale-95 animate-pulse-slow' 
                : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
            }`}
          >
            <Trash2 size={18} /> Limpiar Historial
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {orders.map((order) => (
          <div key={order.batchId} className="bg-white dark:bg-slate-800 rounded-2xl shadow-card-soft dark:shadow-card-dark border border-gray-200 dark:border-slate-700/50 p-6 hover:shadow-xl dark:hover:shadow-red-900/20 dark:hover:border-slate-600 transition-all cursor-pointer group" onClick={() => setSelectedOrder(order)}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-black px-3 py-1.5 rounded-lg uppercase tracking-wider border border-red-100 dark:border-red-900/30 drop-shadow-sm">
                  {order.departmentName}
                </span>
                <h3 className="font-bold text-gray-900 dark:text-slate-200 mt-2 text-lg group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors drop-shadow-sm">{order.batchId}</h3>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide drop-shadow-sm">{order.date.split(',')[0]}</p>
                <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 drop-shadow-sm">{order.date.split(',')[1]}</p>
              </div>
            </div>
            
            <div className="mb-6 space-y-1">
              <p className="text-sm font-semibold text-gray-600 dark:text-slate-400 flex items-center gap-2 drop-shadow-sm">
                <Package size={16} className="text-gray-400 dark:text-slate-500" /> 
                <span className="text-gray-900 dark:text-white font-bold">{order.items.reduce((acc, item) => acc + item.quantity, 0)}</span> productos
              </p>
              <p className="text-sm text-gray-500 dark:text-slate-400 drop-shadow-sm">
                Solicitado por: <span className="font-bold text-gray-700 dark:text-slate-300">{order.requestedBy}</span>
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-gray-100 dark:border-slate-700/50 pt-4">
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedOrder(order); }}
                className="flex-1 bg-gray-900 dark:bg-slate-700 text-white text-sm font-bold py-3 rounded-xl hover:bg-red-600 dark:hover:bg-red-500 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-95"
              >
                <Eye size={18} /> Ver Albarán
              </button>
              
              {currentUser.role === UserRole.ADMIN && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setOrderToDelete(order.batchId); }}
                  className="p-3 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-100 dark:border-slate-700/50 hover:border-red-100 shadow-sm active:scale-95"
                  title="Eliminar Albarán"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div className="col-span-full py-20 text-center text-gray-400 dark:text-slate-600 bg-white dark:bg-slate-800 rounded-3xl border-2 border-dashed border-gray-200 dark:border-slate-700/50 shadow-lg">
            <div className="bg-gray-50 dark:bg-slate-700/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 shadow-md">
              <FileText size={40} className="opacity-40" />
            </div>
            <p className="text-xl font-bold text-gray-500 dark:text-slate-500 drop-shadow-sm">No hay albaranes registrados</p>
            <p className="text-sm mt-1 text-gray-400 drop-shadow-sm">Realiza un nuevo albarán para verlo aquí.</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-[100dvh] w-screen">
          
          <div className="flex-none bg-slate-900 border-b border-slate-800 z-50 pt-[max(env(safe-area-inset-top),16px)] pb-3 px-4 shadow-xl">
             <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
                <h2 className="text-white font-bold text-lg hidden md:block">Vista Previa</h2>
                {/* Space for mobile back/close visual balance if needed */}
                <div className="md:hidden"></div> 

                <div className="flex gap-2 ml-auto">
                    {currentUser.role === UserRole.ADMIN && (
                      <button 
                        onClick={() => setOrderToDelete(selectedOrder.batchId)}
                        className="p-2.5 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg font-bold flex items-center justify-center active:scale-95"
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    
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

          {/* Área de vista previa optimizada: sin scale, scroll nativo, fondo oscuro para contraste */}
          <div className="flex-1 overflow-y-auto bg-gray-900 p-4 pb-safe overscroll-contain">
            <div className="min-h-full flex flex-col items-center py-4">
                {/* Contenedor del documento responsive */}
                <div 
                  id="print-area" 
                  className="bg-white text-black w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()} 
                >
                  {/* Aquí renderizamos el componente en modo PREVIEW=true, que se adapta al ancho */}
                  <OrderPdfDocument order={selectedOrder} preview={true} />
                </div>
                
                <p className="text-gray-500 text-xs mt-6 mb-12">Vista previa digital adaptada a pantalla.</p>
            </div>
          </div>
        </div>
      )}

      {orderToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-sm p-6 text-center shadow-pop-in animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 dark:text-red-500 shadow-md animate-bounce-short"><Trash2 size={32} /></div>
            <h3 className="font-black text-xl text-gray-900 dark:text-white uppercase tracking-tight">¿Eliminar Albarán?</h3>
            <p className="text-gray-500 dark:text-slate-400 text-sm my-4 font-bold">Esta acción es permanente y los datos desaparecerán para siempre. ¿Estás seguro de eliminar el albarán <span className="text-red-600">#{orderToDelete}</span>?</p>
            <div className="flex gap-4">
              <button onClick={() => setOrderToDelete(null)} className="flex-1 py-3 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold active:scale-95 transition-colors">Cancelar</button>
              <button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-button-red active:scale-95 transition-all">ELIMINAR</button>
            </div>
          </div>
        </div>
      )}

      {showClearAllModal && (
        <div className="fixed inset-0 bg-black/80 z-[130] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md p-8 text-center shadow-2xl animate-pop-in border border-red-100 dark:border-red-900/30">
            <div className="w-24 h-24 bg-red-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-red-600/40 relative">
               <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                 <Trash2 size={48} />
               </motion.div>
            </div>
            <h3 className="font-black text-3xl text-gray-900 dark:text-white uppercase tracking-tighter mb-2">¡LIMPIEZA TOTAL!</h3>
            <p className="text-gray-500 dark:text-slate-300 font-bold mb-8 leading-relaxed">
              Estás a punto de borrar <span className="text-red-600 font-black">TODO el historial</span> de albaranes. Esta acción NO se puede deshacer y liberará espacio en el sistema.
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleClearAll} 
                disabled={isClearing}
                className="w-full py-5 bg-red-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-3"
              >
                {isClearing ? <Loader2 className="animate-spin" size={24} /> : 'SÍ, BORRAR TODO EL HISTORIAL'}
              </button>
              <button 
                onClick={() => setShowClearAllModal(false)}
                disabled={isClearing}
                className="w-full py-4 text-gray-400 dark:text-slate-500 font-bold hover:text-gray-600 dark:hover:text-slate-300 transition-colors uppercase tracking-widest text-sm"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersHistory;
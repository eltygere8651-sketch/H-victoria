import React, { useState, useEffect } from 'react';
import * as storageService from '../services/storageService';
import { User, UserRole, OrderBatch } from '../types';
import { FileText, Trash2, X, Eye, Package, Download, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';
import { generatePdfFromReactComponent } from '../utils/pdfGenerator';
import { OrderPdfDocument } from '../components/OrderPdfDocument';


interface OrdersHistoryProps {
  currentUser: User;
}

const OrdersHistory: React.FC<OrdersHistoryProps> = ({ currentUser }) => {
  const [orders, setOrders] = useState<OrderBatch[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderBatch | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const unsubscribe = storageService.subscribeToBatches(setOrders);
    return () => unsubscribe();
  }, []);

  const handleDownloadPDF = async () => {
    if (!selectedOrder) return;
    setIsGeneratingPdf(true);
    try {
      const filename = `Pedido_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`;
      await generatePdfFromReactComponent(<OrderPdfDocument order={selectedOrder} />, filename);
    } catch (error) {
      console.error("PDF Generation Failed:", error);
      alert('Hubo un error al generar el PDF. Por favor, inténtalo de nuevo.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDelete = (batchId: string) => {
    if (window.confirm('¿ATENCIÓN: Estás seguro de que quieres eliminar este pedido completo? Se borrará del historial.')) {
      storageService.deleteBatch(batchId);
      if (selectedOrder?.batchId === batchId) {
        setSelectedOrder(null);
      }
      setOrders(prev => prev.filter(o => o.batchId !== batchId));
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-full pb-24 md:pb-6 font-sans transition-colors duration-300">
      
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 drop-shadow-sm">
          <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-xl shadow-sm"><FileText size={32} /></span>
          Historial de Pedidos
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-base mt-2 ml-1 drop-shadow-sm">Consulta y reimprime los albaranes anteriores</p>
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
                  onClick={(e) => { e.stopPropagation(); handleDelete(order.batchId); }}
                  className="p-3 text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors border border-gray-100 dark:border-slate-700/50 hover:border-red-100 shadow-sm active:scale-95"
                  title="Eliminar Pedido"
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
            <p className="text-xl font-bold text-gray-500 dark:text-slate-500 drop-shadow-sm">No hay pedidos registrados</p>
            <p className="text-sm mt-1 text-gray-400 drop-shadow-sm">Realiza un nuevo pedido para verlo aquí.</p>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col h-[100dvh] w-screen">
          
          <div className="flex-none bg-slate-900 border-b border-slate-800 z-50 pt-[max(env(safe-area-inset-top),16px)] pb-3 px-4 shadow-xl">
             <div className="flex justify-between items-center max-w-4xl mx-auto w-full">
                <h2 className="text-white font-bold text-lg hidden md:block">Vista Previa</h2>
                <div className="md:hidden"></div> 

                <div className="flex gap-2 ml-auto">
                    {currentUser.role === UserRole.ADMIN && (
                      <button 
                        onClick={() => handleDelete(selectedOrder.batchId)}
                        className="p-2.5 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg font-bold flex items-center justify-center active:scale-95"
                        title="Eliminar"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                    
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
            <div className="min-h-full flex items-center justify-center py-4">
                <div 
                  id="print-area" 
                  className="bg-white text-black w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden"
                  onClick={(e) => e.stopPropagation()} 
                >
                  <OrderPdfDocument order={selectedOrder} />
                </div>
            </div>
            <div className="h-12"></div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersHistory;
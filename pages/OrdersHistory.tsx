import React, { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';
import { User, UserRole, Department, OrderBatch } from '../types';
import { FileText, Printer, Trash2, X, Eye, Package, Download, Loader2 } from 'lucide-react';
import { Logo } from '../components/Logo';

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
    // @ts-ignore
    if (typeof window.html2pdf === 'undefined') {
      alert('La librería de PDF está cargando. Por favor espera unos segundos.');
      return;
    }

    setIsGeneratingPdf(true);
    
    const printElement = document.getElementById('print-area');
    if (!printElement) {
        setIsGeneratingPdf(false);
        alert('No se pudo encontrar el contenido para imprimir.');
        return;
    }

    const elementToPrint = printElement.cloneNode(true) as HTMLElement;
    elementToPrint.style.position = 'absolute';
    elementToPrint.style.left = '-9999px';
    elementToPrint.style.top = '0';
    elementToPrint.style.width = '8.5in'; // A4-ish width for better scaling
    document.body.appendChild(elementToPrint);

    const opt = {
      margin: [10, 10, 10, 10], // mm
      filename: `Pedido_${selectedOrder.batchId}_${selectedOrder.departmentName}.pdf`,
      image: { type: 'png', quality: 1.0 },
      html2canvas: { 
        scale: 4,
        useCORS: true, 
        logging: false, 
        backgroundColor: '#ffffff', 
        letterRendering: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(elementToPrint).save();
    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert('Hubo un error al generar el PDF.');
    } finally {
        setIsGeneratingPdf(false);
        document.body.removeChild(elementToPrint);
    }
  };

  const handleDelete = (batchId: string) => {
    if (window.confirm('¿ATENCIÓN: Estás seguro de que quieres eliminar este pedido completo? Se borrará del historial.')) {
      storageService.deleteBatch(batchId);
      if (selectedOrder?.batchId === batchId) {
        setSelectedOrder(null);
      }
      
      // Manually update state for local storage fallback as subscription is not live for local edits in this service implementation
      setOrders(prev => prev.filter(o => o.batchId !== batchId));
    }
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 dark:bg-slate-900 min-h-full pb-24 md:pb-6 font-sans transition-colors duration-300">
      
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 drop-shadow-sm">
          <span className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-2 rounded-xl shadow-sm"><FileText size={32} /></span>
          Historial de Pedidos
        </h2>
        <p className="text-gray-500 dark:text-slate-400 text-base mt-2 ml-1 drop-shadow-sm">Consulta y reimprime los albaranes anteriores</p>
      </div>

      {/* Orders List */}
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

      {/* PDF / VISUALIZATION MODAL */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 z-50 bg-gray-900/90 dark:bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-start p-0 md:p-6 overflow-y-auto animate-fade-in"
          onClick={() => setSelectedOrder(null)} // Click background to close
        >
          
          {/* Controls Bar (Sticky on Mobile) */}
          <div 
            // Adjusted padding for safe areas: px-4 horizontal, pt-safe for top, pb-4 for bottom
            className="w-full max-w-3xl flex flex-wrap justify-between items-center px-4 pt-safe pb-4 md:p-0 md:mb-6 sticky top-0 md:static bg-gray-900/80 md:bg-transparent backdrop-blur-md md:backdrop-blur-none z-20 gap-3 no-print border-b md:border-none border-white/10"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking toolbar
          >
            <h2 className="text-white font-bold text-lg hidden md:block drop-shadow-sm">Vista Previa</h2>
            
            <div className="flex gap-2 ml-auto w-full md:w-auto">
              {currentUser.role === UserRole.ADMIN && (
                <button 
                  onClick={() => handleDelete(selectedOrder.batchId)}
                  className="flex-1 md:flex-none bg-red-600/20 text-red-200 border border-red-500/50 px-4 py-3 rounded-xl font-bold backdrop-blur-md flex items-center justify-center gap-2 hover:bg-red-600 hover:text-white transition-all active:scale-95 shadow-sm text-base"
                  title="Eliminar Pedido (Admin)"
                >
                  <Trash2 size={20} /> <span className="drop-shadow-sm">Eliminar</span>
                </button>
              )}
              
              <button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPdf}
                className="flex-1 md:flex-none bg-red-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg shadow-button-red flex items-center justify-center gap-2 hover:bg-red-700 transition-all active:scale-95 text-lg disabled:bg-red-400 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? <Loader2 size={22} className="animate-spin" /> : <Download size={22} />}
                <span className="drop-shadow-sm">{isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}</span> 
              </button>

              <button 
                onClick={() => setSelectedOrder(null)} 
                // Made X button larger and with background for better tap target
                className="flex-shrink-0 p-3 bg-white text-gray-900 rounded-xl font-bold shadow-md hover:bg-gray-100 flex items-center justify-center transition-all active:scale-95"
              >
                <X size={28} />
              </button>
            </div>
          </div>

          {/* Printable Area - STRICT WHITE PAPER MODE */}
          <div 
            id="print-area" 
            className="bg-white dark:bg-white text-black dark:text-black p-6 md:p-16 md:rounded-3xl shadow-2xl max-w-3xl w-full h-auto animate-slide-up relative overflow-visible"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the paper
          >
            {/* Removed redundant mobile close button inside the print area */}
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-black pb-8 mb-8 gap-6 mt-6 md:mt-0">
              <div className="flex items-center gap-6">
                <Logo size="lg" solid />
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-black uppercase tracking-tighter">Hotel Victoria</h1>
                  <p className="text-red-600 font-bold uppercase tracking-[0.3em] text-sm mt-1">Pedidos Internos</p>
                </div>
              </div>
              <div className="text-left md:text-right w-full md:w-auto mt-4 md:mt-0">
                <div className="inline-block bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                  <h2 className="text-xl md:text-2xl font-mono font-bold text-black drop-shadow-sm">#{selectedOrder.batchId}</h2>
                </div>
                <p className="text-sm font-semibold text-gray-500 mt-2 uppercase tracking-wide drop-shadow-sm">{selectedOrder.date}</p>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 md:gap-8 mb-10 bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 drop-shadow-sm">Departamento</p>
                <p className="text-xl md:text-2xl font-extrabold text-black drop-shadow-sm">{selectedOrder.departmentName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 drop-shadow-sm">Solicitante</p>
                <p className="text-xl md:text-2xl font-extrabold text-black drop-shadow-sm">{selectedOrder.requestedBy}</p>
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
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="py-4 md:py-5 font-bold text-black text-base md:text-lg drop-shadow-sm">
                        {item.productName}
                        <span className="md:hidden text-xs text-gray-500 block uppercase font-normal drop-shadow-sm">{item.unit || 'ud.'}</span>
                      </td>
                      <td className="py-4 md:py-5 text-center">
                         <span className="font-black text-lg md:text-xl text-black bg-gray-100 px-3 py-1 rounded-lg border border-gray-200 drop-shadow-sm">{item.quantity}</span>
                      </td>
                      <td className="hidden md:table-cell py-4 md:py-5 text-right text-gray-500 font-semibold text-sm uppercase drop-shadow-sm">{item.unit || 'Ud.'}</td>
                      <td className="py-4 md:py-5 text-right">
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
                 <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest drop-shadow-sm">Firma Entregado (Almacén)</p>
              </div>
              <div className="text-center">
                 <div className="h-20 md:h-24 border-b-2 border-gray-300 mb-3 border-dashed"></div>
                 <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-widest drop-shadow-sm">Firma Recibido ({selectedOrder.departmentName})</p>
              </div>
            </div>
            
            <div className="mt-12 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold drop-shadow-sm">Generado Digitalmente por Sistema Hotel Victoria</p>
            </div>

          </div>
          <div className="h-24 w-full no-print"></div>
        </div>
      )}

    </div>
  );
};

export default OrdersHistory;
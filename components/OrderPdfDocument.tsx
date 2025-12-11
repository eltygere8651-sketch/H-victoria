import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
}

// This component is specifically designed for PDF rendering. 
// It uses fixed layout strategies (absolute positioning for footer) to robustly handle html2canvas generation quirks on iOS.
export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order }) => {
  return (
    <div className="bg-white text-black p-12 font-sans relative" style={{ width: '210mm', height: '297mm', boxSizing: 'border-box' }}>
      
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
        <div className="flex items-center gap-5">
          {/* Use 'simple' prop to avoid SVG filter issues in PDF generation */}
          <Logo size="lg" simple />
          <div className="mt-1">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-black leading-none">Hub</h1>
            <p className="text-red-600 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Reporte de Pedido</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-gray-100 px-3 py-1 rounded mb-1 inline-block">
             <h2 className="text-xl font-mono font-bold text-black">#{order.batchId}</h2>
          </div>
          <p className="text-sm font-semibold text-gray-500">{order.date}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="flex gap-12 mb-10 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento</span>
          <span className="text-xl font-extrabold text-black block leading-tight">{order.departmentName}</span>
        </div>
        <div className="flex-1 border-l border-gray-200 pl-8">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Solicitante</span>
          <span className="text-xl font-extrabold text-black block leading-tight">{order.requestedBy}</span>
        </div>
      </div>

      {/* Table Container - Allows expansion but keeps structure */}
      <div className="w-full">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 text-xs font-black uppercase tracking-wider text-black pl-2">Producto</th>
              <th className="text-center py-3 text-xs font-black uppercase tracking-wider w-24 text-black">Cantidad</th>
              <th className="text-right py-3 text-xs font-black uppercase tracking-wider w-24 text-black pr-2">Check</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-4 pl-2">
                    <p className="font-bold text-base text-black leading-tight">{item.productName}</p>
                    <p className="text-xs text-gray-500 uppercase mt-0.5">{item.unit || 'Unidades'}</p>
                </td>
                <td className="py-4 text-center">
                    <span className="inline-block bg-gray-100 px-3 py-1 rounded font-black text-lg text-black min-w-[3rem]">{item.quantity}</span>
                </td>
                <td className="py-4 text-right pr-2">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded inline-block"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer - Absolute positioning ensures it stays at the bottom regardless of content height issues in canvas */}
      <div className="absolute bottom-12 left-12 right-12 text-center border-t border-gray-200 pt-6">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Generado Digitalmente por Hub</p>
      </div>
    </div>
  );
};
import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean; // New prop to toggle between responsive preview and fixed PDF layout
}

// This component is specifically designed for PDF rendering. 
export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  return (
    <div 
      className={`bg-white text-black font-sans relative flex flex-col justify-between ${preview ? 'w-full min-h-full p-6' : 'p-6'}`}
      style={preview ? {} : { 
        width: '210mm', 
        minHeight: '280mm', // Reduced to ~280mm to ensure footer fits on page 1 without spilling over
        boxSizing: 'border-box' 
      }}
    >
      
      {/* WRAPPER FOR CONTENT TO PUSH FOOTER DOWN */}
      <div className="flex-1">
        {/* Header - Compacted */}
        <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Use 'simple' prop to avoid SVG filter issues in PDF generation */}
            <Logo size={preview ? "md" : "md"} simple />
            <div className="mt-1">
              <h1 className="text-xl font-black uppercase tracking-tighter text-black leading-none">Hub</h1>
              <p className="text-red-600 font-bold uppercase tracking-[0.2em] text-[8px] mt-0.5">Albarán de Entrega</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-100 px-2 py-0.5 rounded mb-0.5 inline-block">
              <h2 className="text-base font-mono font-bold text-black">#{order.batchId}</h2>
            </div>
            <p className="text-[10px] font-semibold text-gray-500">{order.date}</p>
          </div>
        </div>

        {/* Info Grid - Compacted */}
        <div className="flex gap-6 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Departamento</span>
            <span className="text-base font-extrabold text-black block leading-tight">{order.departmentName}</span>
          </div>
          <div className="flex-1 border-l border-gray-200 pl-4">
            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Solicitante</span>
            <span className="text-base font-extrabold text-black block leading-tight">{order.requestedBy}</span>
          </div>
        </div>

        {/* Table Container - Compacted */}
        <div className="w-full mb-4">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-1.5 text-[9px] font-black uppercase tracking-wider text-black pl-1">Producto</th>
                <th className="text-center py-1.5 text-[9px] font-black uppercase tracking-wider w-16 text-black">Cant.</th>
                <th className="text-right py-1.5 text-[9px] font-black uppercase tracking-wider w-16 text-black pr-1">Check</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 break-inside-avoid">
                  <td className="py-1.5 pl-1">
                      <p className="font-bold text-xs text-black leading-tight">{item.productName}</p>
                      <p className="text-[9px] text-gray-500 uppercase mt-0.5">{item.unit || 'Uds'}</p>
                  </td>
                  <td className="py-1.5 text-center">
                      <span className="inline-block bg-gray-100 px-1.5 py-0.5 rounded font-bold text-xs text-black min-w-[2rem]">{item.quantity}</span>
                  </td>
                  <td className="py-1.5 text-right pr-1">
                    <div className="w-4 h-4 border border-gray-300 rounded inline-block"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer & Signatures - Using margin-top: auto to push it to the bottom safely */}
      <div className="mt-auto break-inside-avoid pt-4">
        {/* Signature Area */}
        <div className="flex gap-6 mb-4">
            <div className="flex-1 border-t border-gray-300 pt-1">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Firma y Sello (Emisor)</p>
                <div className="h-8"></div>
            </div>
            <div className="flex-1 border-t border-gray-300 pt-1">
                <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Firma y Sello (Receptor)</p>
                <div className="h-8"></div>
            </div>
        </div>

        <div className="text-center border-t border-gray-200 pt-2">
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em]">Generado Digitalmente por Hub</p>
        </div>
      </div>
    </div>
  );
};
import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean; // New prop to toggle between responsive preview and fixed PDF layout
}

// This component is specifically designed for PDF rendering. 
// We switched from Absolute positioning to Flexbox to prevent content cut-off on iOS.
export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  return (
    <div 
      className={`bg-white text-black font-sans relative flex flex-col justify-between ${preview ? 'w-full min-h-full p-6' : 'p-8'}`}
      style={preview ? {} : { 
        width: '210mm', 
        minHeight: '296mm', // Slightly less than 297mm to prevent overflow to 2nd page due to rounding
        boxSizing: 'border-box' 
      }}
    >
      
      {/* WRAPPER FOR CONTENT TO PUSH FOOTER DOWN */}
      <div className="flex-1">
        {/* Header - Compacted */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Use 'simple' prop to avoid SVG filter issues in PDF generation */}
            <Logo size={preview ? "md" : "lg"} simple />
            <div className="mt-1">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-black leading-none">Hub</h1>
              <p className="text-red-600 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Albarán de Entrega</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-100 px-3 py-1 rounded mb-1 inline-block">
              <h2 className="text-lg font-mono font-bold text-black">#{order.batchId}</h2>
            </div>
            <p className="text-xs font-semibold text-gray-500">{order.date}</p>
          </div>
        </div>

        {/* Info Grid - Compacted */}
        <div className="flex gap-8 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento</span>
            <span className="text-lg font-extrabold text-black block leading-tight">{order.departmentName}</span>
          </div>
          <div className="flex-1 border-l border-gray-200 pl-6">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Solicitante</span>
            <span className="text-lg font-extrabold text-black block leading-tight">{order.requestedBy}</span>
          </div>
        </div>

        {/* Table Container - Compacted */}
        <div className="w-full mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 text-[10px] font-black uppercase tracking-wider text-black pl-2">Producto</th>
                <th className="text-center py-2 text-[10px] font-black uppercase tracking-wider w-20 text-black">Cant.</th>
                <th className="text-right py-2 text-[10px] font-black uppercase tracking-wider w-20 text-black pr-2">Verif.</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 break-inside-avoid">
                  <td className="py-2 pl-2">
                      <p className="font-bold text-sm text-black leading-tight">{item.productName}</p>
                      <p className="text-[10px] text-gray-500 uppercase mt-0.5">{item.unit || 'Unidades'}</p>
                  </td>
                  <td className="py-2 text-center">
                      <span className="inline-block bg-gray-100 px-2 py-0.5 rounded font-bold text-sm text-black min-w-[2rem]">{item.quantity}</span>
                  </td>
                  <td className="py-2 text-right pr-2">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded inline-block"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer & Signatures - Using margin-top: auto to push it to the bottom safely */}
      <div className="mt-auto break-inside-avoid">
        {/* Signature Area */}
        <div className="flex gap-8 mb-6">
            <div className="flex-1 border-t-2 border-gray-300 pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Firma y Sello (Emisor)</p>
                <div className="h-12"></div>
            </div>
            <div className="flex-1 border-t-2 border-gray-300 pt-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Firma y Sello (Receptor)</p>
                <div className="h-12"></div>
            </div>
        </div>

        <div className="text-center border-t border-gray-200 pt-4">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em]">Generado Digitalmente por Hub</p>
        </div>
      </div>
    </div>
  );
};
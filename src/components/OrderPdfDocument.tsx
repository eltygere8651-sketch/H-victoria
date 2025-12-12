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
      className={`bg-white text-black font-sans relative flex flex-col ${preview ? 'w-full min-h-full p-6 shadow-sm' : ''}`}
      style={preview ? {} : { 
        width: '794px', // Exact A4 width at 96 DPI to match html2canvas windowWidth
        minHeight: '1080px', // Slightly less than full A4 (1123px) to prevent overflow to page 2 due to margins
        padding: '40px',
        boxSizing: 'border-box',
        fontSize: '12px'
      }}
    >
      
      {/* WRAPPER FOR CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* Header - Compacted */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div className="flex items-center gap-4">
            {/* Use 'simple' prop to avoid SVG filter issues in PDF generation */}
            <Logo size={preview ? "md" : "lg"} simple />
            <div className="mt-1">
              <h1 className="text-2xl font-black uppercase tracking-tighter text-black leading-none">Hub</h1>
              <p className="text-red-600 font-bold uppercase tracking-[0.25em] text-[10px] mt-1">Albarán de Entrega</p>
            </div>
          </div>
          <div className="text-right">
            <div className="bg-gray-100 px-3 py-1.5 rounded mb-1 inline-block">
              <h2 className="text-lg font-mono font-bold text-black tracking-tight">#{order.batchId}</h2>
            </div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{order.date}</p>
          </div>
        </div>

        {/* Info Grid - Compacted */}
        <div className="flex gap-8 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento Destino</span>
            <span className="text-lg font-extrabold text-black block leading-tight">{order.departmentName}</span>
          </div>
          <div className="flex-1 border-l-2 border-gray-200 pl-6">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Solicitado Por</span>
            <span className="text-lg font-extrabold text-black block leading-tight">{order.requestedBy}</span>
          </div>
        </div>

        {/* Table Container - Compacted */}
        <div className="w-full mb-6 flex-1">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 text-[10px] font-black uppercase tracking-wider text-black pl-2 w-[60%]">Producto / Descripción</th>
                <th className="text-center py-2 text-[10px] font-black uppercase tracking-wider w-[20%] text-black">Cantidad</th>
                <th className="text-right py-2 text-[10px] font-black uppercase tracking-wider w-[20%] text-black pr-2">Verificación</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-100 break-inside-avoid">
                  <td className="py-2.5 pl-2 align-middle">
                      <p className="font-bold text-sm text-black leading-tight">{item.productName}</p>
                      <p className="text-[10px] text-gray-500 uppercase mt-0.5 tracking-wide font-medium">{item.unit || 'Unidades'}</p>
                  </td>
                  <td className="py-2.5 text-center align-middle">
                      <span className="inline-block bg-gray-100 px-3 py-1 rounded-md font-black text-sm text-black border border-gray-200">{item.quantity}</span>
                  </td>
                  <td className="py-2.5 text-right pr-2 align-middle">
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-md inline-block"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer & Signatures - Pushed to bottom via flex-col + flex-1 above */}
        <div className="break-inside-avoid pt-8 mt-auto">
            {/* Signature Area */}
            <div className="flex gap-12 mb-6">
                <div className="flex-1 pt-2">
                    <div className="border-b-2 border-gray-300 mb-2 border-dashed"></div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center">Firma y Sello (Emisor)</p>
                </div>
                <div className="flex-1 pt-2">
                    <div className="border-b-2 border-gray-300 mb-2 border-dashed"></div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider text-center">Firma y Sello (Receptor)</p>
                </div>
            </div>

            <div className="flex justify-between items-end border-t border-gray-200 pt-4">
              <div className="text-[9px] text-gray-400 font-medium">
                <p>Este documento sirve como comprobante de entrega interna.</p>
              </div>
              <div className="text-right">
                 <p className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em]">Generado por Hub</p>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};
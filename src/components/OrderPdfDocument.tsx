import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean; // New prop to toggle between responsive preview and fixed PDF layout
}

export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  return (
    <div 
      className={`bg-white text-black font-sans mx-auto ${preview ? 'w-full' : 'max-w-[210mm] min-h-[297mm] p-8'}`}
    >
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-center gap-4">
          {/* Simple Logo for compatibility */}
          <Logo size={preview ? "md" : "lg"} simple />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Hub</h1>
            <p className="text-red-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Albarán de Entrega</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-slate-100 px-4 py-2 rounded-lg mb-2 inline-block print:bg-slate-100 print:text-black">
            <h2 className="text-xl font-mono font-bold text-slate-900 tracking-tight">#{order.batchId}</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{order.date}</p>
        </div>
      </div>

      {/* INFO GRID */}
      <div className="flex gap-8 mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 print:bg-slate-50 print:border-slate-200">
        <div className="flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Departamento Destino</span>
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{order.departmentName}</span>
        </div>
        <div className="w-px bg-slate-200"></div>
        <div className="flex-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Solicitado Por</span>
          <span className="text-xl font-extrabold text-slate-900 block leading-tight">{order.requestedBy}</span>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="w-full mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="text-left py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 pl-2 w-[50%]">Producto</th>
              <th className="text-left py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 w-[25%]">Categoría</th>
              <th className="text-center py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 w-[15%]">Cantidad</th>
              <th className="text-right py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 pr-2 w-[10%]">Check</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-200 break-inside-avoid page-break-inside-avoid">
                <td className="py-4 pl-2 align-middle">
                    <p className="font-bold text-sm text-slate-900 leading-tight">{item.productName}</p>
                    <p className="text-[10px] text-slate-500 uppercase mt-0.5 tracking-wide font-medium">{item.unit || 'Unidades'}</p>
                </td>
                <td className="py-4 align-middle">
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase print:bg-slate-100">{item.departmentName}</span>
                </td>
                <td className="py-4 text-center align-middle">
                    <span className="inline-block bg-slate-900 text-white px-3 py-1.5 rounded-md font-bold text-sm min-w-[2.5rem] print:bg-black print:text-white">{item.quantity}</span>
                </td>
                <td className="py-4 text-right pr-2 align-middle">
                  <div className="w-6 h-6 border-2 border-slate-300 rounded-md inline-block"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER & SIGNATURES */}
      <div className="break-inside-avoid page-break-inside-avoid mt-12 pt-8">
          <div className="flex gap-16 mb-8">
              <div className="flex-1 pt-4 border-t-2 border-dashed border-slate-300">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Firma Responsable (Emisor)</p>
              </div>
              <div className="flex-1 pt-4 border-t-2 border-dashed border-slate-300">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center">Firma Recibido (Receptor)</p>
              </div>
          </div>

          <div className="flex justify-between items-end border-t border-slate-200 pt-4">
            <div className="text-[9px] text-slate-400 font-medium">
              <p>Este documento es un comprobante interno de movimiento de stock.</p>
            </div>
            <div className="text-right">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.25em]">Generado por Hub</p>
            </div>
          </div>
      </div>
    </div>
  );
};
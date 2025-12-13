import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean;
}

export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  // A4 dimensions in pixels at 96 DPI: ~794px width.
  // We use inline styles for the PDF generation mode to ensure strict adherence to dimensions
  // regardless of the device screen size or browser scaling.
  const pdfStyles = preview ? {} : {
    width: '794px', 
    minHeight: '1123px',
    padding: '40px',
    margin: '0 auto',
    backgroundColor: 'white',
    color: 'black',
    boxSizing: 'border-box' as const
  };

  return (
    <div 
      className={`font-sans ${preview ? 'w-full bg-white text-black' : ''}`}
      style={pdfStyles}
    >
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
        <div className="flex items-center gap-4">
          <Logo size={preview ? "md" : "lg"} simple />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">Hub</h1>
            <p className="text-red-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Albarán de Entrega</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-slate-100 px-4 py-2 rounded-lg mb-2 inline-block">
            <h2 className="text-xl font-mono font-bold text-slate-900 tracking-tight">#{order.batchId}</h2>
          </div>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">{order.date}</p>
        </div>
      </div>

      {/* INFO GRID - Using grid for better stability than flex in PDFs sometimes */}
      <div className="grid grid-cols-2 gap-8 mb-8 p-6 bg-slate-50 rounded-2xl border border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Departamento Destino</span>
          <span className="text-xl font-extrabold text-slate-900 block leading-tight break-words">{order.departmentName}</span>
        </div>
        <div className="border-l border-slate-200 pl-8">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Solicitado Por</span>
          <span className="text-xl font-extrabold text-slate-900 block leading-tight break-words">{order.requestedBy}</span>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <div className="w-full mb-8">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr className="border-b-2 border-slate-900">
              <th className="text-left py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 pl-2 w-[45%]">Producto</th>
              <th className="text-left py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 w-[25%]">Categoría</th>
              <th className="text-center py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 w-[15%]">Cant.</th>
              <th className="text-right py-3 text-[10px] font-black uppercase tracking-wider text-slate-900 pr-2 w-[15%]">Verificación</th>
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
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded uppercase whitespace-nowrap">{item.departmentName}</span>
                </td>
                <td className="py-4 text-center align-middle">
                    <span className="inline-block bg-slate-900 text-white px-3 py-1.5 rounded-md font-bold text-sm min-w-[2.5rem]">{item.quantity}</span>
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
      <div className="break-inside-avoid page-break-inside-avoid mt-auto pt-12">
          <div className="flex gap-12 mb-8">
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
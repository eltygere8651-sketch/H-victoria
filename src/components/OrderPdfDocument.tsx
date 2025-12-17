import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean;
}

export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  // A4 dimensions in pixels at 96 DPI: 794px width x 1123px height.
  const A4_WIDTH = '794px';
  const A4_HEIGHT = '1123px';
  const PADDING = '40px';

  // Styles applied strictly for PDF generation vs Screen Preview
  const containerStyles: React.CSSProperties = preview ? {
    width: '100%',
    minHeight: '100%',
    padding: '24px',
    backgroundColor: 'white',
    color: 'black'
  } : {
    width: A4_WIDTH,
    minHeight: A4_HEIGHT,
    padding: PADDING,
    margin: '0', // Zero margin to prevent "2nd blank page" issue
    backgroundColor: 'white',
    color: 'black',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden' // Clip content to avoid overflow errors
  };

  return (
    <div 
      className="font-sans text-black leading-normal flex flex-col"
      style={containerStyles}
    >
      
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          <Logo size={preview ? "md" : "lg"} simple />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black leading-none">Hub</h1>
            <p className="text-red-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Albarán de Entrega</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2 inline-block border border-gray-200">
            <h2 className="text-xl font-mono font-bold text-black tracking-tight">#{order.batchId}</h2>
          </div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{order.date}</p>
        </div>
      </div>

      {/* CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col">
        
        {/* INFO GRID */}
        <div className="flex gap-8 mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200">
          <div className="flex-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento Destino</span>
            <span className="text-lg font-extrabold text-black block leading-tight break-words">{order.departmentName}</span>
          </div>
          <div className="w-px bg-gray-200"></div>
          <div className="flex-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Solicitado Por</span>
            <span className="text-lg font-extrabold text-black block leading-tight break-words">{order.requestedBy}</span>
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className="w-full mb-8">
          <table className="w-full border-collapse table-fixed">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 text-[10px] font-black uppercase tracking-wider text-black pl-2 w-[45%]">Producto</th>
                <th className="text-left py-2 text-[10px] font-black uppercase tracking-wider text-black w-[25%]">Departamento</th>
                <th className="text-center py-2 text-[10px] font-black uppercase tracking-wider text-black w-[15%]">Cant.</th>
                <th className="text-right py-2 text-[10px] font-black uppercase tracking-wider text-black pr-2 w-[15%]">Check</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200 break-inside-avoid">
                  <td className="py-3 pl-2 align-middle">
                      <p className="font-bold text-sm text-black leading-tight">{item.productName}</p>
                      <p className="text-[9px] text-gray-500 uppercase mt-0.5 tracking-wide font-medium">{item.unit || 'Unidades'}</p>
                  </td>
                  <td className="py-3 align-middle">
                      <span className="text-[9px] font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded uppercase whitespace-nowrap border border-gray-200">{item.departmentName}</span>
                  </td>
                  <td className="py-3 text-center align-middle">
                      <span className="inline-block bg-black text-white px-2.5 py-1 rounded-md font-bold text-sm min-w-[2rem]">{item.quantity}</span>
                  </td>
                  <td className="py-3 text-right pr-2 align-middle">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded inline-block"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PUSH FOOTER TO BOTTOM */}
        <div className="flex-1"></div>

        {/* FOOTER & SIGNATURES */}
        <div className="break-inside-avoid page-break-inside-avoid mt-8">
            <div className="flex gap-10 mb-6">
                <div className="flex-1 pt-4 border-t-2 border-dashed border-gray-300">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider text-center">Firma Responsable (Emisor)</p>
                </div>
                <div className="flex-1 pt-4 border-t-2 border-dashed border-gray-300">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-wider text-center">Firma Recibido (Receptor)</p>
                </div>
            </div>

            <div className="flex justify-between items-end border-t border-gray-200 pt-4">
              <div className="text-[8px] text-gray-400 font-medium max-w-[70%]">
                <p>Este documento sirve como comprobante oficial de movimiento de stock interno.</p>
              </div>
              <div className="text-right">
                 <p className="text-[8px] font-black text-gray-300 uppercase tracking-[0.2em]">HUB OS v1.0</p>
              </div>
            </div>
        </div>
      
      </div>
    </div>
  );
};
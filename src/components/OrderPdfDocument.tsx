import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean;
}

export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  // Dimensiones A4 en píxeles a 96 DPI: 794px ancho x 1123px alto.
  // Usamos 1120px de alto (3px menos) para evitar desbordamiento por redondeo que crea una segunda hoja.
  const A4_WIDTH = '794px';
  const A4_HEIGHT = '1120px'; 
  const PADDING = '40px';

  // Estilos base
  const baseStyles: React.CSSProperties = {
    fontFamily: 'Arial, sans-serif',
    backgroundColor: 'white',
    color: 'black',
    boxSizing: 'border-box',
  };

  // Estilos específicos según modo
  const containerStyles: React.CSSProperties = preview ? {
    ...baseStyles,
    width: '100%',
    minHeight: 'auto', // Changed from 100% to auto to prevent collapse on mobile if parent height is undefined
    padding: '20px',   // Padding más pequeño para móvil
    display: 'flex',
    flexDirection: 'column',
  } : {
    ...baseStyles,
    width: A4_WIDTH,
    height: A4_HEIGHT, // Altura fija estricta para PDF
    padding: PADDING,
    margin: '0',
    position: 'relative',
    overflow: 'hidden', // Cortar cualquier desbordamiento
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between' // Asegura que el footer se vaya al final visualmente
  };

  return (
    <div style={containerStyles} className="text-black leading-normal">
      
      {/* WRAPPER PARA CONTENIDO PRINCIPAL */}
      <div className="flex-1">
        {/* Header */}
        <div className={`flex justify-between items-start border-b-2 border-black pb-4 mb-6 ${preview ? 'flex-col sm:flex-row gap-4' : ''}`}>
          <div className="flex items-center gap-4">
            <Logo size={preview ? "md" : "lg"} simple />
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-black leading-none">Hub</h1>
              <p className="text-red-600 font-bold uppercase tracking-[0.3em] text-[10px] mt-1">Albarán de Entrega</p>
            </div>
          </div>
          <div className={`${preview ? 'w-full sm:w-auto text-left sm:text-right' : 'text-right'}`}>
            <div className="bg-gray-100 px-4 py-2 rounded-lg mb-2 inline-block border border-gray-200">
              <h2 className="text-xl font-mono font-bold text-black tracking-tight">#{order.batchId}</h2>
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide block">{order.date}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className={`mb-8 p-5 bg-gray-50 rounded-xl border border-gray-200 ${preview ? 'flex flex-col gap-4' : 'flex gap-8'}`}>
          <div className="flex-1">
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento Destino</span>
            <span className="text-lg font-extrabold text-black block leading-tight break-words">{order.departmentName}</span>
          </div>
          {!preview && <div className="w-px bg-gray-200"></div>}
          <div className={`flex-1 ${preview ? 'border-t border-gray-200 pt-4' : ''}`}>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Solicitado Por</span>
            <span className="text-lg font-extrabold text-black block leading-tight break-words">{order.requestedBy}</span>
          </div>
        </div>

        {/* Items Table */}
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
      </div>

      {/* Footer & Signatures - Always at bottom in PDF mode */}
      <div className="break-inside-avoid page-break-inside-avoid mt-auto pt-8">
          <div className={`flex gap-10 mb-6 ${preview ? 'flex-col sm:flex-row gap-8' : ''}`}>
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
  );
};
import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
  preview?: boolean;
}

export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order, preview = false }) => {
  return (
    <div 
      className="bg-white text-black font-sans"
      style={{ 
        width: preview ? '100%' : '210mm', 
        padding: '20mm',
        boxSizing: 'border-box',
        backgroundColor: 'white'
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div className="flex items-center gap-4">
          <div style={{ width: '48px', height: '48px' }}>
             <Logo size="md" simple />
          </div>
          <div>
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

      {/* Info Grid */}
      <div className="flex gap-8 mb-8 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex-1">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Departamento Destino</span>
          <span className="text-lg font-extrabold text-black block leading-tight">{order.departmentName}</span>
        </div>
        <div className="flex-1 border-l border-gray-200 pl-6">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Solicitado Por</span>
          <span className="text-lg font-extrabold text-black block leading-tight">{order.requestedBy}</span>
        </div>
      </div>

      {/* Table Container */}
      <div className="w-full mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2 text-[10px] font-black uppercase tracking-wider text-black pl-2">Producto / Item</th>
              <th className="text-center py-2 text-[10px] font-black uppercase tracking-wider w-24 text-black">Cant.</th>
              <th className="text-right py-2 text-[10px] font-black uppercase tracking-wider w-24 text-black pr-2">Verificación</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-100 break-inside-avoid">
                <td className="py-3 pl-2">
                    <p className="font-bold text-sm text-black leading-tight">{item.productName}</p>
                    <p className="text-[10px] text-gray-500 uppercase mt-0.5">{item.unit || 'Uds'}</p>
                </td>
                <td className="py-3 text-center align-middle">
                    <span className="inline-block bg-gray-100 px-2 py-1 rounded font-black text-sm text-black min-w-[2.5rem]">{item.quantity}</span>
                </td>
                <td className="py-3 text-right align-middle pr-2">
                  <div className="w-5 h-5 border-2 border-gray-300 rounded inline-block"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer & Signatures */}
      <div className="mt-12 break-inside-avoid">
        <div className="flex gap-8 mb-6">
            <div className="flex-1 border-t-2 border-gray-200 pt-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-8">Firma Emisor (Almacén)</p>
            </div>
            <div className="flex-1 border-t-2 border-gray-200 pt-2">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-8">Firma Receptor ({order.departmentName})</p>
            </div>
        </div>

        <div className="text-center border-t border-gray-100 pt-4">
          <p className="text-[8px] font-bold text-gray-300 uppercase tracking-[0.3em]">Documento Generado Digitalmente por Hub</p>
        </div>
      </div>
    </div>
  );
};
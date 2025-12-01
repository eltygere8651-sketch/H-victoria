import React from 'react';
import { OrderBatch } from '../types';
import { Logo } from './Logo';

interface OrderPdfDocumentProps {
  order: OrderBatch;
}

// This component is specifically designed for PDF rendering. It's not responsive.
// It uses a fixed layout and styling to ensure consistency in the generated PDF.
export const OrderPdfDocument: React.FC<OrderPdfDocumentProps> = ({ order }) => {
  return (
    <div className="bg-white text-black p-10 font-sans" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
        <div className="flex items-center gap-4">
          <Logo size="lg" solid />
          <div className="mt-2">
            <h1 className="text-2xl font-black uppercase tracking-tighter text-black">Hub</h1>
            <p className="text-red-600 font-bold uppercase tracking-[0.2em] text-xs">Reporte de Pedido</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-mono font-bold text-black">#{order.batchId}</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1">{order.date}</p>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <p>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Departamento</span><br />
          <span className="text-xl font-extrabold text-black">{order.departmentName}</span>
        </p>
        <p>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Solicitante</span><br />
          <span className="text-xl font-extrabold text-black">{order.requestedBy}</span>
        </p>
      </div>

      {/* Table */}
      <div className="flex-grow">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-3 text-sm font-black uppercase tracking-wider text-black">Producto</th>
              <th className="text-center py-3 text-sm font-black uppercase tracking-wider w-32 text-black">Cant.</th>
              <th className="text-right py-3 text-sm font-black uppercase tracking-wider w-24 text-black">Unidad</th>
              <th className="text-right py-3 text-sm font-black uppercase tracking-wider w-20 text-black">Check</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-200">
                <td className="py-3 font-bold text-base text-black">{item.productName}</td>
                <td className="py-3 text-center font-black text-base text-black">{item.quantity}</td>
                <td className="py-3 text-right text-gray-500 font-semibold text-sm">{item.unit || 'uds.'}</td>
                <td className="py-3 text-right">
                  <div className="w-6 h-6 border-2 border-gray-300 rounded-lg inline-block"></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-8 text-center border-t border-gray-200">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Generado Digitalmente por Hub</p>
      </div>
    </div>
  );
};
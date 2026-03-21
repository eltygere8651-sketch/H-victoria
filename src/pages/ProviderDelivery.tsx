import React, { useState, useEffect } from 'react';
import { Product, User, OrderBatch } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, Trash2, ArrowRight, CheckCircle2, Loader2, PackagePlus, LogOut } from 'lucide-react';

interface ProviderDeliveryProps {
  currentUser: User;
}

const ProviderDelivery: React.FC<ProviderDeliveryProps> = ({ currentUser }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');
  const [selectedProductToReceive, setSelectedProductToReceive] = useState<Product | null>(null);
  const [receiveQuantityInput, setReceiveQuantityInput] = useState('');
  const [receiveItems, setReceiveItems] = useState<{product: Product, quantityToAdd: number}[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [providerName, setProviderName] = useState('');

  useEffect(() => {
    const unsubscribe = storageService.subscribeToProducts((data) => {
      setProducts(data);
    });
    return () => unsubscribe();
  }, []);

  const handleAddReceiveItem = () => {
    if (!selectedProductToReceive) return;
    const qty = parseInt(receiveQuantityInput, 10);
    if (isNaN(qty) || qty <= 0) return;

    setReceiveItems(prev => {
      const existing = prev.find(item => item.product.id === selectedProductToReceive.id);
      if (existing) {
        return prev.map(item => item.product.id === selectedProductToReceive.id ? { ...item, quantityToAdd: item.quantityToAdd + qty } : item);
      }
      return [...prev, { product: selectedProductToReceive, quantityToAdd: qty }];
    });
    setSelectedProductToReceive(null);
    setReceiveQuantityInput('');
    setReceiveSearchTerm('');
  };

  const handleConfirmReceiveStock = async () => {
    if (receiveItems.length === 0 || !providerName.trim()) return;
    setLoading(true);
    const finalName = `Proveedor: ${providerName.trim()}`;
    const result = await storageService.receiveStockBatch(
      receiveItems.map(item => ({ 
        productId: item.product.id, 
        productName: item.product.name,
        quantityToAdd: item.quantityToAdd,
        unit: item.product.unit || 'unidades'
      })),
      finalName
    );
    
    setReceiveItems([]);
    setProviderName('');
    setLoading(false);
    setSuccessMessage(`¡Ingreso #${result?.batchId} registrado correctamente!`);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleLogout = () => {
    storageService.clearSession();
    window.location.href = '/';
  };

  return (
    <div className="font-sans relative min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-md px-4 py-6">
        <div className="max-w-3xl mx-auto flex justify-between items-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-2">
            <PackagePlus className="text-blue-600" size={28} />
            Ingreso de <span className="text-blue-600">Proveedor</span>
          </h2>
          <button 
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
            title="Salir"
          >
            <LogOut size={24} />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-xl font-bold flex items-center gap-3 animate-fade-in">
            <CheckCircle2 size={24} />
            {successMessage}
          </div>
        )}

        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
          <div className="mb-6">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Datos del Proveedor</h4>
            <input 
              type="text" 
              placeholder="Nombre de la empresa o repartidor..." 
              value={providerName}
              onChange={(e) => setProviderName(e.target.value)}
              className="w-full px-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:border-blue-500 outline-none transition-all dark:text-white"
            />
          </div>

          <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Buscar Producto</h4>
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Escribe para buscar..." 
              value={receiveSearchTerm}
              onChange={(e) => setReceiveSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:border-blue-500 outline-none transition-all dark:text-white"
            />
          </div>

          {receiveSearchTerm && !selectedProductToReceive && (
            <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm mb-4">
              {products.filter(p => p.name.toLowerCase().includes(receiveSearchTerm.toLowerCase())).slice(0, 5).map(p => (
                <button 
                  key={p.id}
                  onClick={() => setSelectedProductToReceive(p)}
                  className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center"
                >
                  <span className="font-bold dark:text-white">{p.name}</span>
                  <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Stock: {p.quantity}</span>
                </button>
              ))}
              {products.filter(p => p.name.toLowerCase().includes(receiveSearchTerm.toLowerCase())).length === 0 && (
                <div className="p-4 text-center text-slate-500 font-bold text-sm">No se encontraron productos</div>
              )}
            </div>
          )}

          {selectedProductToReceive && (
            <div className="flex items-center gap-3 animate-fade-in mb-4">
              <div className="flex-1 bg-slate-50 dark:bg-slate-800 px-4 py-3 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 min-w-0">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Seleccionado</span>
                <span className="font-bold dark:text-white truncate block text-sm">{selectedProductToReceive.name}</span>
              </div>
              <input 
                type="number" 
                placeholder="Cant." 
                value={receiveQuantityInput}
                onChange={(e) => setReceiveQuantityInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddReceiveItem()}
                className="w-24 px-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold focus:border-blue-500 outline-none text-center dark:text-white"
                autoFocus
              />
              <button 
                onClick={handleAddReceiveItem}
                className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/30 flex-shrink-0"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        {receiveItems.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
              <span>Lista de Ingreso</span>
              <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-lg text-xs">{receiveItems.length} items</span>
            </h4>
            <div className="space-y-2 mb-6">
              {receiveItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <div className="flex-1 min-w-0 pr-4">
                    <span className="font-bold dark:text-white truncate block">{item.product.name}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Stock actual: {item.product.quantity} <ArrowRight size={10} className="inline mx-1" /> {item.product.quantity + item.quantityToAdd}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-lg text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-xl">
                      +{item.quantityToAdd}
                    </span>
                    <button 
                      onClick={() => setReceiveItems(prev => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={handleConfirmReceiveStock}
              disabled={receiveItems.length === 0 || loading || !providerName.trim()}
              className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-lg uppercase tracking-wider"
            >
              {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
              Confirmar Ingreso
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProviderDelivery;

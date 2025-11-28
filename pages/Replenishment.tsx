import React, { useState, useEffect, useRef } from 'react';
import { Department, Product, User, CartItem } from '../types';
import { storageService } from '../services/storageService';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, X, ArrowRight, Package, ChevronUp, AlertTriangle, Siren, Loader2 } from 'lucide-react';

interface ReplenishmentProps {
  currentUser: User;
}

const Replenishment: React.FC<ReplenishmentProps> = ({ currentUser }) => {
  // `selectedDepartmentForOrder` will now be set in the confirmation modal, not initially.
  const [selectedDepartmentForOrder, setSelectedDepartmentForOrder] = useState<Department>(Department.GENERAL);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [cart, setCart] = useState<CartItem[]>(
    storageService.getDraftCart() as CartItem[]
  );
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState<string>('1');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [lowStockList, setLowStockList] = useState<string[]>([]);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    storageService.saveDraftCart(cart);
  }, [cart]);

  useEffect(() => {
    if (selectedProduct && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [selectedProduct]);

  const openQtyModal = (product: Product) => {
    setSelectedProduct(product);
    setQtyValue('1');
  };

  const closeQtyModal = () => {
    setSelectedProduct(null);
    setQtyValue('1');
  };

  const playAlarm = () => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.setValueAtTime(1200, t + 0.15);
    osc.frequency.setValueAtTime(800, t + 0.3);
    
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
    
    osc.start(t);
    osc.stop(t + 0.5);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    
    const qty = parseInt(qtyValue);
    const inCart = cart.find(c => c.product.id === selectedProduct.id);
    const currentInCart = inCart?.quantity || 0;
    const available = selectedProduct.quantity - currentInCart;

    if (isNaN(qty) || qty <= 0) return;

    if (qty > available) {
      alert(`Solo quedan ${available} unidades disponibles.`);
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === selectedProduct.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === selectedProduct.id 
            ? { ...item, quantity: item.quantity + qty } 
            : item
        );
      }
      return [...prev, { product: selectedProduct, quantity: qty }];
    });

    closeQtyModal();
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantityInCart = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty > 0 && newQty <= item.product.quantity) {
          return { ...item, quantity: newQty };
        }
      }
      return item;
    }));
  };

  const processOrder = async () => {
    if (cart.length === 0) return;
    setIsProcessing(true);
    
    // Use selectedDepartmentForOrder from the modal
    const result = await storageService.submitOrderBatch(cart, selectedDepartmentForOrder, currentUser);
    
    setIsProcessing(false);
    if (result.success) {
      setShowConfirmModal(false);
      setShowMobileCart(false);
      
      if (result.lowStockItems && result.lowStockItems.length > 0) {
        setLowStockList(result.lowStockItems);
        setShowLowStockModal(true);
        playAlarm();
      } else {
        setShowSuccessModal(true);
        setTimeout(() => {
          resetOrderState();
        }, 2000);
      }
    } else {
      alert("Error al procesar el pedido.");
      setShowConfirmModal(false);
    }
  };

  const resetOrderState = () => {
    setCart([]);
    setShowSuccessModal(false);
    setShowLowStockModal(false);
    setSearchTerm('');
    setSelectedDepartmentForOrder(Department.GENERAL); // Reset department
  };

  const filteredProducts = products.filter(p => 
    p.quantity > 0 && 
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-gray-50 dark:bg-slate-900 relative font-sans transition-colors duration-300">
      
      {/* 1. QUANTITY INPUT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/70 dark:bg-slate-900/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-pop-in overflow-hidden animate-pop-in border border-gray-100 dark:border-slate-700/50">
            <div className="bg-gray-900 dark:bg-slate-950 p-5 text-white flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80 uppercase tracking-wider font-bold">Añadir Producto</p>
                <h3 className="font-extrabold text-2xl truncate">{selectedProduct.name}</h3>
              </div>
              <button onClick={closeQtyModal} className="bg-white/10 p-2 rounded-full hover:bg-white/20 active:scale-95 transition-all"><X size={28} /></button>
            </div>
            
            <div className="p-6">
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => setQtyValue(prev => String(Math.max(1, parseInt(prev || '0') - 1)))}
                  className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-95 transition-all shadow-sm"
                >
                  <Minus size={32} />
                </button>
                
                <input
                  ref={inputRef}
                  type="number"
                  value={qtyValue}
                  onChange={(e) => setQtyValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmAddToCart()}
                  className="flex-1 h-16 text-center text-4xl font-extrabold border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl focus:border-red-600 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none shadow-sm"
                  min="1"
                />

                <button 
                  onClick={() => setQtyValue(prev => String(parseInt(prev || '0') + 1))}
                  className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-95 transition-all shadow-sm"
                >
                  <Plus size={32} />
                </button>
              </div>

              <button 
                onClick={confirmAddToCart}
                className="w-full py-5 bg-red-600 text-white text-xl font-extrabold rounded-2xl shadow-xl shadow-button-red hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <span>Añadir al Carrito</span>
                <ArrowRight size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. CONFIRMATION MODAL */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 dark:bg-slate-900/90 backdrop-blur-sm p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-pop-in overflow-hidden animate-pop-in border border-gray-100 dark:border-slate-700/50">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center">Confirmar Pedido</h3>
                <p className="text-center text-gray-500 dark:text-slate-400 mt-1">Vas a solicitar <b>{cart.length} productos</b>.</p>
                <div className="mt-4">
                  <label htmlFor="department-select" className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-2">Selecciona el área de destino:</label>
                  <select
                    id="department-select"
                    value={selectedDepartmentForOrder}
                    onChange={(e) => setSelectedDepartmentForOrder(e.target.value as Department)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-slate-600/50 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 focus:border-red-500 outline-none transition-all bg-gray-50 dark:bg-slate-700/50 dark:text-white focus:bg-white dark:focus:bg-slate-700 shadow-sm"
                  >
                    {Object.values(Department).map((dep) => (
                      <option key={dep} value={dep}>{dep}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="max-h-[40vh] overflow-y-auto p-4 bg-gray-50 dark:bg-slate-900/50">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-200 dark:border-slate-700 last:border-0">
                    <span className="font-bold text-gray-700 dark:text-slate-300">{item.product.name}</span>
                    <span className="font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg">x{item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="p-6 flex gap-4">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 active:scale-[0.98] transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={processOrder}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-button-green flex items-center justify-center gap-2 active:scale-[0.98]"
                >
                  {isProcessing ? <Loader2 className="animate-spin text-white"/> : <><CheckCircle2 /> Confirmar</>}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* 3. SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="text-center bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-pop-in border border-gray-100 dark:border-slate-700/50 animate-pop-in">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200/50 dark:shadow-green-900/30 animate-bounce">
              <CheckCircle2 size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">¡Pedido Enviado!</h2>
            <p className="text-xl text-gray-500 dark:text-slate-400">Stock actualizado correctamente.</p>
          </div>
        </div>
      )}

      {/* 4. LOW STOCK */}
      {showLowStockModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 dark:bg-slate-950/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-pop-in overflow-hidden animate-pop-in border-2 border-red-500 text-center">
            <div className="bg-red-600 text-white p-6 flex flex-col items-center">
               <Siren size={48} className="animate-pulse mb-2 drop-shadow-lg" />
               <h3 className="text-2xl font-black uppercase tracking-tight drop-shadow-sm">¡ATENCIÓN!</h3>
               <p className="font-bold opacity-90 drop-shadow-sm">STOCK BAJO EN ALMACÉN</p>
            </div>
            <div className="p-6">
               <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 mb-6 border border-red-100 dark:border-red-900/30">
                 <ul className="text-left space-y-2">
                   {lowStockList.map((name, i) => (
                     <li key={i} className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                       <AlertTriangle size={16} /> {name}
                     </li>
                   ))}
                 </ul>
               </div>
               <button 
                  onClick={resetOrderState}
                  className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-black dark:hover:bg-gray-200 transition-colors active:scale-[0.98] shadow-lg shadow-gray-200/50 dark:shadow-none"
               >
                 Entendido, Aceptar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CATALOG --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-20 lg:pb-0">
        <div className="bg-white dark:bg-slate-800 px-4 py-4 md:px-6 md:py-6 border-b border-gray-200 dark:border-slate-700/50 shadow-sm z-10 space-y-4 transition-colors duration-300">
           {/* Removed Department Selection Buttons */}
           <div className="relative">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={24} />
             <input 
               type="text" 
               placeholder="Buscar producto..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-700/50 text-lg focus:bg-white dark:focus:bg-slate-800 focus:border-red-500 dark:focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500 shadow-sm"
             />
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => {
               const inCart = cart.find(c => c.product.id === product.id);
               const currentInCart = inCart?.quantity || 0;
               const available = product.quantity - currentInCart;

               return (
                <button 
                  key={product.id} 
                  onClick={() => available > 0 && openQtyModal(product)}
                  disabled={available <= 0}
                  className={`text-left group relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-card-soft dark:shadow-card-dark border-2 border-gray-100 dark:border-slate-700/50 transition-all duration-200 min-h-[140px] flex flex-col justify-between
                    ${available <= 0 
                      ? 'opacity-60 bg-gray-100 dark:bg-slate-800/60 cursor-not-allowed grayscale' 
                      : 'hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl dark:hover:shadow-red-900/20 active:scale-[0.98]'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-2">
                      <h3 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2">{product.name}</h3>
                      <p className="text-sm font-semibold text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-wide">{product.category}</p>
                    </div>
                    {inCart && (
                      <span className="bg-red-600 text-white text-sm font-bold px-2.5 py-1 rounded-lg shadow-md animate-fade-in shrink-0">
                        {inCart.quantity}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center justify-between">
                    <div className={`text-sm font-bold px-3 py-1.5 rounded-lg ${available <= 0 ? 'bg-gray-200 text-gray-500 dark:bg-slate-700 dark:text-slate-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                      {available <= 0 ? 'AGOTADO' : `${available} ${product.unit}`}
                    </div>
                  </div>
                </button>
               );
            })}
          </div>
        </div>
      </div>

      {/* --- CART SLIDER --- */}
      <div className={`lg:hidden fixed bottom-[70px] left-4 right-4 z-40 transition-transform duration-300 ${cart.length > 0 && !showMobileCart ? 'translate-y-0' : 'translate-y-[150%]'}`}>
         <button 
           onClick={() => setShowMobileCart(true)}
           className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-none flex items-center justify-between font-bold active:scale-[0.98] transition-all"
         >
            <div className="flex items-center gap-3">
               <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md">
                 {cart.length}
               </span>
               <span>Ver Carrito</span>
            </div>
            <ChevronUp size={24} />
         </button>
      </div>

      <div className={`
          fixed lg:relative inset-x-0 bottom-0 z-50 lg:z-auto
          w-full lg:w-96 
          bg-white dark:bg-slate-800 
          border-t lg:border-l lg:border-t-0 border-gray-200 dark:border-slate-700/50 
          shadow-[0_-10px_40px_rgba(0,0,0,0.2)] lg:shadow-2xl 
          flex flex-col 
          h-[85vh] lg:h-full 
          transition-transform duration-300 ease-out
          rounded-t-3xl lg:rounded-none
          ${showMobileCart ? 'translate-y-0' : 'translate-y-full lg:translate-y-0'}
      `}>
        <div 
          className="lg:hidden w-full p-4 flex justify-center items-center border-b border-gray-100 dark:border-slate-700/50 cursor-pointer"
          onClick={() => setShowMobileCart(false)}
        >
           <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full mb-1"></div>
        </div>

        <div className="p-6 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50 flex justify-between items-center rounded-t-3xl lg:rounded-none">
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-xl tracking-tight">Tu Pedido</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
              {cart.length > 0 ? 'Para confirmar, selecciona el área de destino.' : 'Añade productos para empezar un pedido.'}
            </p>
          </div>
          <div className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
            {cart.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-slate-600 space-y-4">
              <ShoppingCart size={64} strokeWidth={1.5} />
              <p className="text-lg font-bold">Carrito Vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between bg-white dark:bg-slate-700/50 border-2 border-gray-100 dark:border-slate-700 p-4 rounded-2xl shadow-sm group hover:border-red-100 dark:hover:border-red-500/30 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-base text-gray-900 dark:text-white truncate">{item.product.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantityInCart(item.product.id, -1)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-600 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-500 font-bold active:scale-95 transition-all"><Minus size={14} /></button>
                  <span className="font-bold text-lg w-8 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantityInCart(item.product.id, 1)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-600 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-500 font-bold active:scale-95 transition-all"><Plus size={14} /></button>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 ml-2 transition-colors p-2 -mr-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"><Trash2 size={18} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-slate-700/50 bg-white dark:bg-slate-800 pb-safe lg:pb-6">
          <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={cart.length === 0}
            className="w-full py-5 rounded-2xl font-extrabold text-xl shadow-xl transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]
              bg-red-600 text-white hover:bg-red-700 hover:shadow-button-red disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400 disabled:shadow-none"
          >
            <CheckCircle2 size={24} /> FINALIZAR PEDIDO
          </button>
        </div>
      </div>
      
      {showMobileCart && <div className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowMobileCart(false)}></div>}
    </div>
  );
};

export default Replenishment;
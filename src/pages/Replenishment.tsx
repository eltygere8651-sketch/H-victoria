import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, User, CartItem, Department, OrderBatch, UserRole, ReplenishmentRequest } from '../types';
import * as storageService from '../services/storageService';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, X, ArrowRight, Package, ChevronUp, AlertTriangle, Siren, Loader2, ChevronDown, ListTree, Filter, Share2, Sparkles, ShieldAlert, LayoutGrid } from 'lucide-react';
import { sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { OrderPdfDocument } from '../components/OrderPdfDocument';
import { motion, AnimatePresence } from 'motion/react';

interface ReplenishmentProps {
  currentUser: User;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showMobileCart: boolean;
  setShowMobileCart: React.Dispatch<React.SetStateAction<boolean>>;
  notificationVolume?: number;
  soundType?: string;
}

const Replenishment: React.FC<ReplenishmentProps> = ({ currentUser, cart, setCart, showMobileCart, setShowMobileCart, notificationVolume = 0.3, soundType = 'Default' }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentForOrder, setSelectedDepartmentForOrder] = useState<string>('');
  const [selectedDepartmentNameForOrder, setSelectedDepartmentNameForOrder] = useState<string>('');
  
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState<string>('1');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [lowStockList, setLowStockList] = useState<string[]>([]);
  const [qtyError, setQtyError] = useState('');
  const [orderError, setOrderError] = useState('');
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setIsLoadingProducts(false);
    });
    const unsubDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
      setIsLoadingDepartments(false);
    });

    return () => {
      unsubProducts();
      unsubDepartments();
    };
  }, []);

  useEffect(() => {
    if (!isLoadingDepartments && departments.length > 0) {
      const currentSelectedExists = departments.some(d => d.id === selectedDepartmentForOrder);
      if (!selectedDepartmentForOrder || !currentSelectedExists) {
        setSelectedDepartmentForOrder(departments[0].id);
        setSelectedDepartmentNameForOrder(departments[0].name);
      } else {
        const dep = departments.find(d => d.id === selectedDepartmentForOrder);
        setSelectedDepartmentNameForOrder(dep ? dep.name : '');
      }
    } else if (!isLoadingDepartments && departments.length === 0) {
      setSelectedDepartmentForOrder('');
      setSelectedDepartmentNameForOrder('');
    }
  }, [departments, isLoadingDepartments, selectedDepartmentForOrder]);


  useEffect(() => {
    const dep = departments.find(d => d.id === selectedDepartmentForOrder);
    setSelectedDepartmentNameForOrder(dep ? dep.name : '');
  }, [selectedDepartmentForOrder, departments]);

  const openQtyModal = (product: Product) => {
    setSelectedProduct(product);
    setQtyValue('1');
    setQtyError('');
  };

  const closeQtyModal = () => {
    setSelectedProduct(null);
    setQtyValue('1');
    setQtyError('');
  };

  const audioContextRef = useRef<AudioContext | null>(null);

  const playAlarm = (alertType: 'success' | 'warning' | 'info' = 'info') => {
    if (notificationVolume <= 0) return;
    if (!audioContextRef.current) {
      const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtor) return;
      audioContextRef.current = new AudioCtor();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const t = ctx.currentTime;
    const volumeValue = notificationVolume * notificationVolume;

    const playBeep = (timeOffset: number, freq: number, duration: number, type: OscillatorType) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t + timeOffset);
      
      const startTime = t + timeOffset;
      const attack = Math.min(0.05, duration * 0.2);
      const release = Math.min(0.1, duration * 0.3);

      g.gain.setValueAtTime(0, startTime);
      g.gain.linearRampToValueAtTime(volumeValue, startTime + attack);
      g.gain.linearRampToValueAtTime(volumeValue, startTime + duration - release);
      g.gain.linearRampToValueAtTime(0, startTime + duration);
      
      o.connect(g);
      g.connect(ctx.destination);
      o.start(startTime);
      o.stop(startTime + duration + 0.05);
    };

    const type = soundType.toLowerCase();
    
    const playTonePattern = (offset: number) => {
      if (type === 'modern') {
        playBeep(offset, 784, 0.1, 'sine');
        playBeep(offset + 0.12, 1046, 0.15, 'sine');
      } else if (type === 'crystal') {
        playBeep(offset, 1568, 0.08, 'triangle');
        playBeep(offset + 0.1, 1760, 0.08, 'triangle');
        playBeep(offset + 0.2, 1975, 0.12, 'triangle');
      } else if (type === 'retro') {
        playBeep(offset, 523, 0.12, 'square');
        playBeep(offset + 0.15, 659, 0.12, 'square');
        playBeep(offset + 0.3, 784, 0.2, 'square');
      } else {
        playBeep(offset, 2500, 0.2, 'square');
      }
    };

    if (alertType === 'success' || alertType === 'warning') {
      playTonePattern(0);
      playTonePattern(0.6);
      playTonePattern(1.2);
      return;
    }

    // Single beep for simple info/feedback
    if (type === 'modern') playBeep(0, 1046, 0.15, 'sine');
    else if (type === 'crystal') playBeep(0, 1975, 0.1, 'triangle');
    else if (type === 'retro') playBeep(0, 784, 0.15, 'square');
    else playBeep(0, 2500, 0.2, 'square');
  };

  const quickAddToCart = (product: Product) => {
    const inCart = cart.find(c => c.product.id === product.id);
    const currentInCart = inCart?.quantity || 0;
    const available = product.quantity - currentInCart;

    if (available <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product: product, quantity: 1 }];
    });

    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1000);
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    
    const qty = parseInt(qtyValue);
    const inCart = cart.find(c => c.product.id === selectedProduct.id);
    const currentInCart = inCart?.quantity || 0;
    const available = selectedProduct.quantity - currentInCart;

    if (isNaN(qty) || qty <= 0) return;

    if (qty > available) {
      setQtyError(`Solo quedan ${available} unidades en almacén.`);
      return;
    }

    if (selectedProduct.maxThreshold && qty > selectedProduct.maxThreshold) {
      setQtyError(`No puedes pedir más de ${selectedProduct.maxThreshold} ${selectedProduct.unit} (Tope de área).`);
      return;
    }
    setQtyError('');

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
    if (cart.length === 0 || !selectedDepartmentForOrder || !selectedDepartmentNameForOrder) return;
    setIsProcessing(true);
    
    const result = await storageService.submitOrderBatch(
      cart, 
      selectedDepartmentForOrder, 
      selectedDepartmentNameForOrder, 
      currentUser
    );
    
    setIsProcessing(false);
    if (result.success && result.batchId) {
      setShowConfirmModal(false);
      setShowMobileCart(false);
      setOrderError('');
      
      // Track batch ID to avoid duplicate notification sound
      localStorage.setItem('last_processed_batch', result.batchId);
      
      // Auto-share the PDF
      const orderBatch: OrderBatch = {
        batchId: result.batchId,
        date: new Date().toLocaleString(),
        departmentId: selectedDepartmentForOrder,
        departmentName: selectedDepartmentNameForOrder,
        requestedBy: currentUser.name,
        items: cart.map(item => ({
          id: '',
          productId: item.product.id,
          productName: item.product.name,
          departmentId: selectedDepartmentForOrder,
          departmentName: selectedDepartmentNameForOrder,
          requestedBy: currentUser.name,
          quantity: item.quantity,
          status: 'COMPLETED',
          date: new Date().toLocaleString(),
          unit: item.product.unit
        }))
      };
      const isIngreso = selectedDepartmentForOrder === 'INGRESO' || selectedDepartmentNameForOrder === 'Ingreso de Proveedor';
      const prefix = isIngreso ? 'Albaran_de_Entrega' : 'Pedido_Interno';
      const title = isIngreso ? 'Albarán de Entrega' : 'Pedido Interno';
      const text = isIngreso ? 'Aquí tienes el albarán de entrega en formato PDF.' : 'Aquí tienes el pedido interno en formato PDF.';
      const filename = `${prefix}_${result.batchId}_${selectedDepartmentNameForOrder}.pdf`;
      sharePdfFromReactComponent(<OrderPdfDocument order={orderBatch} preview={false} />, filename, `${title} #${result.batchId}`, text).catch(console.error);
      
      if (result.lowStockItems && result.lowStockItems.length > 0) {
        setLowStockList(result.lowStockItems);
        setShowLowStockModal(true);
        playAlarm('warning');
      } else {
        setShowSuccessModal(true);
        playAlarm('success');
        setTimeout(() => {
          resetOrderState();
        }, 2000);
      }
    } else {
      setOrderError("Error al procesar el pedido.");
    }
  };

  const resetOrderState = () => {
    setCart([]);
    setShowSuccessModal(false);
    setShowLowStockModal(false);
    setSearchTerm('');
    setSelectedDepartmentForOrder(departments.length > 0 ? departments[0].id : ''); 
    setSelectedDepartmentNameForOrder(departments.length > 0 ? departments[0].name : '');
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const pDeptIds = p.departmentIds || (p.departmentId ? [p.departmentId] : []);
        return pDeptIds.includes(selectedDepartmentForOrder) &&
          (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          p.category.toLowerCase().includes(searchTerm.toLowerCase()));
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products, selectedDepartmentForOrder, searchTerm]);

  const isOrderButtonDisabled = cart.length === 0 || !selectedDepartmentForOrder || isProcessing;

  if (isLoadingProducts || isLoadingDepartments) {
    return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;
  }

  if (departments.length === 0 && currentUser.role === 'ADMIN') {
    return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        <ListTree size={60} className="text-gray-400 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-extrabold text-gray-700 dark:text-slate-200 drop-shadow-sm mb-2">No hay departamentos creados.</h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-sm">
          Como administrador, debes crear al menos un departamento en la pestaña de <span className="font-semibold text-red-600 dark:text-red-400">Inventario</span> para poder añadir productos y realizar pedidos.
        </p>
      </div>
    );
  } else if (departments.length === 0 && currentUser.role === 'STAFF') {
     return (
      <div className="flex flex-col h-full items-center justify-center p-4 text-center bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
        <ListTree size={60} className="text-gray-400 dark:text-slate-600 mb-4" />
        <h3 className="text-xl font-extrabold text-gray-700 dark:text-slate-200 drop-shadow-sm mb-2">Esperando departamentos...</h3>
        <p className="text-gray-500 dark:text-slate-400 max-w-sm">
          Tu administrador necesita configurar los departamentos para que puedas empezar a realizar pedidos.
        </p>
      </div>
     );
  }

  return (
    <div className="min-h-full flex flex-col lg:flex-row bg-gray-50 dark:bg-slate-950 relative font-sans transition-colors duration-300">
      
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeQtyModal}
              className="absolute inset-0 bg-black/40 dark:bg-slate-950/60 backdrop-blur-[2px]"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onAnimationComplete={() => {
                setTimeout(() => {
                  if (inputRef.current) {
                    inputRef.current.focus();
                    inputRef.current.select();
                  }
                }, 50);
              }}
              className="bg-white dark:bg-slate-900 w-full md:max-w-sm rounded-t-[2rem] md:rounded-[1.5rem] shadow-2xl overflow-hidden border-t md:border border-gray-100 dark:border-white/5 relative z-10"
            >
              {/* Mobile Drag Handle */}
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mt-4 mb-1 md:hidden" />
              
              <div className="px-6 py-4 flex justify-between items-center border-b border-gray-50 dark:border-white/5">
                <div className="min-w-0">
                  <h3 className="font-black text-lg text-gray-900 dark:text-white truncate leading-tight">{selectedProduct.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Disponible en Almacén: <span className="text-red-600 dark:text-red-500">{selectedProduct.quantity} {selectedProduct.unit}</span>
                  </p>
                  {selectedProduct.maxThreshold && (
                    <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-0.5">
                      Tope permitido en {selectedDepartmentNameForOrder}: <span className="font-black">{selectedProduct.maxThreshold} {selectedProduct.unit}</span>
                    </p>
                  )}
                </div>
                <button 
                  onClick={closeQtyModal} 
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQtyValue(prev => String(Math.max(1, parseInt(prev || '0') - 1)))}
                    className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center transition-all shadow-sm"
                  >
                    <Minus size={24} />
                  </motion.button>
                  
                  <div className="flex-1 flex flex-col items-center">
                    <input
                      ref={inputRef}
                      autoFocus
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={qtyValue}
                      onChange={(e) => setQtyValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && confirmAddToCart()}
                      className="w-full text-center text-4xl font-black bg-transparent text-slate-900 dark:text-white outline-none"
                      min="1"
                      max={selectedProduct.maxThreshold ? Math.min(selectedProduct.quantity, selectedProduct.maxThreshold) : selectedProduct.quantity}
                    />
                    <button 
                      onClick={() => setQtyValue(String(selectedProduct.maxThreshold ? Math.min(selectedProduct.quantity, selectedProduct.maxThreshold) : selectedProduct.quantity))}
                      className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-tighter hover:underline mt-1"
                    >
                      USAR LÍMITE PERMITIDO
                    </button>
                  </div>

                  <motion.button 
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setQtyValue(prev => String(Math.min(selectedProduct.quantity, parseInt(prev || '0') + 1)))}
                    className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center transition-all shadow-sm"
                  >
                    <Plus size={24} />
                  </motion.button>
                </div>

                {qtyError && (
                  <motion.div 
                    initial={{ x: -10 }}
                    animate={{ x: 0 }}
                    className="text-red-600 dark:text-red-400 text-[10px] font-bold text-center mb-4"
                  >
                    {qtyError}
                  </motion.div>
                )}

                <motion.button 
                  whileTap={{ scale: 0.98 }}
                  onClick={confirmAddToCart}
                  className="w-full py-4 bg-red-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-red-500/20 hover:bg-red-700 transition-all flex items-center justify-center gap-2"
                >
                  <span>AÑADIR AL PEDIDO</span>
                  <ArrowRight size={18} />
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirmModal(false)}
              className="absolute inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-t-[2.5rem] md:rounded-[2rem] shadow-2xl overflow-hidden border-t md:border border-gray-100 dark:border-white/5 relative z-10"
            >
              {/* Mobile Drag Handle */}
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mt-3 mb-1 md:hidden" />
              
              <div className="p-6 border-b border-gray-50 dark:border-slate-800/50">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white text-center drop-shadow-sm">Finalizar Pedido</h3>
                <p className="text-center text-gray-500 dark:text-slate-400 mt-1 text-sm font-medium">Estás solicitando <span className="text-red-600 dark:text-red-500 font-black">{cart.length} productos</span></p>
                
                <div className="mt-6">
                  <label htmlFor="department-select" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 ml-1">Área de Destino</label>
                  <div className="relative">
                    <select
                      id="department-select"
                      value={selectedDepartmentForOrder}
                      onChange={(e) => setSelectedDepartmentForOrder(e.target.value)}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/10 focus:border-red-500 outline-none transition-all bg-slate-50 dark:bg-slate-800/50 dark:text-white font-bold shadow-sm appearance-none pr-12"
                    >
                      {departments.map((dep) => (
                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center shadow-sm pointer-events-none border border-slate-100 dark:border-slate-600">
                      <ChevronDown className="text-slate-400 dark:text-slate-300" size={18} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-[35vh] overflow-y-auto p-6 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">{item.product.name}</span>
                      <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase">{item.product.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">Cant.</span>
                      <span className="font-black text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-xl text-sm border border-red-100 dark:border-red-900/30">
                        {item.quantity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 flex gap-4 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800/50">
                <button 
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-2xl font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-sm"
                >
                  VOLVER
                </button>
                <button 
                  onClick={processOrder}
                  disabled={isOrderButtonDisabled}
                  className="flex-[2] py-4 rounded-2xl font-black text-white bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/30 flex items-center justify-center gap-2 active:scale-[0.97] transition-all disabled:opacity-50 disabled:shadow-none text-sm"
                >
                  {isProcessing ? <Loader2 className="animate-spin text-white" size={20}/> : <><CheckCircle2 size={20} /> ENVIAR PEDIDO</>}
                </button>
              </div>
              {orderError && <div className="text-red-600 dark:text-red-400 font-bold text-center pb-6 px-6 text-xs">{orderError}</div>}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center bg-white dark:bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-white/5 max-w-xs w-full relative z-10"
            >
              <motion.div 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/40"
              >
                <CheckCircle2 size={48} className="text-white" />
              </motion.div>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 drop-shadow-sm leading-tight">¡Pedido<br/>Enviado!</h2>
              <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Almacén actualizado</p>
              
              <button 
                onClick={resetOrderState}
                className="mt-8 w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-2xl hover:opacity-90 active:scale-95 transition-all shadow-lg"
              >
                CONTINUAR
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLowStockModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"
              onClick={resetOrderState}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-10"
            >
              <div className="p-8 text-center">
                 <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100 dark:border-red-900/30">
                    <ShieldAlert size={32} className="text-red-600 dark:text-red-400" />
                 </div>
                 <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">Stock Crítico</h3>
                 <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Atención requerida</p>

                 <div className="mt-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 mb-8 border border-slate-100 dark:border-slate-800/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Productos por debajo del mínimo:</p>
                    <ul className="space-y-3">
                      {lowStockList.map((name, i) => (
                        <li key={i} className="flex items-center justify-center gap-2 font-black text-red-600 dark:text-red-400 text-base uppercase tracking-tighter italic">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" /> {name}
                        </li>
                      ))}
                    </ul>
                 </div>
                 <button 
                    onClick={resetOrderState}
                    className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl hover:bg-red-600 dark:hover:bg-red-500 dark:hover:text-white transition-all active:scale-[0.97] shadow-xl shadow-slate-900/20 uppercase tracking-widest text-xs"
                 >
                    Entendido, Cerrar
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:pb-0">
        <div className="sticky top-[calc(var(--header-h)+2px)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl px-4 py-4 md:px-6 border-b border-gray-200 dark:border-white/5 shadow-sm z-30 space-y-4 transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5 rounded-b-2xl md:rounded-b-none">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="flex flex-col">
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-1 ml-1"
                >
                  Nuevo Pedido
                </motion.span>
                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none italic">
                  Gestión de <span className="text-red-600 drop-shadow-sm uppercase not-italic">Insumos</span>
                </h2>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative group/dept">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400 z-10 pointer-events-none transition-transform group-hover/dept:scale-110">
                    <LayoutGrid size={16} strokeWidth={2.5} />
                  </div>
                  <select
                    id="catalog-department-select"
                    value={selectedDepartmentForOrder}
                    onChange={(e) => setSelectedDepartmentForOrder(e.target.value)}
                    className="min-w-[140px] md:min-w-[180px] pl-10 pr-10 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 outline-none transition-all shadow-sm appearance-none font-black text-xs text-indigo-700 dark:text-indigo-400 uppercase tracking-widest cursor-pointer hover:border-indigo-200 dark:hover:border-indigo-700"
                  >
                    <option value="" disabled>Seleccionar Área</option>
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none">
                    <ChevronDown size={14} strokeWidth={3} />
                  </div>
                </div>

                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Buscar producto..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-xs focus:border-red-500 outline-none transition-all bg-gray-50 dark:bg-slate-800/60 dark:text-white placeholder-gray-500 dark:placeholder-slate-400 shadow-sm font-bold text-gray-900"
                  />
                </div>
              </div>
            </div>
        </div>

        <div className="p-4 md:p-6 bg-gray-50 dark:bg-slate-950 transition-colors duration-300 pb-40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product, index) => {
               const inCart = cart.find(c => c.product.id === product.id);
               const currentInCart = inCart?.quantity || 0;
               const available = product.quantity - currentInCart;
               const isJustAdded = justAddedId === product.id;

               return (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.25 }}
                  key={product.id} 
                  className={`group relative bg-white dark:bg-slate-900 p-4 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-white/5 transition-all duration-300 min-h-[130px] flex flex-col justify-between
                    ${available <= 0 
                      ? 'bg-red-50/30 border-red-200 dark:bg-red-900/10 dark:border-red-900/20 shadow-red-500/5' 
                      : 'hover:border-red-500/50 dark:hover:border-red-500/50 hover:shadow-xl hover:shadow-red-500/5'}
                  `}
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => available > 0 && openQtyModal(product)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex-1 pr-8">
                        <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors tracking-tighter uppercase">{product.name}</h3>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-[0.2em]">{product.category}</p>
                      </div>
                      {inCart && (
                        <motion.span 
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded-lg shadow-lg shadow-indigo-600/20 shrink-0"
                        >
                          {inCart.quantity}
                        </motion.span>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-3 flex flex-col gap-2">
                      <div className={`inline-flex items-center self-start px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-[0.1em] shadow-sm border transition-colors ${
                        available <= 0 
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30' 
                        : 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-900/30'
                      }`}>
                        {available <= 0 ? (
                          <span className="flex items-center gap-1.5 opacity-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            SIN EXISTENCIAS
                          </span>
                        ) : (
                          <div className="flex items-center">
                            <span className="opacity-50 mr-2 font-bold">STOCK:</span>
                            <span className="text-slate-900 dark:text-white text-xs">{available}</span>
                            <span className="ml-1 opacity-50 lowercase font-medium">{product.unit}</span>
                          </div>
                        )}
                      </div>
                      
                      {product.maxThreshold && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-dashed border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 self-start">
                          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                          <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">
                            Tope Área: {product.maxThreshold}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {available > 0 && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        quickAddToCart(product);
                      }}
                      className={`absolute bottom-3 right-3 w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-all z-10
                        ${isJustAdded 
                          ? 'bg-green-500 text-white shadow-green-500/40' 
                          : 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30'}
                      `}
                    >
                      {isJustAdded ? <CheckCircle2 size={22} /> : <Plus size={22} />}
                      <AnimatePresence>
                        {isJustAdded && (
                          <motion.div
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-green-500 rounded-2xl"
                          />
                        )}
                      </AnimatePresence>
                    </motion.button>
                  )}
                </motion.div>
               );
            })}
          </div>
        </div>
      </div>

      <motion.div 
        initial={false}
        animate={{ y: showMobileCart ? 0 : '100%' }}
        className={`
          fixed lg:relative inset-x-0 bottom-0 z-50 lg:z-auto
          w-full lg:w-96 
          bg-white dark:bg-slate-900 
          border-t lg:border-l lg:border-t-0 border-gray-100 dark:border-slate-800 
          shadow-[0_-10px_40px_rgba(0,0,0,0.1)] lg:shadow-xl 
          flex flex-col 
          h-[85vh] lg:h-full 
          transition-transform duration-300 ease-out
          rounded-t-3xl lg:rounded-none
          lg:translate-y-0
      `}>
        <div 
          className="lg:hidden w-full p-4 flex justify-center items-center border-b border-gray-100 dark:border-slate-800 cursor-pointer"
          onClick={() => setShowMobileCart(false)}
        >
           <div className="w-12 h-1.5 bg-gray-300 dark:bg-slate-700 rounded-full mb-1"></div>
        </div>

        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 flex justify-between items-center rounded-t-3xl lg:rounded-none">
          <div>
            <h3 className="font-extrabold text-gray-900 dark:text-white text-xl tracking-tight">Tu Pedido</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">
              {cart.length > 0 ? `Para: ${selectedDepartmentNameForOrder}` : 'Añade productos para empezar.'}
            </p>
          </div>
          <div className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm">
            {cart.length}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-slate-700 space-y-4">
              <ShoppingCart size={64} strokeWidth={1.5} />
              <p className="text-lg font-bold">Carrito Vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between bg-white dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700/50 p-4 rounded-2xl shadow-sm group hover:border-red-100 dark:hover:border-red-500/30 transition-colors">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-base text-gray-900 dark:text-white truncate">{item.product.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate mt-1">{item.product.departmentName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => updateQuantityInCart(item.product.id, -1)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 font-bold active:scale-95 transition-all outline-none border border-slate-200 dark:border-slate-700"><Minus size={18} /></button>
                  <span className="font-black text-lg w-8 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantityInCart(item.product.id, 1)} className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-600 font-bold active:scale-95 transition-all outline-none border border-slate-200 dark:border-slate-700"><Plus size={18} /></button>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-400 hover:text-red-500 ml-2 transition-colors p-3 -mr-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-95"><Trash2 size={20} /></button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 pb-safe lg:pb-6">
          <button 
            onClick={() => setShowConfirmModal(true)}
            disabled={isOrderButtonDisabled}
            className="w-full py-5 rounded-2xl font-extrabold text-xl shadow-lg transition-all flex items-center justify-center gap-3 transform active:scale-[0.98]
              bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 dark:disabled:bg-slate-700 disabled:text-gray-400"
          >
            <CheckCircle2 size={24} /> 
            <span className="tracking-[0.05em]">FINALIZAR PEDIDO</span>
          </button>
        </div>
      </motion.div>
      
      {showMobileCart && <div className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setShowMobileCart(false)}></div>}
    </div>
  );
};

export default Replenishment;
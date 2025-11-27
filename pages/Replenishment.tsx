import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Department, Product, User } from '../types';
import { storageService } from '../services/storageService';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, X, ArrowRight, ChevronUp, AlertTriangle, Siren, Loader2, Tag, Filter, UtensilsCrossed, Wine, Coffee } from 'lucide-react';

interface ReplenishmentProps {
  currentUser: User;
}

interface CartItem {
  product: Product;
  quantity: number;
}

// SMART FILTERING CONFIGURATION
// This defines exactly what appears in each tab to keep lists clean and relevant.
interface DepartmentConfig {
  allowedCategories: string[];       // Main categories to show (e.g. 'Bebidas')
  allowedSubcategories: string[];    // Specific subcategories to INCLUDE even if main category isn't allowed (e.g. 'Bollería' in Gastro Bar)
  excludedCategories: string[];      // Categories to NEVER show
  excludedSubcategories: string[];   // Specific subcategories to NEVER show (overrides inclusion)
}

const DEPARTMENT_RULES: Record<Department, DepartmentConfig> = {
  [Department.BAR]: {
    // BAR: Drinks, Coffee, Milk, specific Breakfast drinks (Cacao) and specific Alcohol types.
    allowedCategories: ['Bebidas', 'Alcohol', 'Vinos', 'Cafetería', 'Lácteos', 'Cristalería'],
    // Explicitly allow Cacao (Cola Cao) even if it's in 'Desayuno', and ensure specific drink types are visible
    allowedSubcategories: ['Hielo', 'Frutas Coctelería', 'Agua', 'Zumos', 'Batidos', 'Cacao', 'Infusiones', 'Whisky', 'Licores', 'Cerveza', 'Ginebra', 'Ron'], 
    // Removed 'Desayuno' from excludedCategories to allow Cola Cao, but will strictly exclude solid food in excludedSubcategories
    excludedCategories: ['Cocina', 'Alimentación', 'Limpieza', 'Tienda', 'General', 'Helados'],
    // Block solid food from Breakfast/Kitchen
    excludedSubcategories: ['Bollería', 'Pan', 'Comida', 'Snacks', 'Galletas', 'Aperitivos', 'Tapas', 'Cereales', 'Mermelada']
  },
  [Department.GASTRO_BAR]: {
    // GASTRO BAR: STRICTLY FOOD SNACKS + WINE + WATER. NO SOFT DRINKS.
    allowedCategories: ['Helados', 'Vinos'], 
    // Explicitly allow ready-to-eat food types only + Agua
    allowedSubcategories: ['Bollería', 'Pan', 'Galletas', 'Snacks', 'Aperitivos', 'Frutos Secos', 'Tapas', 'Sandwiches', 'Fruta', 'Hamburguesas', 'Pizzas', 'Agua'], 
    excludedCategories: ['Bebidas', 'Alcohol', 'Cafetería', 'Lácteos', 'Limpieza', 'General', 'Menaje', 'Tienda', 'Cocina', 'Carnes', 'Pescados', 'Verduras', 'Despensa', 'Especias'],
    excludedSubcategories: ['Leche', 'Café', 'Refrescos', 'Cerveza', 'Copas', 'Arroz', 'Harina', 'Licores', 'Whisky', 'Ginebra', 'Ron'] 
  },
  [Department.COCINA]: {
    // KITCHEN: Raw ingredients & Cooking supplies. 
    allowedCategories: ['Cocina', 'Alimentación', 'Especias', 'Frutas', 'Verduras', 'Carnes', 'Pescados', 'Congelados', 'Despensa', 'Salsas'],
    allowedSubcategories: ['Aceite', 'Vinagre', 'Condimentos', 'Harinas', 'Pan'],
    excludedCategories: ['Bebidas', 'Alcohol', 'Vinos', 'Limpieza', 'Tienda', 'General', 'Cristalería', 'Desayuno', 'Lácteos', 'Cafetería', 'Helados'], 
    excludedSubcategories: ['Refrescos', 'Cerveza', 'Vino', 'Alcohol', 'Licores', 'Agua', 'Café', 'Infusiones', 'Copas', 'Galletas', 'Leche', 'Snacks'] 
  },
  [Department.LIMPIEZA]: {
    // CLEANING: Only cleaning stuff.
    allowedCategories: ['Limpieza', 'Mantenimiento'],
    allowedSubcategories: ['Papel', 'Químicos', 'Desechables', 'Utensilios Limpieza', 'Bolsas'],
    excludedCategories: ['Bebidas', 'Alcohol', 'Cocina', 'Alimentación', 'Tienda', 'Desayuno', 'Lácteos', 'Cafetería', 'Vinos'],
    excludedSubcategories: []
  },
  [Department.TIENDA_REGALOS]: {
    allowedCategories: ['Tienda de Regalos', 'Tienda', 'Souvenirs'],
    allowedSubcategories: [],
    excludedCategories: ['Cocina', 'Limpieza', 'Bebidas', 'Alcohol'],
    excludedSubcategories: []
  },
  [Department.GENERAL]: {
    allowedCategories: ['General', 'Otros', 'Oficina', 'Mantenimiento', 'Papelería'],
    allowedSubcategories: [],
    excludedCategories: [],
    excludedSubcategories: []
  }
};

const Replenishment: React.FC<ReplenishmentProps> = ({ currentUser }) => {
  const [department, setDepartment] = useState<Department>(
    storageService.getDraftDepartment() || Department.BAR
  );
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('Todos');
  
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
    storageService.saveDraftDepartment(department);
    setSelectedSubcategory('Todos'); // Reset sub filter when changing department
  }, [department]);

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
    
    const result = await storageService.submitOrderBatch(cart, department, currentUser);
    
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
  };

  // --- STRICT SMART FILTERING LOGIC ---
  const filteredProducts = products.filter(p => {
    // 1. Basic availability check
    if (p.quantity <= 0) return false;

    const config = DEPARTMENT_RULES[department];
    if (!config) return false;

    // 2. EXCLUSION (Priority 1): 
    // If the Category OR Subcategory is strictly forbidden, hide it immediately.
    // e.g. "Bebidas" are forbidden in "Cocina". "Bollería" is forbidden in "Bar".
    if (config.excludedCategories.includes(p.category)) return false;
    if (p.subcategory && config.excludedSubcategories.includes(p.subcategory)) return false;

    // 3. INCLUSION (Priority 2):
    // A) Is the Main Category allowed?
    const isCategoryAllowed = config.allowedCategories.includes(p.category);
    
    // B) Is the Subcategory specifically allowed? (Injection)
    // e.g. "Pan" is allowed in Gastro Bar even if "Cocina" category isn't.
    const isSubcategoryAllowed = p.subcategory && config.allowedSubcategories.includes(p.subcategory);

    // If neither allows it, hide it.
    if (!isCategoryAllowed && !isSubcategoryAllowed) {
      return false;
    }

    // 4. SEARCH TERM
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(searchTerm.toLowerCase()));
      
    if (!matchesSearch) return false;

    // 5. CHIP FILTER (Subcategory selection bar)
    if (selectedSubcategory !== 'Todos' && p.subcategory !== selectedSubcategory) return false;

    return true;
  });

  // Extract unique subcategories ONLY from the products visible in this department
  const availableSubcategories = useMemo(() => {
    const subs = new Set<string>();
    const config = DEPARTMENT_RULES[department];
    
    if (!config) return [];

    products.forEach(p => {
        if (p.quantity <= 0) return;
        
        // Run strict exclusion first
        if (config.excludedCategories.includes(p.category)) return;
        if (p.subcategory && config.excludedSubcategories.includes(p.subcategory)) return;

        // Run inclusion
        const catAllowed = config.allowedCategories.includes(p.category);
        const subAllowed = p.subcategory && config.allowedSubcategories.includes(p.subcategory);
        
        if ((catAllowed || subAllowed) && p.subcategory) {
           subs.add(p.subcategory);
        }
    });
    return Array.from(subs).sort();
  }, [products, department]);

  if (loading) return <div className="flex h-full items-center justify-center"><Loader2 size={40} className="animate-spin text-red-600" /></div>;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden bg-gray-50 dark:bg-slate-900 relative font-sans transition-colors duration-300">
      
      {/* 1. QUANTITY INPUT MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/70 dark:bg-slate-900/90 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 w-full md:max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-transparent dark:border-slate-700/50">
            <div className="bg-gray-900 dark:bg-slate-950 p-5 text-white flex justify-between items-center">
              <div>
                <p className="text-sm opacity-80 uppercase tracking-wider font-bold">Añadir Producto</p>
                <h3 className="font-extrabold text-2xl truncate">{selectedProduct.name}</h3>
              </div>
              <button onClick={closeQtyModal} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X size={28} /></button>
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
                  className="flex-1 h-16 text-center text-4xl font-extrabold border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl focus:border-red-600 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-500/30 outline-none"
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
                className="w-full py-5 bg-red-600 text-white text-xl font-extrabold rounded-2xl shadow-xl shadow-red-200 dark:shadow-none hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
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
           <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-transparent dark:border-slate-700/50">
              <div className="p-6 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white text-center">Confirmar Pedido</h3>
                <p className="text-center text-gray-500 dark:text-slate-400 mt-1">Vas a solicitar <b>{cart.length} productos</b> para <b>{department}</b></p>
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
                  className="flex-1 py-4 rounded-xl font-bold text-gray-600 dark:text-slate-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600"
                >
                  Cancelar
                </button>
                <button 
                  onClick={processOrder}
                  disabled={isProcessing}
                  className="flex-1 py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 shadow-lg shadow-green-200 dark:shadow-none flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="animate-spin"/> : <><CheckCircle2 /> Confirmar</>}
                </button>
              </div>
           </div>
        </div>
      )}

      {/* 3. SUCCESS MODAL */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="text-center">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl animate-bounce">
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
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-slide-up border-2 border-red-500 text-center">
            <div className="bg-red-600 text-white p-6 flex flex-col items-center">
               <Siren size={48} className="animate-pulse mb-2" />
               <h3 className="text-2xl font-black uppercase tracking-tight">¡ATENCIÓN!</h3>
               <p className="font-bold opacity-90">STOCK BAJO EN ALMACÉN</p>
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
                  className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl hover:bg-black dark:hover:bg-gray-200 transition-colors"
               >
                 Entendido, Aceptar
               </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CATALOG --- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden pb-20 lg:pb-0">
        <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700/50 shadow-soft z-10 transition-colors duration-300">
           
           {/* DEPARTMENTS SCROLL */}
           <div className="flex overflow-x-auto pb-0 gap-1 no-scrollbar pt-2 px-2 md:px-4">
             {Object.values(Department).map((dep) => (
               <button
                 key={dep}
                 onClick={() => setDepartment(dep)}
                 className={`px-5 py-3 rounded-t-xl text-sm font-bold whitespace-nowrap transition-all border-t border-l border-r ${
                   department === dep 
                     ? 'bg-gray-50 dark:bg-slate-900 text-red-600 dark:text-red-400 border-gray-200 dark:border-slate-700 border-b-0 translate-y-[1px] z-10' 
                     : 'bg-white dark:bg-slate-800 text-gray-400 dark:text-slate-500 border-transparent hover:bg-gray-50 dark:hover:bg-slate-750'
                 }`}
               >
                 {dep}
               </button>
             ))}
           </div>
           
           {/* FILTERS AND SEARCH */}
           <div className="p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700">
             
             <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={20} />
                <input 
                  type="text" 
                  placeholder={`Buscar en ${department}...`} 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-base focus:border-red-500 dark:focus:border-red-500 focus:ring-0 outline-none transition-all dark:text-white placeholder-gray-400 dark:placeholder-slate-500 shadow-sm"
                />
             </div>

             {/* SUBCATEGORY CHIPS */}
             <div className="flex overflow-x-auto gap-2 no-scrollbar pb-1">
               <div className="flex items-center pr-2 text-gray-400">
                  <Filter size={14} />
               </div>
               <button
                  onClick={() => setSelectedSubcategory('Todos')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedSubcategory === 'Todos'
                      ? 'bg-red-600 text-white border-red-600'
                      : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700'
                  }`}
               >
                 Todos
               </button>
               {availableSubcategories.map(sub => (
                 <button
                   key={sub}
                   onClick={() => setSelectedSubcategory(sub)}
                   className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                     selectedSubcategory === sub
                       ? 'bg-red-600 text-white border-red-600 shadow-md'
                       : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-red-300 dark:hover:border-slate-500'
                   }`}
                 >
                   {sub}
                 </button>
               ))}
               {availableSubcategories.length === 0 && (
                 <span className="text-xs text-gray-400 italic py-1.5 px-2">Sin subcategorías</span>
               )}
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-slate-900 transition-colors duration-300">
          {filteredProducts.length === 0 && !loading ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-60">
                <Search size={48} className="mb-4" />
                <p className="font-bold">No hay productos disponibles para {department}</p>
                <p className="text-xs mt-2">Intenta cambiar de departamento o limpiar filtros.</p>
             </div>
          ) : (
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
                    className={`text-left group relative bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border-2 transition-all duration-200 min-h-[140px] flex flex-col justify-between
                      ${available <= 0 
                        ? 'opacity-50 border-transparent bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed grayscale' 
                        : 'border-transparent hover:border-red-500 dark:hover:border-red-500 hover:shadow-xl dark:hover:shadow-none active:scale-[0.98]'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-2">
                        <h3 className="text-lg md:text-xl font-extrabold text-gray-900 dark:text-white leading-snug line-clamp-2">{product.name}</h3>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{product.category}</span>
                          {product.subcategory && (
                             <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 uppercase tracking-wide bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">{product.subcategory}</span>
                          )}
                        </div>
                      </div>
                      {inCart && (
                        <span className="bg-red-600 text-white text-sm font-bold px-2 py-1 rounded-lg shadow-md animate-fade-in shrink-0">
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
          )}
        </div>
      </div>

      {/* --- CART SLIDER --- */}
      <div className={`lg:hidden fixed bottom-[70px] left-4 right-4 z-40 transition-transform duration-300 ${cart.length > 0 && !showMobileCart ? 'translate-y-0' : 'translate-y-[150%]'}`}>
         <button 
           onClick={() => setShowMobileCart(true)}
           className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 p-4 rounded-2xl shadow-xl flex items-center justify-between font-bold"
         >
            <div className="flex items-center gap-3">
               <span className="bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center text-sm">{cart.length}</span>
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
            <p className="text-sm text-gray-500 dark:text-slate-400 font-medium mt-1">Para: <span className="text-red-600 dark:text-red-400 uppercase font-black">{department}</span></p>
          </div>
          <div className="bg-gray-900 dark:bg-white dark:text-slate-900 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
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
                  <button onClick={() => updateQuantityInCart(item.product.id, -1)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-600 flex items-center justify-center hover:bg-gray-200 font-bold"><Minus size={14} /></button>
                  <span className="font-bold text-lg w-8 text-center text-gray-900 dark:text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantityInCart(item.product.id, 1)} className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-600 flex items-center justify-center hover:bg-gray-200 font-bold"><Plus size={14} /></button>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-gray-300 hover:text-red-500 ml-2 transition-colors p-2"><Trash2 size={18} /></button>
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
              bg-red-600 text-white hover:bg-red-700 hover:shadow-red-200 dark:shadow-none disabled:bg-gray-100 dark:disabled:bg-slate-700 disabled:text-gray-400"
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
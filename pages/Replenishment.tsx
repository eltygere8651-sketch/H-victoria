import React, { useState, useEffect, useRef } from 'react';
import { Product, AuthenticatedUser, CartItem, Department } from '../types';
import * as storageService from '../services/storageService';
import { Search, ShoppingCart, Plus, Minus, Trash2, CheckCircle2, X, ArrowRight, Package, Loader2, ChevronDown, ListTree } from 'lucide-react';

interface ReplenishmentProps {
  currentUser: AuthenticatedUser;
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  showMobileCart: boolean;
  setShowMobileCart: React.Dispatch<React.SetStateAction<boolean>>;
}

const Replenishment: React.FC<ReplenishmentProps> = ({ currentUser, cart, setCart, showMobileCart, setShowMobileCart }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartmentForOrder, setSelectedDepartmentForOrder] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyValue, setQtyValue] = useState<string>('1');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubProducts = storageService.subscribeToProducts(setProducts);
    const unsubDepartments = storageService.subscribeToDepartments(data => {
      setDepartments(data);
      if (data.length > 0 && !selectedDepartmentForOrder) {
        setSelectedDepartmentForOrder(data[0].id);
      }
      setIsLoading(false);
    });
    return () => { unsubProducts(); unsubDepartments(); };
  }, [selectedDepartmentForOrder]);

  const openQtyModal = (product: Product) => { setSelectedProduct(product); setQtyValue('1'); };
  const closeQtyModal = () => setSelectedProduct(null);

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    const qty = parseInt(qtyValue);
    if (isNaN(qty) || qty <= 0 || qty > selectedProduct.quantity) return;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === selectedProduct.id);
      if (existing) {
        return prev.map(item => item.product.id === selectedProduct.id ? { ...item, quantity: item.quantity + qty } : item);
      }
      return [...prev, { product: selectedProduct, quantity: qty }];
    });
    closeQtyModal();
  };
  
  const processOrder = async () => {
    if (cart.length === 0 || !selectedDepartmentForOrder) return;
    setIsProcessing(true);
    const departmentName = departments.find(d => d.id === selectedDepartmentForOrder)?.name || 'N/A';
    await storageService.submitOrderBatch(cart, selectedDepartmentForOrder, departmentName, currentUser);
    setIsProcessing(false);
    setShowConfirmModal(false);
    setCart([]);
  };

  const filteredProducts = products.filter(p => p.quantity > 0 && p.departmentId === selectedDepartmentForOrder && p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (departments.length === 0) return <div className="p-8 text-center"><ListTree /> Debes crear departamentos en Inventario.</div>;
  
  return (
    <div className="h-full flex">
        <div className="flex-1 flex flex-col">
            <div className="p-4 border-b">
                <select value={selectedDepartmentForOrder} onChange={e => setSelectedDepartmentForOrder(e.target.value)}><option value="" disabled>Selecciona Dpto.</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
                <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} />
            </div>
            <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4">
                {filteredProducts.map(p => {
                    const inCart = cart.find(c=>c.product.id===p.id);
                    return <button key={p.id} onClick={()=>openQtyModal(p)} className="text-left p-4 border rounded-lg"><h3>{p.name}</h3><p>Stock: {p.quantity - (inCart?.quantity||0)}</p></button>
                })}
            </div>
        </div>
        <div className="w-96 border-l p-4 flex flex-col">
            <h3 className="font-bold">Tu Pedido</h3>
            <div className="flex-1 space-y-2">{cart.map(i=><div key={i.product.id}>{i.product.name} x {i.quantity}</div>)}</div>
            <button onClick={()=>setShowConfirmModal(true)} disabled={cart.length === 0}>FINALIZAR PEDIDO</button>
        </div>

        {selectedProduct && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded-lg"><h3 className="font-bold">{selectedProduct.name}</h3><p>Stock: {selectedProduct.quantity}</p><input type="number" value={qtyValue} onChange={e=>setQtyValue(e.target.value)} min="1" max={selectedProduct.quantity} /><button onClick={confirmAddToCart}>Añadir</button><button onClick={closeQtyModal}>X</button></div></div>}
        {showConfirmModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white p-6 rounded-lg"><h3 className="font-bold">Confirmar Pedido</h3><p>Vas a solicitar {cart.length} productos.</p><button onClick={processOrder} disabled={isProcessing}>{isProcessing?<Loader2/>:<CheckCircle2/>}Confirmar</button><button onClick={()=>setShowConfirmModal(false)}>Cancelar</button></div></div>}
    </div>
  );
};

export default Replenishment;
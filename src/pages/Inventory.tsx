import React, { useEffect, useState, useMemo } from 'react';
import { Product, UserRole, User, Department, OrderBatch } from '../types';
import * as storageService from '../services/storageService';
import { Search, Plus, AlertTriangle, Edit2, Trash2, X, Save, Loader2, ListTree, ChevronDown, RefreshCw, Sparkles, Wand2, PackagePlus, ArrowRight, CheckCircle2, FileText, Share2, ShieldAlert } from 'lucide-react';
import { sharePdfFromReactComponent } from '../utils/pdfGenerator';
import { OrderPdfDocument } from '../components/OrderPdfDocument';

interface InventoryProps {
  currentUser: User;
  notificationVolume?: number;
  soundType?: string;
}

const UNIT_OPTIONS = ['unidades', 'botellin', 'bot', 'porcion', 'bote', 'packs', 'caja', 'kilo', 'sobres', 'tercio', 'litro'];

const Inventory: React.FC<InventoryProps> = ({ currentUser, notificationVolume = 0.3, soundType = 'Default' }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('all');
  
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editProductForm, setEditProductForm] = useState<Partial<Product>>({});
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showDeveloperRestrictedModal, setShowDeveloperRestrictedModal] = useState(false);
  const [showManageDepartmentsModal, setShowManageDepartmentsModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [isDeletingDept, setIsDeletingDept] = useState<string | null>(null);
  const [deptToDelete, setDeptToDelete] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [smartSuggestion, setSmartSuggestion] = useState(false);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const existingCategories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [products]);

  // Receive Stock Feature State
  const [showReceiveStockModal, setShowReceiveStockModal] = useState(false);
  const [receiveSearchTerm, setReceiveSearchTerm] = useState('');
  const [receiveItems, setReceiveItems] = useState<{ product: Product, quantityToAdd: number }[]>([]);
  const [selectedProductToReceive, setSelectedProductToReceive] = useState<Product | null>(null);
  const [receiveQuantityInput, setReceiveQuantityInput] = useState('');

  useEffect(() => {
    if (!editProductForm.id && editProductForm.name) {
      const nameLower = editProductForm.name.toLowerCase();
      
      const isCafe = ['cafe', 'café', 'te', 'té', 'leche', 'batido', 'colacao', 'nesquik', 'infusión', 'manzanilla', 'poleo'].some(k => nameLower.includes(k.toLowerCase()));
      const isDrink = ['agua', 'zumo', 'refresco', 'cola', 'fanta', 'sprite', 'gaseosa', 'tónica'].some(k => nameLower.includes(k.toLowerCase()));
      const isAlcohol = ['cerveza', 'vino', 'licor', 'ron', 'ginebra', 'vodka', 'whisky', 'vermut', 'mahou', 'alhambra', 'estrella'].some(k => nameLower.includes(k.toLowerCase()));
      const isFood = ['pan', 'harina', 'azucar', 'sal', 'aceite', 'carne', 'pescado', 'pollo', 'verdura', 'fruta', 'queso', 'arroz', 'pasta', 'salsa', 'yogur', 'mermelada'].some(k => nameLower.includes(k.toLowerCase()));
      const isSupply = ['servilleta', 'vaso', 'plato', 'cubierto', 'papel', 'limpieza', 'jabon', 'jabón', 'bolsa'].some(k => nameLower.includes(k.toLowerCase()));

      let suggestedCategory = editProductForm.category;
      let suggestedDeptIds = editProductForm.departmentIds || [];
      let suggestedUnit = editProductForm.unit;
      let changed = false;

      const barDept = departments.find(d => d.id === 'd-bar' || d.name.toLowerCase().includes('bar') || d.name.toLowerCase().includes('cafeteria'));
      const restDept = departments.find(d => d.id === 'd-restaurante' || d.name.toLowerCase().includes('restaurante'));

      if (isCafe && !editProductForm.category) {
        suggestedCategory = 'Cafetería';
        suggestedUnit = suggestedUnit || 'unidades';
        if (suggestedDeptIds.length === 0 && barDept) suggestedDeptIds = [barDept.id];
        changed = true;
      } else if (isAlcohol && !editProductForm.category) {
        suggestedCategory = 'Licores/Cervezas';
        suggestedUnit = suggestedUnit || 'botel';
        if (suggestedDeptIds.length === 0 && barDept) suggestedDeptIds = [barDept.id];
        changed = true;
      } else if (isDrink && !editProductForm.category) {
        suggestedCategory = 'Refrescos';
        suggestedUnit = suggestedUnit || 'bot';
        if (suggestedDeptIds.length === 0 && barDept) suggestedDeptIds = [barDept.id];
        changed = true;
      } else if (isFood && !editProductForm.category) {
        suggestedCategory = 'Cocina/Despensa';
        suggestedUnit = suggestedUnit || 'kilo';
        if (suggestedDeptIds.length === 0 && restDept) suggestedDeptIds = [restDept.id];
        changed = true;
      } else if (isSupply && !editProductForm.category) {
        suggestedCategory = 'Suministros';
        suggestedUnit = suggestedUnit || 'packs';
        if (suggestedDeptIds.length === 0 && barDept) suggestedDeptIds = [barDept.id];
        changed = true;
      }

      if (changed) {
        setEditProductForm(prev => ({
          ...prev,
          category: suggestedCategory,
          unit: suggestedUnit,
          departmentIds: suggestedDeptIds
        }));
        setSmartSuggestion(true);
      }
    } else if (!editProductForm.name) {
      setSmartSuggestion(false);
    }
  }, [editProductForm.name, editProductForm.id, departments]);

  useEffect(() => {
    const unsubscribeProducts = storageService.subscribeToProducts((data) => {
      setProducts(data);
      setLoading(false);
    });
    const unsubscribeDepartments = storageService.subscribeToDepartments((data) => {
      setDepartments(data);
    });
    return () => {
      unsubscribeProducts();
      unsubscribeDepartments();
    };
  }, []);

  const audioContextRef = React.useRef<AudioContext | null>(null);

  const playFeedbackSound = (alertType: 'success' | 'info' = 'info') => {
    if (notificationVolume <= 0) return;
    try {
      if (!audioContextRef.current) {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtor) return;
        audioContextRef.current = new AudioCtor();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const t = ctx.currentTime;
      const vol = notificationVolume * notificationVolume;

      const playBeep = (timeOffset: number, freq: number, duration: number, type: OscillatorType) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t + timeOffset);
        const start = t + timeOffset;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.05);
        g.gain.linearRampToValueAtTime(vol, start + duration - 0.05);
        g.gain.linearRampToValueAtTime(0, start + duration);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(start);
        o.stop(start + duration + 0.05);
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

      if (alertType === 'success') {
        playTonePattern(0);
        playTonePattern(0.6);
        playTonePattern(1.2);
      } else {
        if (type === 'modern') playBeep(0, 1046, 0.15, 'sine');
        else if (type === 'crystal') playBeep(0, 1975, 0.1, 'triangle');
        else if (type === 'retro') playBeep(0, 784, 0.15, 'square');
        else playBeep(0, 2500, 0.2, 'square');
      }
    } catch (e) { console.error(e); }
  };

  const isDeveloper = storageService.auth.currentUser?.email === storageService.SUPER_ADMIN_EMAIL || !!currentUser.isSuperAdmin;

  const handleSaveProduct = async () => {
    if (!isDeveloper && !editProductForm.id) {
      setShowDeveloperRestrictedModal(true);
      return;
    }
    const deptIds = editProductForm.departmentIds || (editProductForm.departmentId ? [editProductForm.departmentId] : []);
    if (!editProductForm.name || deptIds.length === 0) {
      setFormError('El nombre y al menos un área son obligatorios.');
      return;
    }
    setFormError('');
    setLoading(true);
    const primaryDeptId = deptIds[0];
    const primaryDept = departments.find(d => d.id === primaryDeptId);
    const deptNames = deptIds.map(id => departments.find(d => d.id === id)?.name || 'Desconocido');

    await storageService.saveProduct({
      id: editProductForm.id || undefined,
      name: editProductForm.name,
      category: editProductForm.category || 'General',
      quantity: Number(editProductForm.quantity) || 0,
      unit: editProductForm.unit || 'unidades',
      minThreshold: Number(editProductForm.minThreshold) || 5,
      maxThreshold: editProductForm.maxThreshold ? Number(editProductForm.maxThreshold) : undefined,
      departmentId: primaryDeptId,
      departmentName: primaryDept?.name || 'Desconocido',
      departmentIds: deptIds,
      departmentNames: deptNames
    }, currentUser.name);
    setShowEditProductModal(false);
    setEditProductForm({});
    setLoading(false);
  };

  const handleSaveDepartment = async () => {
    if (!isDeveloper) {
      setShowDeveloperRestrictedModal(true);
      return;
    }
    if (!newDepartmentName.trim()) return;
    await storageService.saveDepartment({ id: editingDepartment?.id || undefined, name: newDepartmentName.trim() });
    setEditingDepartment(null);
    setNewDepartmentName('');
  };

  const handleDeleteDepartment = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDeveloper) {
      setShowDeveloperRestrictedModal(true);
      return;
    }
    setDeptToDelete(id);
  };

  const confirmDeleteDepartment = async () => {
    if (!isDeveloper) {
      setShowDeveloperRestrictedModal(true);
      return;
    }
    if (!deptToDelete) return;
    setIsDeletingDept(deptToDelete);
    await storageService.deleteDepartment(deptToDelete);
    setIsDeletingDept(null);
    setDeptToDelete(null);
  };

  const departmentOptions = useMemo(() => {
    return departments.map(dep => (
      <option key={dep.id} value={dep.id}>{dep.name.toUpperCase()}</option>
    ));
  }, [departments]);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase();
    return products.filter(p => {
      const pDeptIds = p.departmentIds || (p.departmentId ? [p.departmentId] : []);
      const matchesDept = selectedDepartmentFilter === 'all' || pDeptIds.includes(selectedDepartmentFilter);
      const matchesSearch = p.name.toLowerCase().includes(search) || 
                            p.category.toLowerCase().includes(search);
      return matchesDept && matchesSearch;
    });
  }, [products, selectedDepartmentFilter, searchTerm]);

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
    if (receiveItems.length === 0) return;
    setLoading(true);
    const result = await storageService.receiveStockBatch(
      receiveItems.map(item => ({ 
        productId: item.product.id, 
        productName: item.product.name,
        quantityToAdd: item.quantityToAdd,
        unit: item.product.unit || 'unidades'
      })),
      currentUser.name,
      'ADMIN'
    );
    
    if (result && result.success && result.batchId) {
      playFeedbackSound('success');
      const orderBatch: OrderBatch = {
        batchId: result.batchId,
        date: new Date().toLocaleString(),
        departmentId: 'INGRESO',
        departmentName: 'Ingreso de Mercancía',
        requestedBy: currentUser.name,
        items: receiveItems.map(item => ({
          id: '',
          productId: item.product.id,
          productName: item.product.name,
          departmentId: 'INGRESO',
          departmentName: 'Ingreso de Mercancía',
          requestedBy: currentUser.name,
          quantity: item.quantityToAdd,
          status: 'COMPLETED',
          date: new Date().toLocaleString(),
          unit: item.product.unit || 'unidades'
        }))
      };
      const filename = `Albaran_Ingreso_${result.batchId}.pdf`;
      const text = 'Aquí tienes el albarán de ingreso de mercancía en formato PDF.';
      sharePdfFromReactComponent(<OrderPdfDocument order={orderBatch} preview={false} />, filename, `Ingreso de Mercancía #${result.batchId}`, text).catch(console.error);
    }
    
    setReceiveItems([]);
    setShowReceiveStockModal(false);
    setLoading(false);
  };

  if (currentUser.role !== UserRole.ADMIN) return <div className="p-8 text-center text-red-600 uppercase font-black tracking-tighter">Acceso Denegado</div>;

  return (
    <div className="font-sans relative">
      {/* SUB-CABECERA DE INVENTARIO FIJA */}
      <div 
        className="sticky top-[var(--header-h)] z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 shadow-md px-4 pt-4 pb-3 md:py-4 transition-all duration-300"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
            <div className="flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">Control de</span>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter leading-none drop-shadow-sm">
                  Almacén <span className="text-red-600 dark:text-red-500 italic">General</span>
                </h2>
              </div>
              <div className="flex gap-1 sm:hidden">
                <button onClick={() => setShowReceiveStockModal(true)} className="bg-blue-600 text-white w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 shadow-lg shadow-blue-600/20"><PackagePlus size={18} /></button>
                <button 
                  onClick={() => { 
                    if (!isDeveloper) { setShowDeveloperRestrictedModal(true); return; }
                    setEditProductForm({}); setShowEditProductModal(true); 
                  }}
                  className="bg-red-600 text-white w-9 h-9 rounded-xl flex items-center justify-center shadow-lg shadow-red-600/30 active:scale-90"
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="hidden sm:flex gap-1.5">
                <button onClick={() => setShowReceiveStockModal(true)} className="bg-blue-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-700 transition-all font-bold text-xs"><PackagePlus size={16} /> Ingreso</button>
                <button 
                  onClick={() => { 
                    if (!isDeveloper) { setShowDeveloperRestrictedModal(true); return; }
                    setEditProductForm({}); setShowEditProductModal(true); 
                  }}
                  className="bg-red-600 text-white px-3 py-2 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 font-bold text-xs"
                >
                  <Plus size={16} strokeWidth={3} /> Nuevo
                </button>
              </div>
              <div className="flex-1 sm:flex-none flex justify-end gap-1.5">
                <button 
                  onClick={() => {
                    const url = `${window.location.origin}?provider=true`;
                    if (navigator.share) {
                      navigator.share({ title: 'Ingreso Proveedor', text: 'Enlace para registro:', url: url }).catch(console.error);
                    } else {
                      navigator.clipboard.writeText(url);
                      alert('Enlace copiado');
                    }
                  }}
                  className="flex-1 sm:flex-none bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 px-3 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase border border-indigo-100 dark:border-indigo-800/50"
                >
                  <Share2 size={14} /> <span className="sm:inline">Proveedor</span>
                </button>
                <button 
                  onClick={() => {
                    if (window.confirm('¿Quieres sincronizar el catálogo completo desde la imagen? Esto actualizará unidades y topes máximos.')) {
                      setLoading(true);
                      storageService.registerCatalogFromImage()
                        .then((res: any) => {
                          alert(`Sincronización completada: ${res.created} nuevos, ${res.updated} actualizados.`);
                          setLoading(false);
                        })
                        .catch(err => {
                          alert('Error en sincronización: ' + err.message);
                          setLoading(false);
                        });
                    }
                  }}
                  className="hidden md:flex flex-1 sm:flex-none bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-2 rounded-xl items-center justify-center gap-2 font-bold text-[10px] uppercase border border-emerald-100 dark:border-emerald-800/50"
                >
                  <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> <span className="sm:inline">Sincronizar Catálogo</span>
                </button>
                <button 
                  onClick={() => setShowManageDepartmentsModal(true)} 
                  className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-3 py-2 rounded-xl flex items-center justify-center gap-2 font-bold text-[10px] uppercase"
                >
                  <ListTree size={14} /> <span className="sm:inline">Áreas</span>
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar artículo..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-bold focus:border-red-500 outline-none transition-all dark:text-white"
              />
            </div>
            <div className="relative">
              <select
                value={selectedDepartmentFilter}
                onChange={(e) => setSelectedDepartmentFilter(e.target.value)}
                className="w-full sm:w-auto pl-4 pr-10 py-3 rounded-xl border-2 border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-black uppercase tracking-wider focus:border-red-500 outline-none appearance-none dark:text-white"
              >
                <option value="all">Todas las Áreas</option>
                {departmentOptions}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>
        </div>
      </div>

      {/* LISTADO DE PRODUCTOS */}
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-slate-900/40 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex items-center justify-between hover:shadow-md hover:border-red-500/30 transition-all relative overflow-hidden">
            {product.quantity <= product.minThreshold && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 animate-pulse"></div>}
            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-black text-slate-900 dark:text-white truncate uppercase tracking-tight text-lg">{product.name}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {(product.departmentNames || [product.departmentName]).map((name, idx) => (
                  <span key={idx} className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{name}</span>
                ))}
                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-auto">{product.category}</span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <div className={`inline-flex items-center self-start px-3 py-1 rounded-lg font-black text-sm ${product.quantity <= 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'}`}>
                  {product.quantity <= 0 ? (
                    <span className="flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle size={14} /> NO HAY STOCK
                    </span>
                  ) : (
                    <>
                      {product.quantity} <span className="text-[10px] opacity-70 ml-1">{product.unit}</span>
                    </>
                  )}
                </div>
                
                {product.maxThreshold ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-dashed border-blue-200 dark:border-blue-900/30 self-start">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase">Tope Área: {product.maxThreshold}</span>
                  </div>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditProductForm(product); setShowEditProductModal(true); }} className="p-3 text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-xl active:scale-90"><Edit2 size={18} /></button>
              <button 
                onClick={() => { 
                  if (!isDeveloper) {
                    setShowDeveloperRestrictedModal(true);
                    return;
                  }
                  setProductToDelete(product); 
                }} 
                className="p-3 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl active:scale-90"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL EDICIÓN */}
      {showEditProductModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-t-[2rem] md:rounded-[2rem] w-full max-w-lg shadow-2xl p-6 md:p-8 border-t md:border-white/10 animate-slide-up md:animate-pop-in">
            <h3 className="text-xl md:text-2xl font-black uppercase italic mb-6">Editar <span className="text-red-600">Artículo</span></h3>
            
            {formError && (
              <div className="text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 mb-4 px-1">
                <AlertTriangle size={12} /> {formError}
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 max-h-[60dvh] overflow-y-auto px-1">
              {smartSuggestion && !editProductForm.id && (
                <div className="md:col-span-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl text-[10px] font-bold animate-fade-in">
                  <Sparkles size={14} />
                  Sugerencia Inteligente: Áreas y unidad detectadas.
                </div>
              )}
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nombre</label>
                <input className="w-full p-3 md:p-4 border-2 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-sm" value={editProductForm.name || ''} onChange={e => setEditProductForm({...editProductForm, name: e.target.value})} />
              </div>
              <div className="md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Áreas</label>
                <div className="flex flex-wrap gap-1.5">
                  {departments.map(d => {
                    const isSelected = (editProductForm.departmentIds || (editProductForm.departmentId ? [editProductForm.departmentId] : [])).includes(d.id);
                    return (
                      <button
                        key={d.id}
                        onClick={() => {
                          const currentIds = editProductForm.departmentIds || (editProductForm.departmentId ? [editProductForm.departmentId] : []);
                          let newIds;
                          if (isSelected) {
                            newIds = currentIds.filter(id => id !== d.id);
                          } else {
                            newIds = [...currentIds, d.id];
                          }
                          setEditProductForm({ ...editProductForm, departmentIds: newIds });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${isSelected ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      >
                        {d.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2 relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Categoría</label>
                <div className="relative group">
                  <input 
                    className="w-full p-3 md:p-4 border-2 rounded-xl md:rounded-2xl bg-slate-50 dark:bg-slate-950 font-bold text-sm focus:border-red-500 outline-none transition-all" 
                    value={editProductForm.category || ''} 
                    onChange={e => setEditProductForm({...editProductForm, category: e.target.value})}
                    onFocus={() => setShowCategorySuggestions(true)}
                    placeholder="Ej: Cafetería, Bebidas, Limpieza..."
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                    <Sparkles size={18} />
                  </div>
                </div>
                
                {showCategorySuggestions && existingCategories.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-2xl overflow-hidden max-h-48 overflow-y-auto animate-pop-in">
                    <div className="p-2 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/50">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">Sugerencias</span>
                      <button onClick={() => setShowCategorySuggestions(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                    {existingCategories
                      .filter(c => !editProductForm.category || c.toLowerCase().includes(editProductForm.category.toLowerCase()))
                      .map(cat => (
                        <button
                          key={cat}
                          onClick={() => {
                            setEditProductForm({ ...editProductForm, category: cat });
                            setShowCategorySuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                        >
                          {cat}
                        </button>
                      ))
                    }
                    <button 
                      onClick={() => setShowCategorySuggestions(false)}
                      className="w-full text-center py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600"
                    >
                      Cerrar
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Almacén Actual</label>
                <input 
                  type="number" 
                  className="w-full p-3 border-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold opacity-60 text-sm" 
                  value={editProductForm.quantity || 0} 
                  disabled
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Unidad</label>
                <select 
                  className="w-full p-3 border-2 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-sm appearance-none outline-none focus:border-red-500"
                  value={editProductForm.unit || 'unidades'} 
                  onChange={e => setEditProductForm({...editProductForm, unit: e.target.value})}
                >
                  {UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>{unit.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Alerta Mínima</label>
                <input type="number" className="w-full p-3 border-2 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-red-600 text-sm" value={editProductForm.minThreshold || 0} onChange={e => setEditProductForm({...editProductForm, minThreshold: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Tope por Área (Capacidad)</label>
                <input type="number" className="w-full p-3 border-2 rounded-xl bg-slate-50 dark:bg-slate-950 font-bold text-blue-600 text-sm" value={editProductForm.maxThreshold || ''} onChange={e => setEditProductForm({...editProductForm, maxThreshold: e.target.value ? Number(e.target.value) : undefined})} placeholder="Ej: 35" />
                <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase">Cantidad máxima permitida por pedido en cada área.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEditProductModal(false)} className="flex-1 py-3.5 font-bold bg-slate-100 dark:bg-slate-800 rounded-xl text-sm">Cancelar</button>
              <button onClick={handleSaveProduct} className="flex-2 py-3.5 px-6 text-white font-black bg-red-600 rounded-xl shadow-lg active:scale-95 text-sm uppercase">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR PRODUCTO */}
      {productToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-sm w-full shadow-xl border border-slate-200 dark:border-slate-800 animate-pop-in">
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Confirmar Eliminación</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold uppercase tracking-tight">¿Estás seguro de eliminar "{productToDelete.name}"? Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setProductToDelete(null)} className="flex-1 py-2.5 font-bold bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 text-xs">Cancelar</button>
              <button onClick={() => { 
                if (!isDeveloper) {
                  setShowDeveloperRestrictedModal(true);
                  setProductToDelete(null);
                  return;
                }
                storageService.deleteProduct(productToDelete.id, currentUser.name); 
                setProductToDelete(null); 
              }} className="flex-1 py-2.5 font-black bg-red-600 text-white rounded-lg shadow-md active:scale-95 text-xs uppercase">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RESTRICCIÓN DESARROLLADOR */}
      {showDeveloperRestrictedModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-[2rem] max-w-sm w-full shadow-2xl border border-slate-200 dark:border-slate-800 text-center animate-pop-in">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="text-red-600" size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase mb-3">Acceso <span className="text-red-600">Protegido</span></h3>
            <div className="space-y-4 mb-6">
              <p className="text-slate-600 dark:text-slate-400 font-bold text-sm leading-relaxed">
                La creación o eliminación de productos está reservada únicamente para el <span className="text-red-600">administrador principal</span>.
              </p>
              <p className="text-xs text-slate-400">
                Por favor, solicita los cambios necesarios al responsable técnico.
              </p>
            </div>
            <button 
              onClick={() => setShowDeveloperRestrictedModal(false)}
              className="w-full py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black rounded-xl active:scale-95 transition-transform uppercase text-xs tracking-widest shadow-lg"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* GESTIÓN DE ÁREAS */}
      {showManageDepartmentsModal && (
         <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-md h-auto max-h-[90dvh] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-slide-up border-t md:border-2 border-white/10 relative">
            <div className="px-5 py-5 border-b flex justify-between items-center">
              <h3 className="text-xl font-black uppercase italic">Áreas</h3>
              <button onClick={() => setShowManageDepartmentsModal(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full"><X size={20} /></button>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950/50">
               <div className="flex gap-2">
                  <input className="flex-1 px-4 py-3 font-bold bg-white dark:bg-slate-800 rounded-xl focus:border-red-500 outline-none text-sm" value={newDepartmentName} onChange={e => setNewDepartmentName(e.target.value)} placeholder="Nueva área..." />
                  <button onClick={handleSaveDepartment} className="w-12 h-12 bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg active:scale-95"><Plus size={24} strokeWidth={3} /></button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {departments.map(dep => (
                <div key={dep.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <span className="font-black text-slate-900 dark:text-white uppercase text-sm">{dep.name}</span>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingDepartment(dep); setNewDepartmentName(dep.name); }} className="p-2 text-blue-600"><Edit2 size={18} /></button>
                    <button onClick={(e) => handleDeleteDepartment(dep.id, e)} className="p-2 text-red-600"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ELIMINAR DEPARTAMENTO */}
      {deptToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] p-4 animate-fade-in">
           <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 animate-pop-in">
              <div className="p-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">Eliminar Área</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-bold uppercase tracking-tight">¿Estás seguro de eliminar esta área? La acción es permanente.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeptToDelete(null)}
                    className="flex-1 py-2.5 rounded-lg font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDeleteDepartment}
                    className="flex-1 py-2.5 rounded-lg font-black text-white bg-red-600 shadow-md active:scale-95 text-xs uppercase"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* MODAL INGRESO DE MERCANCÍA */}
      {showReceiveStockModal && (
        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex items-end md:items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 w-full md:max-w-2xl h-auto max-h-[90dvh] rounded-t-[2rem] md:rounded-[2rem] shadow-2xl p-5 md:p-8 border-t md:border-2 border-white/10 flex flex-col animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl md:text-2xl font-black uppercase italic flex items-center gap-3">
                <PackagePlus className="text-blue-600" size={28} />
                Ingreso de <span className="text-blue-600">Mercancía</span>
              </h3>
              <button onClick={() => { setShowReceiveStockModal(false); setReceiveItems([]); setReceiveSearchTerm(''); setSelectedProductToReceive(null); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* Search & Add Section */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Buscar Producto</h4>
                <div className="relative mb-4">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Escribe para buscar..." 
                    value={receiveSearchTerm}
                    onChange={(e) => setReceiveSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:border-blue-500 outline-none transition-all dark:text-white"
                  />
                </div>

                {receiveSearchTerm && !selectedProductToReceive && (
                  <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
                    {products.filter(p => p.name.toLowerCase().includes(receiveSearchTerm.toLowerCase())).slice(0, 5).map(p => (
                      <button 
                        key={p.id}
                        onClick={() => setSelectedProductToReceive(p)}
                        className="w-full text-left px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex justify-between items-center"
                      >
                        <span className="font-bold dark:text-white">{p.name}</span>
                        <span className="text-xs font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">Almacén: {p.quantity}</span>
                      </button>
                    ))}
                    {products.filter(p => p.name.toLowerCase().includes(receiveSearchTerm.toLowerCase())).length === 0 && (
                      <div className="p-4 text-center text-slate-500 font-bold text-sm">No se encontraron productos</div>
                    )}
                  </div>
                )}

                {selectedProductToReceive && (
                  <div className="flex items-center gap-3 animate-fade-in">
                    <div className="flex-1 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 min-w-0">
                      <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest block mb-0.5">Seleccionado</span>
                      <span className="font-bold dark:text-white truncate block text-sm">{selectedProductToReceive.name}</span>
                    </div>
                    <input 
                      type="number" 
                      placeholder="Cant." 
                      value={receiveQuantityInput}
                      onChange={(e) => setReceiveQuantityInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddReceiveItem()}
                      className="w-24 px-4 py-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold focus:border-blue-500 outline-none text-center dark:text-white"
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

              {/* Pending List */}
              {receiveItems.length > 0 && (
                <div>
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>Lista de Ingreso</span>
                    <span className="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-lg text-xs">{receiveItems.length} items</span>
                  </h4>
                  <div className="space-y-2">
                    {receiveItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="font-bold dark:text-white truncate block">{item.product.name}</span>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Almacén actual: {item.product.quantity} <ArrowRight size={10} className="inline mx-1" /> {item.product.quantity + item.quantityToAdd}
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
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                onClick={handleConfirmReceiveStock}
                disabled={receiveItems.length === 0 || loading}
                className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 text-lg uppercase tracking-wider"
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                Confirmar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
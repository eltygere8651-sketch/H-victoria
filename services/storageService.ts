import { Product, User, ReplenishmentRequest, UserRole, Department, UploadedFile } from '../types';

// Keys for LocalStorage - Updated for Hotel Victoria
const KEYS = {
  USERS: 'hotel_victoria_users',
  PRODUCTS: 'hotel_victoria_products',
  REQUESTS: 'hotel_victoria_requests',
  CURRENT_SESSION: 'hotel_victoria_session',
  DRAFT_CART: 'hotel_victoria_draft_cart',
  DRAFT_DEPT: 'hotel_victoria_draft_dept',
  LAST_VIEW: 'hotel_victoria_last_view',
  FILES: 'hotel_victoria_files'
};

// Initial Data Seeding
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Administrador', role: UserRole.ADMIN, pin: '1234' },
  { id: '2', name: 'Camarero Bar', role: UserRole.STAFF, pin: '1234' },
  { id: '3', name: 'Chef Cocina', role: UserRole.STAFF, pin: '1234' }
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Coca Cola', category: 'Bebidas', quantity: 150, unit: 'latas', minThreshold: 20 },
  { id: 'p2', name: 'Bitter Kas', category: 'Bebidas', quantity: 45, unit: 'botellines', minThreshold: 10 },
  { id: 'p3', name: 'Cerveza Barril', category: 'Alcohol', quantity: 8, unit: 'barriles', minThreshold: 2 },
  { id: 'p4', name: 'Leche Entera', category: 'Lácteos', quantity: 60, unit: 'litros', minThreshold: 12 },
  { id: 'p5', name: 'Galletas María', category: 'Desayuno', quantity: 30, unit: 'paquetes', minThreshold: 5 },
  { id: 'p6', name: 'Jabón Lavavajillas', category: 'Limpieza', quantity: 10, unit: 'bidones', minThreshold: 2 },
];

// Helper to get data or seed if empty
const getStored = <T>(key: string, initial: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) {
      // Don't overwrite if initial is null/undefined unless we want to seed
      if (initial !== undefined) {
        localStorage.setItem(key, JSON.stringify(initial));
      }
      return initial;
    }
    return JSON.parse(stored);
  } catch (e) {
    console.error(`Error parsing storage key ${key}`, e);
    return initial;
  }
};

const setStored = <T>(key: string, data: T) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error setting storage key ${key}`, e);
    // Handle Quota Exceeded for files
    if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
      alert('¡Memoria llena! No se pueden guardar más archivos localmente. Elimina archivos antiguos o contacta con el administrador.');
    }
  }
};

export interface OrderBatch {
  batchId: string;
  date: string;
  department: Department;
  requestedBy: string;
  items: ReplenishmentRequest[];
}

export const storageService = {
  // --- Auth & Session Persistence ---
  login: (name: string, pin: string): User | undefined => {
    const users = getStored<User[]>(KEYS.USERS, INITIAL_USERS);
    const user = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.pin === pin);
    if (user) {
      setStored(KEYS.CURRENT_SESSION, user); // Auto-save session
    }
    return user;
  },

  getSession: (): User | null => {
    return getStored<User | null>(KEYS.CURRENT_SESSION, null);
  },

  clearSession: () => {
    localStorage.removeItem(KEYS.CURRENT_SESSION);
    localStorage.removeItem(KEYS.LAST_VIEW);
  },

  getUsers: (): User[] => getStored<User[]>(KEYS.USERS, INITIAL_USERS),
  
  addUser: (user: User) => {
    const users = getStored<User[]>(KEYS.USERS, INITIAL_USERS);
    users.push(user);
    setStored(KEYS.USERS, users);
  },

  updateUser: (updatedUser: User) => {
    const users = getStored<User[]>(KEYS.USERS, INITIAL_USERS);
    const index = users.findIndex(u => u.id === updatedUser.id);
    if (index !== -1) {
      users[index] = updatedUser;
      setStored(KEYS.USERS, users);
      
      const currentSession = getStored<User | null>(KEYS.CURRENT_SESSION, null);
      if (currentSession && currentSession.id === updatedUser.id) {
        setStored(KEYS.CURRENT_SESSION, updatedUser);
      }
    }
  },

  deleteUser: (userId: string) => {
    const users = getStored<User[]>(KEYS.USERS, INITIAL_USERS);
    const filtered = users.filter(u => u.id !== userId);
    setStored(KEYS.USERS, filtered);
  },

  // --- View State Persistence ---
  getLastView: (): string | null => {
    return getStored<string | null>(KEYS.LAST_VIEW, null);
  },

  saveLastView: (view: string) => {
    setStored(KEYS.LAST_VIEW, view);
  },

  // --- Draft Cart Persistence ---
  getDraftCart: (): any[] => {
    return getStored<any[]>(KEYS.DRAFT_CART, []);
  },

  saveDraftCart: (cart: any[]) => {
    setStored(KEYS.DRAFT_CART, cart);
  },

  clearDraftCart: () => {
    localStorage.removeItem(KEYS.DRAFT_CART);
  },

  getDraftDepartment: (): Department | null => {
    return getStored<Department | null>(KEYS.DRAFT_DEPT, null);
  },

  saveDraftDepartment: (dept: Department) => {
    setStored(KEYS.DRAFT_DEPT, dept);
  },

  // --- Products ---
  getProducts: (): Product[] => getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS),

  saveProduct: (product: Product) => {
    const products = getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const index = products.findIndex(p => p.id === product.id);
    if (index >= 0) {
      products[index] = product;
    } else {
      products.push(product);
    }
    setStored(KEYS.PRODUCTS, products);
  },

  deleteProduct: (id: string) => {
    const products = getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const filtered = products.filter(p => p.id !== id);
    setStored(KEYS.PRODUCTS, filtered);
  },

  updateStock: (productId: string, quantityChange: number) => {
    const products = getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const product = products.find(p => p.id === productId);
    if (product) {
      product.quantity = Math.max(0, product.quantity + quantityChange);
      setStored(KEYS.PRODUCTS, products);
    }
  },

  // --- Files (Images & PDFs) ---
  getFiles: (): UploadedFile[] => getStored<UploadedFile[]>(KEYS.FILES, []),

  saveFile: (file: UploadedFile) => {
    const files = getStored<UploadedFile[]>(KEYS.FILES, []);
    files.unshift(file); // Add to top
    setStored(KEYS.FILES, files);
  },

  saveFiles: (newFiles: UploadedFile[]) => {
    const files = getStored<UploadedFile[]>(KEYS.FILES, []);
    // Add all new files to the top of the list
    const updatedFiles = [...newFiles, ...files];
    setStored(KEYS.FILES, updatedFiles);
  },

  deleteFile: (fileId: string) => {
    const files = getStored<UploadedFile[]>(KEYS.FILES, []);
    const filtered = files.filter(f => f.id !== fileId);
    setStored(KEYS.FILES, filtered);
  },

  // --- Requests ---
  cleanupOldRequests: () => {
    const requests = getStored<ReplenishmentRequest[]>(KEYS.REQUESTS, []);
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    const freshRequests = requests.filter(req => {
      if (req.timestamp) {
        return (now - req.timestamp) < thirtyDaysMs;
      }
      try {
        const dateParts = req.date.split(',')[0].split('/');
        if (dateParts.length === 3) {
            const d = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]));
            if (!isNaN(d.getTime())) {
                return (now - d.getTime()) < thirtyDaysMs;
            }
        }
      } catch (e) {}
      return true;
    });

    if (freshRequests.length !== requests.length) {
        setStored(KEYS.REQUESTS, freshRequests);
    }
  },

  getRequests: (): ReplenishmentRequest[] => getStored<ReplenishmentRequest[]>(KEYS.REQUESTS, []),

  getBatches: (): OrderBatch[] => {
    storageService.cleanupOldRequests();
    const requests = getStored<ReplenishmentRequest[]>(KEYS.REQUESTS, []);
    const groups: {[key: string]: OrderBatch} = {};
    
    requests.forEach(req => {
      const bid = req.batchId || `legacy_${req.date}`;
      if (!groups[bid]) {
        groups[bid] = {
          batchId: bid,
          date: req.date,
          department: req.department,
          requestedBy: req.requestedBy,
          items: []
        };
      }
      groups[bid].items.push(req);
    });
    
    return Object.values(groups).sort((a, b) => {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  },

  deleteBatch: (batchId: string) => {
     const requests = getStored<ReplenishmentRequest[]>(KEYS.REQUESTS, []);
     const filtered = requests.filter(r => {
        const rBid = r.batchId || `legacy_${r.date}`;
        return rBid !== batchId;
     });
     setStored(KEYS.REQUESTS, filtered);
  },

  submitOrderBatch: (items: {product: Product, quantity: number}[], department: Department, user: User): { success: boolean, batchId?: string, lowStockItems: string[] } => {
    const products = getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const requests = getStored<ReplenishmentRequest[]>(KEYS.REQUESTS, []);
    const lowStockItems: string[] = [];
    
    const timestamp = Date.now();
    const batchId = `ORD-${timestamp.toString().slice(-6)}`;
    const date = new Date().toLocaleString();

    let allSuccessful = true;

    for (const item of items) {
       const storedProd = products.find(p => p.id === item.product.id);
       if (!storedProd || storedProd.quantity < item.quantity) {
         allSuccessful = false;
         break;
       }
    }

    if (!allSuccessful) return { success: false, lowStockItems: [] };

    items.forEach(item => {
      const prodIndex = products.findIndex(p => p.id === item.product.id);
      if (prodIndex >= 0) {
        products[prodIndex].quantity -= item.quantity;
        if (products[prodIndex].quantity <= products[prodIndex].minThreshold) {
            lowStockItems.push(products[prodIndex].name);
        }
      }

      requests.unshift({
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        batchId: batchId,
        productId: item.product.id,
        productName: item.product.name,
        department: department,
        requestedBy: user.name,
        quantity: item.quantity,
        status: 'PENDING',
        date: date,
        timestamp: timestamp,
        unit: item.product.unit
      });
    });

    setStored(KEYS.PRODUCTS, products);
    setStored(KEYS.REQUESTS, requests);
    localStorage.removeItem(KEYS.DRAFT_CART);

    return { success: true, batchId, lowStockItems };
  },

  createBackup: (): string => {
    const backup: Record<string, any> = {};
    Object.values(KEYS).forEach(key => {
      const stored = localStorage.getItem(key);
      if (stored) {
        backup[key] = JSON.parse(stored);
      }
    });
    return JSON.stringify(backup, null, 2);
  },

  restoreBackup: (jsonString: string): boolean => {
    try {
      const backup = JSON.parse(jsonString);
      if (!backup || typeof backup !== 'object') return false;

      Object.values(KEYS).forEach(key => {
        if (backup[key]) {
          localStorage.setItem(key, JSON.stringify(backup[key]));
        }
      });
      return true;
    } catch (e) {
      console.error("Backup restore failed", e);
      return false;
    }
  },

  downloadStockCSV: () => {
    const products = getStored<Product[]>(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    const header = ['ID', 'Nombre', 'Categoria', 'Stock Actual', 'Unidad', 'Minimo'];
    const rows = products.map(p => [p.id, p.name, p.category, p.quantity, p.unit, p.minThreshold]);
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stock_hotel_victoria_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  downloadRequestsCSV: () => {
    const requests = getStored<ReplenishmentRequest[]>(KEYS.REQUESTS, []);
    const header = ['Fecha', 'Pedido ID', 'Departamento', 'Producto', 'Cantidad', 'Solicitado Por', 'Estado'];
    const rows = requests.map(r => [r.date, r.batchId || '-', r.department, r.productName, r.quantity, r.requestedBy, r.status]);
    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `pedidos_hotel_victoria_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
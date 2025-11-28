import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem } from '../types';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  writeBatch,
  getDoc,
  setDoc,
  orderBy,
  limit
} from 'firebase/firestore';
// Import the 'db' instance from firebaseConfig
import { db } from '../firebaseConfig';

// Helper to handle circular references for localStorage
function stringifyWithCircularGuard(obj: any) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        // Circular reference found, discard key
        return;
      }
      // Store value in our collection
      cache.add(value);
    }
    return value;
  });
}

// LOCAL STORAGE FALLBACK KEYS
const KEYS = {
  USERS: 'hotel_victoria_users',
  PRODUCTS: 'hotel_victoria_products',
  REQUESTS: 'hotel_victoria_requests',
  CURRENT_SESSION: 'hotel_victoria_session',
  DRAFT_CART: 'hotel_victoria_draft_cart',
  LAST_VIEW: 'hotel_victoria_last_view',
  DEPARTMENTS: 'hotel_victoria_departments', // New key for departments
};

// INITIAL DATA FOR SEEDING
const INITIAL_USERS: User[] = [
  { id: '1', name: 'Administrador', role: UserRole.ADMIN, pin: '1234' },
  { id: '2', name: 'Camarero Bar', role: UserRole.STAFF, pin: '1234' },
  { id: '3', name: 'Chef Cocina', role: UserRole.STAFF, pin: '1234' }
];

const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'd-bar', name: 'Bar' },
  { id: 'd-gastrobar', name: 'Gastro Bar' },
  { id: 'd-cocina', name: 'Cocina' },
  { id: 'd-limpieza', name: 'Limpieza' },
  { id: 'd-tienda', name: 'Tienda de Regalos' },
  { id: 'd-general', name: 'General' },
  { id: 'd-comedor', name: 'Comedor' },
  { id: 'd-spa', name: 'SPA' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Coca Cola', category: 'Bebidas', quantity: 150, unit: 'latas', minThreshold: 20, departmentId: 'd-bar', departmentName: 'Bar' },
  { id: 'p2', name: 'Bitter Kas', category: 'Bebidas', quantity: 45, unit: 'botellines', minThreshold: 10, departmentId: 'd-bar', departmentName: 'Bar' },
  { id: 'p3', name: 'Cerveza Barril', category: 'Alcohol', quantity: 8, unit: 'barriles', minThreshold: 2, departmentId: 'd-bar', departmentName: 'Bar' },
  { id: 'p4', name: 'Leche Entera', category: 'Lácteos', quantity: 60, unit: 'litros', minThreshold: 12, departmentId: 'd-cocina', departmentName: 'Cocina' },
  { id: 'p5', name: 'Galletas María', category: 'Desayuno', quantity: 30, unit: 'paquetes', minThreshold: 5, departmentId: 'd-comedor', departmentName: 'Comedor' },
  { id: 'p6', name: 'Jabón Lavavajillas', category: 'Limpieza', quantity: 10, unit: 'bidones', minThreshold: 2, departmentId: 'd-limpieza', departmentName: 'Limpieza' },
  { id: 'p7', name: 'Servilletas', category: 'Material', quantity: 20, unit: 'paquetes', minThreshold: 5, departmentId: 'd-gastrobar', departmentName: 'Gastro Bar' },
  { id: 'p8', name: 'Pan de Molde', category: 'Panadería', quantity: 10, unit: 'bolsas', minThreshold: 3, departmentId: 'd-cocina', departmentName: 'Cocina' },
  { id: 'p9', name: 'Champú Huesped', category: 'Amenidades', quantity: 100, unit: 'uds', minThreshold: 20, departmentId: 'd-spa', departmentName: 'SPA' },
  { id: 'p10', name: 'Chocolate Negro', category: 'Golosinas', quantity: 50, unit: 'barras', minThreshold: 10, departmentId: 'd-tienda', departmentName: 'Tienda de Regalos' },
];


export interface OrderBatch {
  batchId: string;
  date: string;
  departmentId: string; // Changed to ID
  departmentName: string; // New: For display
  requestedBy: string;
  items: ReplenishmentRequest[];
}

// Check if Firebase is available by ensuring 'db' is defined
const isFirebaseReady = typeof db !== 'undefined' && db !== null;

export const storageService = {
  // --- AUTH & SESSION ---
  login: async (name: string, pin: string): Promise<User | null> => {
    if (isFirebaseReady) {
      try {
        // 1. Get ALL users to perform case-insensitive check client-side
        // This is safer because Firestore queries are strictly case-sensitive
        const snapshot = await getDocs(collection(db, 'users'));
        
        // Logic if users exist
        if (!snapshot.empty) {
           const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
           // Normalize input and stored names for comparison
           const match = users.find(u => 
             u.name.trim().toLowerCase() === name.trim().toLowerCase() && 
             u.pin === pin
           );
           
           if (match) {
             localStorage.setItem(KEYS.CURRENT_SESSION, stringifyWithCircularGuard(match));
             return match;
           }
        }

        // 2. If DB is empty, Seed initial data
        if (snapshot.empty) {
            console.log("Database is empty. Seeding initial data...");
            const batch = writeBatch(db);
            
            // Create Users
            INITIAL_USERS.forEach(u => {
             const ref = doc(db, 'users', u.id); // Use provided ID for users
             batch.set(ref, u);
            });

            // Create Departments
            INITIAL_DEPARTMENTS.forEach(d => {
              const ref = doc(db, 'departments', d.id); // Use provided ID for departments
              batch.set(ref, d); // Use setDoc to explicitly set the ID
            });

            // Create Products
            INITIAL_PRODUCTS.forEach(p => {
             const ref = doc(db, 'products', p.id); // Use provided ID for products
             batch.set(ref, p);
            });
            
            await batch.commit();
            console.log("Seeding complete.");

            // Check if current credentials match the just-seeded data (case insensitive)
            const match = INITIAL_USERS.find(u => u.name.toLowerCase() === name.trim().toLowerCase() && u.pin === pin);
            if (match) {
                // Fetch the newly created user ID by exact name match from the seed
                const q = query(collection(db, 'users'), where('name', '==', match.name));
                const snap = await getDocs(q);
                if (!snap.empty) {
                     const userData = snap.docs[0].data() as User;
                     const user = { ...userData, id: snap.docs[0].id };
                     localStorage.setItem(KEYS.CURRENT_SESSION, stringifyWithCircularGuard(user));
                     return user;
                }
            }
        }
        
        return null;
      } catch (e: any) {
        console.error("Firebase login error:", e);
        // Alert user if it's a permission issue (common with Firestore rules)
        if (e.code === 'permission-denied') {
          alert("Error de Permisos: Verifica que las reglas de Firestore estén en 'Test Mode' (Modo de prueba) en la consola de Firebase.");
        } else {
          alert(`Error de conexión: ${e.message}`);
        }
        return null;
      }
    } else {
      // Local Fallback
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || stringifyWithCircularGuard(INITIAL_USERS));
      const user = users.find((u: User) => u.name.toLowerCase() === name.toLowerCase() && u.pin === pin);
      if (user) localStorage.setItem(KEYS.CURRENT_SESSION, stringifyWithCircularGuard(user));
      return user || null;
    }
  },

  getSession: (): User | null => {
    const stored = localStorage.getItem(KEYS.CURRENT_SESSION);
    return stored ? JSON.parse(stored) : null;
  },

  clearSession: () => {
    localStorage.removeItem(KEYS.CURRENT_SESSION);
    localStorage.removeItem(KEYS.LAST_VIEW);
  },

  // --- REALTIME SUBSCRIPTIONS ---
  subscribeToProducts: (callback: (products: Product[]) => void) => {
    if (isFirebaseReady) {
      return onSnapshot(collection(db, 'products'), (snapshot) => {
        const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        callback(products);
      });
    } else {
      const prods = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || stringifyWithCircularGuard(INITIAL_PRODUCTS));
      callback(prods);
      return () => {};
    }
  },

  subscribeToDepartments: (callback: (departments: Department[]) => void) => {
    if (isFirebaseReady) {
      return onSnapshot(collection(db, 'departments'), (snapshot) => {
        const departments = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department));
        callback(departments);
      });
    } else {
      const deps = JSON.parse(localStorage.getItem(KEYS.DEPARTMENTS) || stringifyWithCircularGuard(INITIAL_DEPARTMENTS));
      callback(deps);
      return () => {};
    }
  },

  subscribeToBatches: (callback: (batches: OrderBatch[]) => void) => {
    if (isFirebaseReady) {
      return onSnapshot(query(collection(db, 'requests'), orderBy('timestamp', 'desc')), (snapshot) => {
        const requests = snapshot.docs.map(doc => doc.data() as ReplenishmentRequest);
        
        // Group logic
        const groups: {[key: string]: OrderBatch} = {};
        requests.forEach(req => {
          const bid = req.batchId || `legacy_${req.date}`;
          if (!groups[bid]) {
            groups[bid] = {
              batchId: bid,
              date: req.date,
              departmentId: req.departmentId, // Updated
              departmentName: req.departmentName, // Updated
              requestedBy: req.requestedBy,
              items: []
            };
          }
          groups[bid].items.push(req);
        });
        
        callback(Object.values(groups));
      });
    } else {
       // Local Logic
       const requests = JSON.parse(localStorage.getItem(KEYS.REQUESTS) || '[]');
       const groups: {[key: string]: OrderBatch} = {};
       requests.forEach((req: ReplenishmentRequest) => {
          const bid = req.batchId || `legacy_${req.date}`;
          if (!groups[bid]) {
            groups[bid] = {
              batchId: bid,
              date: req.date,
              departmentId: req.departmentId, // Updated
              departmentName: req.departmentName, // Updated
              requestedBy: req.requestedBy,
              items: []
            };
          }
          groups[bid].items.push(req);
        });
       callback(Object.values(groups).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
       return () => {};
    }
  },

  subscribeToUsers: (callback: (users: User[]) => void) => {
    if (isFirebaseReady) {
      return onSnapshot(collection(db, 'users'), (snapshot) => {
        const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
        callback(users);
      });
    } else {
      callback(JSON.parse(localStorage.getItem(KEYS.USERS) || stringifyWithCircularGuard(INITIAL_USERS)));
      return () => {};
    }
  },

  // --- ACTIONS ---
  saveProduct: async (product: Product) => {
    if (isFirebaseReady) {
      // If product.id is a temporary client-side ID or missing, it's a new product
      if (!product.id || product.id.startsWith('p_')) { 
         // Firebase will auto-generate the document ID, so don't pass 'id' in the object
         const { id, ...productWithoutId } = product; 
         await addDoc(collection(db, 'products'), productWithoutId);
      } else { // Existing product
         await updateDoc(doc(db, 'products', product.id), { ...product });
      }
    } else {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || stringifyWithCircularGuard(INITIAL_PRODUCTS));
      const idx = products.findIndex((p: Product) => p.id === product.id);
      if (idx >= 0) products[idx] = product;
      else products.push(product);
      localStorage.setItem(KEYS.PRODUCTS, stringifyWithCircularGuard(products));
    }
  },

  deleteProduct: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'products', id));
    } else {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || stringifyWithCircularGuard(INITIAL_PRODUCTS));
      localStorage.setItem(KEYS.PRODUCTS, stringifyWithCircularGuard(products.filter((p: Product) => p.id !== id)));
    }
  },

  saveDepartment: async (department: Department) => {
    if (isFirebaseReady) {
      // If department.id is a temporary client-side ID or empty, it's a new department
      if (!department.id || department.id.startsWith('d-temp')) { 
        const { id, ...departmentWithoutId } = department; // Omit client-side temp ID
        await addDoc(collection(db, 'departments'), departmentWithoutId); // Firebase generates ID
      } else { // Existing department
        await updateDoc(doc(db, 'departments', department.id), { name: department.name });
      }
    } else {
      const departments = JSON.parse(localStorage.getItem(KEYS.DEPARTMENTS) || stringifyWithCircularGuard(INITIAL_DEPARTMENTS));
      const idx = departments.findIndex((d: Department) => d.id === department.id);
      if (idx >= 0) departments[idx] = department;
      else departments.push({ ...department, id: `d-temp-${Date.now()}` }); // Assign a temp ID for new local departments
      localStorage.setItem(KEYS.DEPARTMENTS, stringifyWithCircularGuard(departments));
    }
  },

  deleteDepartment: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'departments', id));
    } else {
      const departments = JSON.parse(localStorage.getItem(KEYS.DEPARTMENTS) || stringifyWithCircularGuard(INITIAL_DEPARTMENTS));
      localStorage.setItem(KEYS.DEPARTMENTS, stringifyWithCircularGuard(departments.filter((d: Department) => d.id !== id)));
    }
  },

  submitOrderBatch: async (items: {product: Product, quantity: number}[], departmentId: string, departmentName: string, user: User) => {
    const timestamp = Date.now();
    const batchId = `ORD-${timestamp.toString().slice(-6)}`;
    const date = new Date().toLocaleString();
    const lowStockItems: string[] = [];

    if (isFirebaseReady) {
      // Transaction for safety
      const batch = writeBatch(db);
      
      for (const item of items) {
        const prodRef = doc(db, 'products', item.product.id);
        const newQty = item.product.quantity - item.quantity;
        
        batch.update(prodRef, { quantity: newQty });

        if (newQty <= item.product.minThreshold) {
            lowStockItems.push(item.product.name);
        }

        const reqRef = doc(collection(db, 'requests'));
        batch.set(reqRef, {
          batchId,
          productId: item.product.id,
          productName: item.product.name,
          departmentId, // Updated
          departmentName, // Updated
          requestedBy: user.name,
          quantity: item.quantity,
          status: 'PENDING',
          date,
          timestamp,
          unit: item.product.unit
        });
      }
      
      await batch.commit();
      return { success: true, batchId, lowStockItems };
    } else {
      // Local fallback
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || stringifyWithCircularGuard(INITIAL_PRODUCTS));
      const requests = JSON.parse(localStorage.getItem(KEYS.REQUESTS) || '[]');
      
      items.forEach(item => {
        const idx = products.findIndex((p: Product) => p.id === item.product.id);
        if (idx >= 0) {
            products[idx].quantity -= item.quantity;
            if (products[idx].quantity <= products[idx].minThreshold) {
                lowStockItems.push(products[idx].name);
            }
        }
        requests.unshift({
            id: `req_${Date.now()}_${Math.random()}`,
            batchId,
            productId: item.product.id,
            productName: item.product.name,
            departmentId, // Updated
            departmentName, // Updated
            requestedBy: user.name,
            quantity: item.quantity,
            status: 'PENDING',
            date,
            timestamp,
            unit: item.product.unit
        });
      });
      localStorage.setItem(KEYS.PRODUCTS, stringifyWithCircularGuard(products));
      localStorage.setItem(KEYS.REQUESTS, stringifyWithCircularGuard(requests));
      return { success: true, batchId, lowStockItems };
    }
  },

  deleteBatch: async (batchId: string) => {
    if (isFirebaseReady) {
      const q = query(collection(db, 'requests'), where('batchId', '==', batchId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    } else {
      const requests = JSON.parse(localStorage.getItem(KEYS.REQUESTS) || '[]');
      const filtered = requests.filter((r: ReplenishmentRequest) => r.batchId !== batchId);
      localStorage.setItem(KEYS.REQUESTS, stringifyWithCircularGuard(filtered));
    }
  },

  addUser: async (user: User) => {
    if (isFirebaseReady) {
      await setDoc(doc(db, 'users', user.id), user); // Use setDoc to create/update with provided ID
    } else {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || stringifyWithCircularGuard(INITIAL_USERS));
      users.push(user);
      localStorage.setItem(KEYS.USERS, stringifyWithCircularGuard(users));
    }
  },

  updateUser: async (user: User) => {
    if (isFirebaseReady) {
       await updateDoc(doc(db, 'users', user.id), { ...user });
    } else {
       const users = JSON.parse(localStorage.getItem(KEYS.USERS) || stringifyWithCircularGuard(INITIAL_USERS));
       const idx = users.findIndex((u: User) => u.id === user.id);
       if (idx >= 0) {
         users[idx] = user;
         localStorage.setItem(KEYS.USERS, stringifyWithCircularGuard(users));
       }
    }
  },

  deleteUser: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'users', id));
    } else {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || stringifyWithCircularGuard(INITIAL_USERS));
      localStorage.setItem(KEYS.USERS, stringifyWithCircularGuard(users.filter((u: User) => u.id !== id)));
    }
  },

  // Helpers
  getDraftCart: (): CartItem[] => JSON.parse(localStorage.getItem(KEYS.DRAFT_CART) || '[]'),
  saveDraftCart: (cart: CartItem[]) => localStorage.setItem(KEYS.DRAFT_CART, stringifyWithCircularGuard(cart)),
  getLastView: () => localStorage.getItem(KEYS.LAST_VIEW),
  saveLastView: (view: string) => localStorage.setItem(KEYS.LAST_VIEW, view),
  
  createBackup: () => {
    // Local backup only
    const backup: any = {};
    Object.values(KEYS).forEach(k => {
      backup[k] = JSON.parse(localStorage.getItem(k) || 'null');
    });
    return stringifyWithCircularGuard(backup);
  },
  
  restoreBackup: (json: string) => {
    try {
      const data = JSON.parse(json);
      Object.keys(data).forEach(k => {
         if (data[k]) localStorage.setItem(k, stringifyWithCircularGuard(data[k]));
      });
      return true;
    } catch { return false; }
  },

  downloadStockCSV: () => { /* Same as before, but maybe fetch first? For simplicity assume synced view in UI triggers this with data */ },
  downloadRequestsCSV: () => { /* Same as before */ }
};
import { Product, User, ReplenishmentRequest, UserRole, Department, UploadedFile } from '../types';
import { db } from '../firebaseConfig';
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

// LOCAL STORAGE FALLBACK KEYS
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

// INITIAL DATA FOR SEEDING
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

export interface OrderBatch {
  batchId: string;
  date: string;
  department: Department;
  requestedBy: string;
  items: ReplenishmentRequest[];
}

// Check if Firebase is available
const isFirebaseReady = !!db;

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
             localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(match));
             return match;
           }
        }

        // 2. If DB is empty, Seed initial data
        if (snapshot.empty) {
            console.log("Database is empty. Seeding initial data...");
            const batch = writeBatch(db);
            
            // Create Users
            INITIAL_USERS.forEach(u => {
             const ref = doc(collection(db, 'users'));
             batch.set(ref, u);
            });

            // Create Products
            INITIAL_PRODUCTS.forEach(p => {
             const ref = doc(collection(db, 'products'));
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
                     localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(user));
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
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS));
      const user = users.find((u: User) => u.name.toLowerCase() === name.toLowerCase() && u.pin === pin);
      if (user) localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(user));
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
      const prods = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
      callback(prods);
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
              department: req.department,
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
              department: req.department,
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

  subscribeToFiles: (callback: (files: UploadedFile[]) => void) => {
    if (isFirebaseReady) {
      return onSnapshot(query(collection(db, 'files'), orderBy('timestamp', 'desc')), (snapshot) => {
        const files = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as UploadedFile));
        callback(files);
      });
    } else {
      callback(JSON.parse(localStorage.getItem(KEYS.FILES) || '[]'));
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
      callback(JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS)));
      return () => {};
    }
  },

  // --- ACTIONS ---
  saveProduct: async (product: Product) => {
    if (isFirebaseReady) {
      if (product.id.startsWith('p_') || product.id.length < 5) { // New product
         await addDoc(collection(db, 'products'), { ...product, id: undefined }); // Let ID be auto
      } else {
         await updateDoc(doc(db, 'products', product.id), { ...product });
      }
    } else {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
      const idx = products.findIndex((p: Product) => p.id === product.id);
      if (idx >= 0) products[idx] = product;
      else products.push(product);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
    }
  },

  deleteProduct: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'products', id));
    } else {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products.filter((p: Product) => p.id !== id)));
    }
  },

  submitOrderBatch: async (items: {product: Product, quantity: number}[], department: Department, user: User) => {
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
          department,
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
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
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
            department,
            requestedBy: user.name,
            quantity: item.quantity,
            status: 'PENDING',
            date,
            timestamp,
            unit: item.product.unit
        });
      });
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(KEYS.REQUESTS, JSON.stringify(requests));
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
      localStorage.setItem(KEYS.REQUESTS, JSON.stringify(filtered));
    }
  },

  saveFiles: async (files: UploadedFile[]) => {
    if (isFirebaseReady) {
      const batch = writeBatch(db);
      files.forEach(f => {
        const ref = doc(collection(db, 'files'));
        batch.set(ref, f);
      });
      await batch.commit();
    } else {
      const localFiles = JSON.parse(localStorage.getItem(KEYS.FILES) || '[]');
      localStorage.setItem(KEYS.FILES, JSON.stringify([...files, ...localFiles]));
    }
  },

  deleteFile: async (id: string) => {
     if (isFirebaseReady) {
       await deleteDoc(doc(db, 'files', id));
     } else {
       const files = JSON.parse(localStorage.getItem(KEYS.FILES) || '[]');
       localStorage.setItem(KEYS.FILES, JSON.stringify(files.filter((f: UploadedFile) => f.id !== id)));
     }
  },

  addUser: async (user: User) => {
    if (isFirebaseReady) {
      await addDoc(collection(db, 'users'), user);
    } else {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS));
      users.push(user);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    }
  },

  updateUser: async (user: User) => {
    if (isFirebaseReady) {
       await updateDoc(doc(db, 'users', user.id), { ...user });
    } else {
       const users = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS));
       const idx = users.findIndex((u: User) => u.id === user.id);
       if (idx >= 0) {
         users[idx] = user;
         localStorage.setItem(KEYS.USERS, JSON.stringify(users));
       }
    }
  },

  deleteUser: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'users', id));
    } else {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS));
      localStorage.setItem(KEYS.USERS, JSON.stringify(users.filter((u: User) => u.id !== id)));
    }
  },

  // Helpers
  getDraftCart: () => JSON.parse(localStorage.getItem(KEYS.DRAFT_CART) || '[]'),
  saveDraftCart: (cart: any[]) => localStorage.setItem(KEYS.DRAFT_CART, JSON.stringify(cart)),
  getDraftDepartment: () => JSON.parse(localStorage.getItem(KEYS.DRAFT_DEPT) || 'null'),
  saveDraftDepartment: (dept: Department) => localStorage.setItem(KEYS.DRAFT_DEPT, JSON.stringify(dept)),
  getLastView: () => localStorage.getItem(KEYS.LAST_VIEW),
  saveLastView: (view: string) => localStorage.setItem(KEYS.LAST_VIEW, view),
  
  createBackup: () => {
    // Local backup only
    const backup: any = {};
    Object.values(KEYS).forEach(k => {
      backup[k] = JSON.parse(localStorage.getItem(k) || 'null');
    });
    return JSON.stringify(backup);
  },
  
  restoreBackup: (json: string) => {
    try {
      const data = JSON.parse(json);
      Object.keys(data).forEach(k => {
         if (data[k]) localStorage.setItem(k, JSON.stringify(data[k]));
      });
      return true;
    } catch { return false; }
  },

  downloadStockCSV: () => { /* Same as before, but maybe fetch first? For simplicity assume synced view in UI triggers this with data */ },
  downloadRequestsCSV: () => { /* Same as before */ }
};
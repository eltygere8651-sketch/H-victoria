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
  { id: 'p1', name: 'Coca Cola', category: 'Bebidas', subcategory: 'Refrescos', quantity: 150, unit: 'latas', minThreshold: 20 },
  { id: 'p2', name: 'Bitter Kas', category: 'Bebidas', subcategory: 'Refrescos', quantity: 45, unit: 'botellines', minThreshold: 10 },
  { id: 'p3', name: 'Cerveza Barril', category: 'Alcohol', subcategory: 'Cerveza', quantity: 8, unit: 'barriles', minThreshold: 2 },
  { id: 'p4', name: 'Leche Entera', category: 'Lácteos', subcategory: 'Leche', quantity: 60, unit: 'litros', minThreshold: 12 },
  { id: 'p5', name: 'Galletas María', category: 'Desayuno', subcategory: 'Galletas', quantity: 30, unit: 'paquetes', minThreshold: 5 },
  { id: 'p6', name: 'Jabón Lavavajillas', category: 'Limpieza', subcategory: 'Químicos', quantity: 10, unit: 'bidones', minThreshold: 2 },
];

const RAW_DEMO_PRODUCTS: Product[] = [
  // CERVEZA
  { id: '', name: 'Barril Mahou 5 Estrellas', category: 'Alcohol', subcategory: 'Cerveza', quantity: 15, unit: 'barriles 30L', minThreshold: 3 },
  { id: '', name: 'Mahou Clásica Tercio', category: 'Alcohol', subcategory: 'Cerveza', quantity: 96, unit: 'botellines', minThreshold: 24 },
  { id: '', name: 'Estrella Galicia Tercio', category: 'Alcohol', subcategory: 'Cerveza', quantity: 72, unit: 'botellines', minThreshold: 24 },
  { id: '', name: 'Mahou 0,0 Tostada', category: 'Alcohol', subcategory: 'Cerveza', quantity: 48, unit: 'botellines', minThreshold: 12 },
  { id: '', name: 'Alhambra Reserva 1925', category: 'Alcohol', subcategory: 'Cerveza', quantity: 24, unit: 'botellines', minThreshold: 6 },
  { id: '', name: 'Coronita', category: 'Alcohol', subcategory: 'Cerveza', quantity: 24, unit: 'botellines', minThreshold: 6 },

  // GINEBRA
  { id: '', name: 'Beefeater', category: 'Alcohol', subcategory: 'Ginebra', quantity: 12, unit: 'botellas 70cl', minThreshold: 3 },
  { id: '', name: 'Seagrams', category: 'Alcohol', subcategory: 'Ginebra', quantity: 10, unit: 'botellas 70cl', minThreshold: 3 },
  { id: '', name: 'Bombay Sapphire', category: 'Alcohol', subcategory: 'Ginebra', quantity: 8, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Hendricks', category: 'Alcohol', subcategory: 'Ginebra', quantity: 5, unit: 'botellas 70cl', minThreshold: 1 },
  { id: '', name: 'Puerto de Indias Fresa', category: 'Alcohol', subcategory: 'Ginebra', quantity: 15, unit: 'botellas 70cl', minThreshold: 4 },

  // RON
  { id: '', name: 'Barceló Añejo', category: 'Alcohol', subcategory: 'Ron', quantity: 18, unit: 'botellas 70cl', minThreshold: 4 },
  { id: '', name: 'Brugal Añejo', category: 'Alcohol', subcategory: 'Ron', quantity: 12, unit: 'botellas 70cl', minThreshold: 3 },
  { id: '', name: 'Havana Club 7', category: 'Alcohol', subcategory: 'Ron', quantity: 8, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Cacique', category: 'Alcohol', subcategory: 'Ron', quantity: 6, unit: 'botellas 70cl', minThreshold: 2 },

  // WHISKYS
  { id: '', name: 'JB Whisky', category: 'Alcohol', subcategory: 'Whisky', quantity: 12, unit: 'botellas 70cl', minThreshold: 3 },
  { id: '', name: 'Ballantines', category: 'Alcohol', subcategory: 'Whisky', quantity: 10, unit: 'botellas 70cl', minThreshold: 3 },
  { id: '', name: 'Jack Daniels', category: 'Alcohol', subcategory: 'Whisky', quantity: 8, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Johnnie Walker Black', category: 'Alcohol', subcategory: 'Whisky', quantity: 6, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Cardhu 12 Años', category: 'Alcohol', subcategory: 'Whisky', quantity: 5, unit: 'botellas 70cl', minThreshold: 1 },
  { id: '', name: 'Macallan 12', category: 'Alcohol', subcategory: 'Whisky', quantity: 3, unit: 'botellas 70cl', minThreshold: 1 },

  // VINO
  { id: '', name: 'Ramón Bilbao Crianza', category: 'Vinos', subcategory: 'Vino', quantity: 36, unit: 'botellas', minThreshold: 6 },
  { id: '', name: 'Marqués de Cáceres', category: 'Vinos', subcategory: 'Vino', quantity: 24, unit: 'botellas', minThreshold: 6 },
  { id: '', name: 'Protos Ribera', category: 'Vinos', subcategory: 'Vino', quantity: 18, unit: 'botellas', minThreshold: 4 },
  { id: '', name: 'Albariño Martín Códax', category: 'Vinos', subcategory: 'Vino', quantity: 24, unit: 'botellas', minThreshold: 6 },
  { id: '', name: 'Verdejo Rueda', category: 'Vinos', subcategory: 'Vino', quantity: 30, unit: 'botellas', minThreshold: 6 },
  { id: '', name: 'Cava Anna de Codorníu', category: 'Vinos', subcategory: 'Vino', quantity: 12, unit: 'botellas', minThreshold: 3 },
  { id: '', name: 'Moët & Chandon', category: 'Vinos', subcategory: 'Vino', quantity: 5, unit: 'botellas', minThreshold: 2 },

  // LICORES Y OTROS ALCOHOLES
  { id: '', name: 'Absolut Vodka', category: 'Alcohol', subcategory: 'Licores', quantity: 10, unit: 'botellas 70cl', minThreshold: 3 },
  { id: '', name: 'Grey Goose', category: 'Alcohol', subcategory: 'Licores', quantity: 4, unit: 'botellas 70cl', minThreshold: 1 },
  { id: '', name: 'Baileys', category: 'Alcohol', subcategory: 'Licores', quantity: 6, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Pacharán Zoco', category: 'Alcohol', subcategory: 'Licores', quantity: 4, unit: 'botellas 70cl', minThreshold: 1 },
  { id: '', name: 'Licor de Hierbas', category: 'Alcohol', subcategory: 'Licores', quantity: 6, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Crema de Orujo', category: 'Alcohol', subcategory: 'Licores', quantity: 6, unit: 'botellas 70cl', minThreshold: 2 },
  { id: '', name: 'Martini Rojo', category: 'Alcohol', subcategory: 'Licores', quantity: 6, unit: 'botellas 1L', minThreshold: 2 },

  // AGUA Y REFRESCOS
  { id: '', name: 'Coca Cola Original', category: 'Bebidas', subcategory: 'Refrescos', quantity: 120, unit: 'botellines', minThreshold: 24 },
  { id: '', name: 'Coca Cola Zero', category: 'Bebidas', subcategory: 'Refrescos', quantity: 90, unit: 'botellines', minThreshold: 24 },
  { id: '', name: 'Fanta Naranja', category: 'Bebidas', subcategory: 'Refrescos', quantity: 60, unit: 'botellines', minThreshold: 12 },
  { id: '', name: 'Fanta Limón', category: 'Bebidas', subcategory: 'Refrescos', quantity: 48, unit: 'botellines', minThreshold: 12 },
  { id: '', name: 'Sprite', category: 'Bebidas', subcategory: 'Refrescos', quantity: 24, unit: 'botellines', minThreshold: 12 },
  { id: '', name: 'Nestea Limón', category: 'Bebidas', subcategory: 'Refrescos', quantity: 30, unit: 'latas', minThreshold: 10 },
  { id: '', name: 'Aquarius Limón', category: 'Bebidas', subcategory: 'Refrescos', quantity: 40, unit: 'latas', minThreshold: 10 },
  { id: '', name: 'Tónica Schweppes', category: 'Bebidas', subcategory: 'Refrescos', quantity: 100, unit: 'botellines', minThreshold: 24 },
  { id: '', name: 'Zumo Piña', category: 'Bebidas', subcategory: 'Zumos', quantity: 24, unit: 'botellines', minThreshold: 6 },
  { id: '', name: 'Zumo Melocotón', category: 'Bebidas', subcategory: 'Zumos', quantity: 24, unit: 'botellines', minThreshold: 6 },
  { id: '', name: 'Agua Mineral 33cl', category: 'Bebidas', subcategory: 'Agua', quantity: 200, unit: 'botellas', minThreshold: 48 },
  { id: '', name: 'Agua Mineral 1L', category: 'Bebidas', subcategory: 'Agua', quantity: 50, unit: 'botellas', minThreshold: 12 },
  { id: '', name: 'Agua con Gas', category: 'Bebidas', subcategory: 'Agua', quantity: 40, unit: 'botellas', minThreshold: 10 },

  // DESAYUNO BEBIBLE
  { id: '', name: 'Cola Cao Sobres', category: 'Desayuno', subcategory: 'Cacao', quantity: 100, unit: 'sobres', minThreshold: 20 },
  { id: '', name: 'Nesquik Bote', category: 'Desayuno', subcategory: 'Cacao', quantity: 5, unit: 'botes 1kg', minThreshold: 1 },

  // LECHE Y CAFÉ
  { id: '', name: 'Café en Grano Natural', category: 'Cafetería', subcategory: 'Café', quantity: 20, unit: 'kg', minThreshold: 5 },
  { id: '', name: 'Café Descafeinado Grano', category: 'Cafetería', subcategory: 'Café', quantity: 8, unit: 'kg', minThreshold: 2 },
  { id: '', name: 'Infusión Manzanilla', category: 'Cafetería', subcategory: 'Infusiones', quantity: 50, unit: 'sobres', minThreshold: 10 },
  { id: '', name: 'Infusión Menta Poleo', category: 'Cafetería', subcategory: 'Infusiones', quantity: 50, unit: 'sobres', minThreshold: 10 },
  { id: '', name: 'Infusión Té Rojo', category: 'Cafetería', subcategory: 'Infusiones', quantity: 30, unit: 'sobres', minThreshold: 5 },
  { id: '', name: 'Leche Entera Hostelería', category: 'Lácteos', subcategory: 'Leche', quantity: 60, unit: 'litros', minThreshold: 12 },
  { id: '', name: 'Leche Desnatada', category: 'Lácteos', subcategory: 'Leche', quantity: 24, unit: 'litros', minThreshold: 6 },
  { id: '', name: 'Leche de Soja', category: 'Lácteos', subcategory: 'Leche', quantity: 12, unit: 'litros', minThreshold: 3 },
  { id: '', name: 'Leche de Avena', category: 'Lácteos', subcategory: 'Leche', quantity: 12, unit: 'litros', minThreshold: 3 },
  { id: '', name: 'Batido Cacao Puleva', category: 'Lácteos', subcategory: 'Batidos', quantity: 24, unit: 'botellines', minThreshold: 6 },
  { id: '', name: 'Batido Fresa Puleva', category: 'Lácteos', subcategory: 'Batidos', quantity: 24, unit: 'botellines', minThreshold: 6 },
  { id: '', name: 'Azúcar Blanco', category: 'Cafetería', subcategory: 'Café', quantity: 10, unit: 'kg', minThreshold: 2 },

  // COCINA: PAN, BOLLERIA, CARNES, VERDURAS (Raw Ingredients)
  { id: '', name: 'Croissants Mantequilla', category: 'Desayuno', subcategory: 'Bollería', quantity: 50, unit: 'unidades', minThreshold: 10 },
  { id: '', name: 'Napolitanas Choco', category: 'Desayuno', subcategory: 'Bollería', quantity: 30, unit: 'unidades', minThreshold: 5 },
  { id: '', name: 'Pan Burger Brioche', category: 'Cocina', subcategory: 'Pan', quantity: 100, unit: 'unidades', minThreshold: 20 },
  { id: '', name: 'Baguette Congelada', category: 'Cocina', subcategory: 'Pan', quantity: 80, unit: 'unidades', minThreshold: 20 },
  { id: '', name: 'Pan de Molde', category: 'Cocina', subcategory: 'Pan', quantity: 10, unit: 'paquetes', minThreshold: 2 },
  
  // INGREDIENTES CRUDOS (TEST EXCLUSION)
  { id: '', name: 'Solomillo de Ternera', category: 'Carnes', subcategory: 'Carne', quantity: 20, unit: 'kg', minThreshold: 5 },
  { id: '', name: 'Pechuga de Pollo', category: 'Carnes', subcategory: 'Carne', quantity: 30, unit: 'kg', minThreshold: 5 },
  { id: '', name: 'Salmón Noruego', category: 'Pescados', subcategory: 'Pescado', quantity: 10, unit: 'kg', minThreshold: 2 },
  { id: '', name: 'Tomate Rama', category: 'Verduras', subcategory: 'Verduras', quantity: 20, unit: 'kg', minThreshold: 5 },
  { id: '', name: 'Lechuga Iceberg', category: 'Verduras', subcategory: 'Verduras', quantity: 15, unit: 'cajas', minThreshold: 3 },
  { id: '', name: 'Arroz Bomba', category: 'Alimentación', subcategory: 'Despensa', quantity: 50, unit: 'kg', minThreshold: 10 },
  { id: '', name: 'Aceite de Oliva Virgen', category: 'Cocina', subcategory: 'Aceite', quantity: 25, unit: 'litros', minThreshold: 5 },

  // GASTRO BAR FOOD (Snacks)
  { id: '', name: 'Patatas Fritas Bolsa', category: 'Alimentación', subcategory: 'Snacks', quantity: 40, unit: 'bolsas', minThreshold: 10 },
  { id: '', name: 'Aceitunas Rellenas', category: 'Alimentación', subcategory: 'Aperitivos', quantity: 12, unit: 'latas', minThreshold: 3 },
  { id: '', name: 'Almendras Fritas', category: 'Alimentación', subcategory: 'Frutos Secos', quantity: 10, unit: 'kg', minThreshold: 2 },

  // LIMPIEZA
  { id: '', name: 'Lavavajillas Industrial', category: 'Limpieza', subcategory: 'Químicos', quantity: 8, unit: 'bidones 10L', minThreshold: 2 },
  { id: '', name: 'Abrillantador', category: 'Limpieza', subcategory: 'Químicos', quantity: 6, unit: 'bidones 5L', minThreshold: 2 },
  { id: '', name: 'Bobina Papel Secamanos', category: 'Limpieza', subcategory: 'Papel', quantity: 24, unit: 'rollos', minThreshold: 6 },
  { id: '', name: 'Servilletas 20x20', category: 'Limpieza', subcategory: 'Desechables', quantity: 20, unit: 'paquetes', minThreshold: 5 },
  { id: '', name: 'Bolsas Basura 100L', category: 'Limpieza', subcategory: 'Bolsas', quantity: 15, unit: 'rollos', minThreshold: 5 },
  
  // TIENDA
  { id: '', name: 'Postal Hotel', category: 'Tienda de Regalos', subcategory: 'Souvenirs', quantity: 50, unit: 'unidades', minThreshold: 10 },
  { id: '', name: 'Imán Nevera', category: 'Tienda de Regalos', subcategory: 'Souvenirs', quantity: 30, unit: 'unidades', minThreshold: 5 },
  { id: '', name: 'Camiseta Logo', category: 'Tienda de Regalos', subcategory: 'Tienda', quantity: 20, unit: 'unidades', minThreshold: 5 },
];

// Add isDemo flag to all
const DEMO_PRODUCTS = RAW_DEMO_PRODUCTS.map(p => ({ ...p, isDemo: true }));

export interface OrderBatch {
  batchId: string;
  date: string;
  department: Department;
  requestedBy: string;
  items: ReplenishmentRequest[];
}

// Check if Firebase is available
const isFirebaseReady = !!db;

// INTERNAL HELPER: Seed Logic with Timeout
// This prevents the UI from freezing if Firebase is unreachable
const seedDatabaseInternal = async (products: Product[]) => {
  return new Promise<void>(async (resolve, reject) => {
    // 1. Safety Timeout: If Firebase takes > 15s, reject.
    const timeout = setTimeout(() => {
       reject(new Error("La operación ha tardado demasiado. Comprueba tu conexión a Internet o los permisos de Firebase."));
    }, 15000);

    try {
      if (!isFirebaseReady) throw new Error("Firebase no está inicializado.");

      console.log("Iniciando conexión a Firebase...");
      
      // 2. Connectivity Check (Fast read)
      try {
        await getDocs(query(collection(db, 'products'), limit(1)));
      } catch(e: any) {
        throw new Error("No hay conexión con la base de datos: " + e.message);
      }
      
      console.log("Conexión verificada. Preparando lotes...");

      // 3. Batch Writes
      // Reduced batch size to 50 for max reliability on mobile networks
      const batchSize = 50; 
      const chunks = [];
      for (let i = 0; i < products.length; i += batchSize) {
        chunks.push(products.slice(i, i + batchSize));
      }

      let count = 0;
      for (const chunk of chunks) {
         const newBatch = writeBatch(db);
         chunk.forEach(p => {
           // Remove empty ID, let Firestore generate a new one
           const { id, ...data } = p;
           const finalData = { ...data, isDemo: true };
           
           // Use doc(collection) to generate ID reference
           const ref = doc(collection(db, 'products'));
           newBatch.set(ref, finalData);
         });
         await newBatch.commit();
         count++;
         console.log(`Lote ${count}/${chunks.length} enviado.`);
      }

      clearTimeout(timeout);
      resolve();
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
};

export const storageService = {
  // --- AUTH & SESSION ---
  login: async (name: string, pin: string): Promise<User | null> => {
    if (isFirebaseReady) {
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        if (!snapshot.empty) {
           const users = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
           const match = users.find(u => 
             u.name.trim().toLowerCase() === name.trim().toLowerCase() && 
             u.pin === pin
           );
           if (match) {
             localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(match));
             return match;
           }
        }
        // Seeding logic removed from login to keep it fast. Admin must seed via button.
        return null;
      } catch (e: any) {
        console.error("Firebase login error:", e.message || e);
        if (e.code === 'permission-denied') {
          alert("Error de Permisos: Verifica que las reglas de Firestore estén en 'Test Mode' (Modo de prueba).");
        } else {
          alert(`Error de conexión: ${e.message}`);
        }
        return null;
      }
    } else {
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
      window.addEventListener('storage-products-update', () => {
         const updated = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
         callback(updated);
      });
      callback(prods);
      return () => {};
    }
  },

  subscribeToBatches: (callback: (batches: OrderBatch[]) => void) => {
    if (isFirebaseReady) {
      return onSnapshot(query(collection(db, 'requests'), orderBy('timestamp', 'desc')), (snapshot) => {
        const requests = snapshot.docs.map(doc => doc.data() as ReplenishmentRequest);
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
       const loadLocal = () => {
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
       };
       window.addEventListener('storage-requests-update', loadLocal);
       loadLocal();
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
      const loadFiles = () => callback(JSON.parse(localStorage.getItem(KEYS.FILES) || '[]'));
      window.addEventListener('storage-files-update', loadFiles);
      loadFiles();
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
      const loadUsers = () => callback(JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS)));
      window.addEventListener('storage-users-update', loadUsers);
      loadUsers();
      return () => {};
    }
  },

  // --- ACTIONS ---
  saveProduct: async (product: Product) => {
    if (isFirebaseReady) {
      const { id, ...data } = product;
      if (product.id.startsWith('p_') || product.id.length < 5 || product.id.includes('demo_')) { 
         await addDoc(collection(db, 'products'), data); 
      } else {
         await updateDoc(doc(db, 'products', product.id), data);
      }
    } else {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
      const idx = products.findIndex((p: Product) => p.id === product.id);
      if (idx >= 0) products[idx] = product;
      else products.push(product);
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
      window.dispatchEvent(new Event('storage-products-update'));
    }
  },

  // ROBUST SEEDING FUNCTION
  generateDemoData: async () => {
    if (isFirebaseReady) {
      // Use the internal robust function
      return seedDatabaseInternal(DEMO_PRODUCTS);
    } else {
      // Local fallback
      console.warn("Usando LocalStorage para demo (Firebase no disponible).");
      const current = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
      const mapped = DEMO_PRODUCTS.map((p, i) => ({ 
          ...p, 
          id: `demo_${Date.now()}_${i}`,
          isDemo: true
      }));
      const merged = [...current, ...mapped];
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(merged));
      window.dispatchEvent(new Event('storage-products-update'));
      return Promise.resolve();
    }
  },
  
  clearDemoData: async () => {
    if (isFirebaseReady) {
       const q = query(collection(db, 'products'), where('isDemo', '==', true));
       const snapshot = await getDocs(q);
       
       if (snapshot.empty) return;

       const batchSize = 50;
       const chunks = [];
       for (let i = 0; i < snapshot.docs.length; i += batchSize) {
          chunks.push(snapshot.docs.slice(i, i + batchSize));
       }

       for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
       }
    } else {
       let products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || '[]');
       products = products.filter((p: Product) => !p.isDemo);
       localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products));
       window.dispatchEvent(new Event('storage-products-update'));
    }
  },

  deleteProduct: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'products', id));
    } else {
      const products = JSON.parse(localStorage.getItem(KEYS.PRODUCTS) || JSON.stringify(INITIAL_PRODUCTS));
      localStorage.setItem(KEYS.PRODUCTS, JSON.stringify(products.filter((p: Product) => p.id !== id)));
      window.dispatchEvent(new Event('storage-products-update'));
    }
  },

  submitOrderBatch: async (items: {product: Product, quantity: number}[], department: Department, user: User) => {
    const timestamp = Date.now();
    const batchId = `ORD-${timestamp.toString().slice(-6)}`;
    const date = new Date().toLocaleString();
    const lowStockItems: string[] = [];

    if (isFirebaseReady) {
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
      window.dispatchEvent(new Event('storage-products-update'));
      window.dispatchEvent(new Event('storage-requests-update'));
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
      window.dispatchEvent(new Event('storage-requests-update'));
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
      window.dispatchEvent(new Event('storage-files-update'));
    }
  },

  deleteFile: async (id: string) => {
     if (isFirebaseReady) {
       await deleteDoc(doc(db, 'files', id));
     } else {
       const files = JSON.parse(localStorage.getItem(KEYS.FILES) || '[]');
       localStorage.setItem(KEYS.FILES, JSON.stringify(files.filter((f: UploadedFile) => f.id !== id)));
       window.dispatchEvent(new Event('storage-files-update'));
     }
  },

  addUser: async (user: User) => {
    if (isFirebaseReady) {
      await addDoc(collection(db, 'users'), user);
    } else {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS));
      users.push(user);
      localStorage.setItem(KEYS.USERS, JSON.stringify(users));
      window.dispatchEvent(new Event('storage-users-update'));
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
         window.dispatchEvent(new Event('storage-users-update'));
       }
    }
  },

  deleteUser: async (id: string) => {
    if (isFirebaseReady) {
      await deleteDoc(doc(db, 'users', id));
    } else {
      const users = JSON.parse(localStorage.getItem(KEYS.USERS) || JSON.stringify(INITIAL_USERS));
      localStorage.setItem(KEYS.USERS, JSON.stringify(users.filter((u: User) => u.id !== id)));
      window.dispatchEvent(new Event('storage-users-update'));
    }
  },

  // Helpers
  getDraftCart: () => JSON.parse(localStorage.getItem(KEYS.DRAFT_CART) || '[]'),
  saveDraftCart: (cart: any[]) => localStorage.setItem(KEYS.DRAFT_CART, JSON.stringify(cart)),
  getDraftDepartment: () => JSON.parse(localStorage.getItem(KEYS.DRAFT_DEPT) || 'null'),
  saveDraftDepartment: (dept: Department) => localStorage.setItem(KEYS.DRAFT_DEPT, JSON.stringify(dept)),
  getLastView: () => localStorage.getItem(KEYS.LAST_VIEW),
  saveLastView: (view: string) => localStorage.setItem(KEYS.LAST_VIEW, view),
  createBackup: () => { return "{}"; }, // Disabled for brevity
  restoreBackup: () => { return false; },
  downloadStockCSV: () => {},
  downloadRequestsCSV: () => {}
};
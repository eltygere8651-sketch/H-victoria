import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem, AppNotification, NotificationType, NotificationPayload, OrderBatch, Task, TaskStatus, TaskPriority, TaskType, TaskComment, Document, TaskRecurrence } from '../types';
import { db, auth, storage } from '../firebaseConfig';
export { auth, db, storage };
import firebase from 'firebase/compat/app';
import { fileToBase64 } from '../utils/imageCompressor';

export const SUPER_ADMIN_EMAIL = 'eltygere8651@gmail.com';

export const sanitizeData = (data: any) => {
  const sanitized = { ...data };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key];
    }
  });
  return sanitized;
};

const KEYS = {
  USERS: 'hotel_victoria_users',
  PRODUCTS: 'hotel_victoria_products',
  DEPARTMENTS: 'hotel_victoria_departments',
  REQUESTS: 'hotel_victoria_requests',
  CURRENT_SESSION: 'hotel_victoria_session',
  DRAFT_CART: 'hotel_victoria_draft_cart',
  LAST_VIEW: 'hotel_victoria_last_view',
  NOTIFICATIONS: 'hotel_victoria_notifications',
  TASKS: 'hotel_victoria_tasks',
  DOCUMENTS: 'hotel_victoria_documents',
  SYSTEM: 'hotel_victoria_system',
};

const INITIAL_USERS: User[] = [
  { id: '1', name: 'Administrador', role: UserRole.ADMIN, contraseña: '1234', permissions: ['CAN_MANAGE_TASKS'] },
  { id: '2', name: 'Camarero Bar', role: UserRole.STAFF, contraseña: '1234' },
  { id: '3', name: 'Chef Restaurante', role: UserRole.STAFF, contraseña: '1234' }
];

// REQUISITO: Solo Bar y Restaurante
const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'd-bar', name: 'Bar / Cafetería' },
  { id: 'd-restaurante', name: 'Restaurante' }
];

// Productos de ejemplo optimizados para los nuevos departamentos
const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Coca Cola', category: 'Bebidas', quantity: 24, unit: 'latas', minThreshold: 12, departmentId: 'd-bar', departmentName: 'Bar', departmentIds: ['d-bar', 'd-restaurante'], departmentNames: ['Bar', 'Restaurante'] },
  { id: 'p2', name: 'Agua Mineral', category: 'Bebidas', quantity: 48, unit: 'botellas', minThreshold: 24, departmentId: 'd-bar', departmentName: 'Bar', departmentIds: ['d-bar', 'd-restaurante'], departmentNames: ['Bar', 'Restaurante'] },
  { id: 'p3', name: 'Cerveza', category: 'Bebidas', quantity: 50, unit: 'botellines', minThreshold: 10, departmentId: 'd-bar', departmentName: 'Bar', departmentIds: ['d-bar'], departmentNames: ['Bar'] },
  { id: 'p4', name: 'Harina de Trigo', category: 'Despensa', quantity: 15, unit: 'kg', minThreshold: 5, departmentId: 'd-restaurante', departmentName: 'Restaurante', departmentIds: ['d-restaurante'], departmentNames: ['Restaurante'] },
  { id: 'p5', name: 'Aceite de Oliva', category: 'Cocina', quantity: 10, unit: 'litros', minThreshold: 4, departmentId: 'd-restaurante', departmentName: 'Restaurante', departmentIds: ['d-restaurante'], departmentNames: ['Restaurante'] },
  { id: 'p6', name: 'Servilletas', category: 'Suministros', quantity: 100, unit: 'paquetes', minThreshold: 20, departmentId: 'd-restaurante', departmentName: 'Restaurante', departmentIds: ['d-restaurante'], departmentNames: ['Restaurante'] },
];

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

// Helper to safely stringify objects that might have circular references
const safeStringify = (obj: any) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  });
};

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const safeError = error instanceof Error ? error.message : String(error);
  const currentUser = auth.currentUser;
  const authInfo = currentUser ? {
    uid: currentUser.uid,
    email: currentUser.email,
    isAnonymous: currentUser.isAnonymous
  } : 'NOT SIGNED IN';

  const fallbackMsg = `Firestore Error in ${operationType} at ${path}: ${safeError}. Auth: ${safeStringify(authInfo)}`;
  console.error(fallbackMsg);
  throw new Error(fallbackMsg);
}

export const getCurrentUser = () => auth.currentUser;

async function initFirestoreWithInitialData() {
  console.log("Comprobando estado de inicialización...");

  try {
    const initRef = db.collection(KEYS.SYSTEM).doc('initialization');
    const initDoc = await initRef.get();

    // Comprobamos si hay productos. Si no hay nada, forzamos re-inicialización básica
    const productsCheck = await db.collection(KEYS.PRODUCTS).limit(1).get();
    const hasProducts = !productsCheck.empty;

    if (initDoc.exists && initDoc.data()?.isInitialized && hasProducts) {
      return;
    }

    // Ensure core departments exist
    const deptBatch = db.batch();
    INITIAL_DEPARTMENTS.forEach(dept => {
      const docRef = db.collection(KEYS.DEPARTMENTS).doc(dept.id);
      deptBatch.set(docRef, dept, { merge: true });
    });
    try {
      await deptBatch.commit();
    } catch (e) {
      console.warn("No se pudieron pre-inicializar departamentos (posible falta de permisos iniciales)");
    }

    // 1. Usuarios, Productos y Departamentos (Check each independently)
    const collectionsToInit = [
      { name: KEYS.USERS, data: INITIAL_USERS },
      { name: KEYS.PRODUCTS, data: INITIAL_PRODUCTS },
      { name: KEYS.DEPARTMENTS, data: INITIAL_DEPARTMENTS },
    ];

    for (const { name, data } of collectionsToInit) {
      const q = db.collection(name).limit(1);
      const snapshot = await q.get();
      if (snapshot.empty) {
        console.log(`Inicializando colección: ${name}`);
        const batch = db.batch();
        data.forEach(item => {
          const docRef = (item as any).id ? db.collection(name).doc((item as any).id) : db.collection(name).doc();
          let finalItem = { ...(item as any), id: (item as any).id || docRef.id };
          
          if (name === KEYS.USERS && 'contraseña' in (item as any)) {
            const { contraseña, ...rest }: any = finalItem;
            finalItem = { ...rest, pin: contraseña };
          }
          
          batch.set(docRef, finalItem);
        });
        await batch.commit();
      }
    }

    // Marcar como inicializado para no volver a ejecutar esto
    await initRef.set({ isInitialized: true, timestamp: Date.now() });
    console.log("Sincronización inicial completada y marcada como inicializada.");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, KEYS.SYSTEM);
  }
}

// --- AUTH HELPERS ---

// Simple hashing for passwords using SHA-256
async function hashContraseña(contraseña: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(contraseña);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verificarContraseña(contraseña: string, hashedContraseña: string): Promise<boolean> {
  const hash = await hashContraseña(contraseña);
  return hash === hashedContraseña;
}

export const login = async (name: string, contraseña: string): Promise<User | null> => {
  const hashedPin = await hashContraseña(contraseña);
  
  // Try to find user with hashed PIN (we keep DB field as "pin" for migration safety, but use it as password)
  const qHashed = db.collection(KEYS.USERS).where("pin", "==", hashedPin);
  const querySnapshotHashed = await qHashed.get();
  
  if (!querySnapshotHashed.empty) {
    const match = querySnapshotHashed.docs.find(doc => {
      const userData = doc.data();
      return userData.name.toLowerCase() === name.toLowerCase();
    });

    if (match) {
      const data = match.data();
      const user = { ...data, contraseña: data.pin, id: match.id } as User;
      // Associate Auth UID with the user document for rules evaluation
      if (auth.currentUser) {
        const currentAuthUid = auth.currentUser.uid;
        console.log(`Asociando Auth UID ${currentAuthUid} al usuario ${match.id} (${user.name})`);
        try {
          // 1. Update the original user doc with the authUid
          await db.collection(KEYS.USERS).doc(match.id).set({ 
            authUid: currentAuthUid,
            lastLogin: Date.now()
          }, { merge: true });

          // 2. Create/Update a UID-indexed document for persistent Firestore permissions
          await db.collection(KEYS.USERS).doc(currentAuthUid).set({
            ...user,
            authUid: currentAuthUid,
            originalId: match.id,
            lastLogin: Date.now()
          }, { merge: true });
          
          console.log("Documentos de vinculación actualizados correctamente.");
        } catch (e: any) {
          console.error(`Error en vinculación de usuario [UID: ${currentAuthUid}, ID: ${match.id}]:`, e.message);
        }
      }
      saveSession(user);
      return user;
    }
  }

  // Fallback: Check if user exists with raw password (for migration)
  const qRaw = db.collection(KEYS.USERS).where("name", "==", name);
  const querySnapshotRaw = await qRaw.get();

  if (!querySnapshotRaw.empty) {
    const doc = querySnapshotRaw.docs[0];
    const userData = doc.data();
    if (userData.pin === contraseña) {
      const hashedPin = await hashContraseña(contraseña);
      // User found with raw password, migrate them to hashed password
      await doc.ref.update({ 
        pin: hashedPin,
        authUid: auth.currentUser?.uid || null,
        lastLogin: Date.now()
      });
      const user = { ...userData, id: doc.id, contraseña: hashedPin } as User;
      saveSession(user);
      return user;
    }
  }

  return null;
};

// Retry helper for robust network requests
const retry = async <T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return retry(fn, retries - 1, delayMs * 1.5);
  }
};

export const ensureAnonymousAuth = async () => {
    if (!auth.currentUser) {
        try {
            await auth.signInAnonymously();
            console.log("Sesión anónima iniciada para seguridad de Firestore.");
        } catch (e) {
            console.error("Error al iniciar sesión anónima:", e);
        }
    }
    await initFirestoreWithInitialData();
};

export const saveSession = (user: User) => localStorage.setItem(KEYS.CURRENT_SESSION, safeStringify(user));
export const getSession = (): User | null => JSON.parse(localStorage.getItem(KEYS.CURRENT_SESSION) || 'null');
export const clearSession = async () => {
    localStorage.removeItem(KEYS.CURRENT_SESSION);
    try {
        await auth.signOut();
    } catch (e) {
        console.error("Error signing out", e);
    }
};
export const saveLastView = (view: string) => localStorage.setItem(KEYS.LAST_VIEW, view);
export const getLastView = (): string | null => localStorage.getItem(KEYS.LAST_VIEW);

export const ensureAdminSession = async (user: User) => {
  if (user.role === UserRole.ADMIN && auth.currentUser) {
    const uid = auth.currentUser.uid;
    try {
      const userRef = db.collection(KEYS.USERS).doc(uid);
      const userDoc = await userRef.get();
      if (!userDoc.exists || userDoc.data()?.role !== UserRole.ADMIN) {
        console.log(`Asegurando rol ADMIN para UID: ${uid}...`);
        await userRef.set({
          ...user,
          authUid: uid,
          lastLogin: Date.now(),
          reason: 'ensure-admin-status'
        }, { merge: true });
      }
    } catch (e: any) {
      console.error(`Error asegurando status admin para UID ${uid}:`, e.message);
    }
  }
};

export const signInWithGoogle = async () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
        const result = await auth.signInWithPopup(provider);
        return result.user;
    } catch (error) {
        console.error("Error signing in with Google", error);
        throw error;
    }
};

// --- CART ---
export const saveDraftCart = async (userId: string, cart: CartItem[]) => {
  localStorage.setItem(KEYS.DRAFT_CART, safeStringify(cart));
  
  // If we have an authenticated user, we also save to cloud using their UID for security
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    try {
      const uid = auth.currentUser.uid;
      // We save in the dedicated draft_cart collection which is Auth UID indexed
      await db.collection(KEYS.DRAFT_CART).doc(uid).set({ 
        cart, 
        profileId: userId,
        updatedAt: Date.now() 
      });
    } catch (e) {
      console.error("Error saving draft cart to cloud collection:", e);
      // Fallback fallback: try to save to user profile if rules allow
      try {
        await db.collection(KEYS.USERS).doc(userId).set({ draftCart: cart }, { merge: true });
      } catch (e2) {
        // Silently fail if both cloud attempts fail, we still have localStorage
      }
    }
  }
};

export const getDraftCart = async (userId?: string): Promise<CartItem[]> => {
  // 1. Try local storage first for fastest response
  const localCart = JSON.parse(localStorage.getItem(KEYS.DRAFT_CART) || '[]');
  
  // 2. If authenticated, try to sync from cloud
  if (auth.currentUser && !auth.currentUser.isAnonymous) {
    try {
      const uid = auth.currentUser.uid;
      const doc = await db.collection(KEYS.DRAFT_CART).doc(uid).get();
      if (doc.exists && doc.data()?.cart) {
        return doc.data()?.cart as CartItem[];
      }
    } catch (e) {
      console.error("Error getting draft cart from dedicated cloud collection:", e);
    }
  }

  // 3. Fallback to user profile if provided
  if (userId && userId !== 'guest' && !userId.startsWith('guest-')) {
    try {
      const doc = await db.collection(KEYS.USERS).doc(userId).get();
      if (doc.exists && doc.data()?.draftCart) {
        return doc.data()?.draftCart as CartItem[];
      }
    } catch (e) {
      console.error("Error getting draft cart from profile document:", e);
    }
  }

  return localCart;
};

// --- DEPARTMENTS ---
export const subscribeToDepartments = (callback: (data: Department[]) => void) => {
    return db.collection(KEYS.DEPARTMENTS).orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department)));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.DEPARTMENTS));
};
export const saveDepartment = async (department: Partial<Department>) => {
  try {
    const docRef = department.id ? db.collection(KEYS.DEPARTMENTS).doc(department.id) : db.collection(KEYS.DEPARTMENTS).doc();
    console.log(`Guardando departamento: ${docRef.id}... Role: ${getSession()?.role}`);
    await docRef.set(sanitizeData({ ...department, id: docRef.id }), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, KEYS.DEPARTMENTS);
  }
};
export const deleteDepartment = async (id: string) => {
  try {
    await db.collection(KEYS.DEPARTMENTS).doc(id).delete();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, KEYS.DEPARTMENTS);
  }
};

// --- PRODUCTS ---
export const subscribeToProducts = (callback: (data: Product[]) => void) => {
    return db.collection(KEYS.PRODUCTS).orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.PRODUCTS));
};
export const saveProduct = async (product: Partial<Product>, userName: string = 'Administrador') => {
  try {
    const isNew = !product.id;
    const path = KEYS.PRODUCTS;
    const docRef = product.id ? db.collection(path).doc(product.id) : db.collection(path).doc();
    const id = docRef.id;
    console.log(`Guardando producto en path: ${path}/${id}`);
    await docRef.set(sanitizeData({ ...product, id }), { merge: true });

    if (isNew) {
      await db.collection(KEYS.NOTIFICATIONS).add({
        type: NotificationType.INVENTORY_ADJUSTMENT,
        title: 'Nuevo Producto Creado',
        message: `El producto "${product.name}" ha sido añadido al inventario por ${userName}.`,
        icon: 'Plus',
        timestamp: Date.now(),
        readStatus: false,
        payload: { productId: id, productName: product.name }
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, KEYS.PRODUCTS);
  }
};
export const deleteProduct = async (id: string, userName: string = 'Administrador') => {
  const productDoc = await db.collection(KEYS.PRODUCTS).doc(id).get();
  const productName = productDoc.exists ? productDoc.data()?.name : 'Desconocido';
  
  await db.collection(KEYS.PRODUCTS).doc(id).delete();

  await db.collection(KEYS.NOTIFICATIONS).add({
    type: NotificationType.INVENTORY_ADJUSTMENT,
    title: 'Producto Eliminado',
    message: `El producto "${productName}" ha sido eliminado del inventario por ${userName}.`,
    icon: 'Trash2',
    timestamp: Date.now(),
    readStatus: false,
    payload: { productId: id, productName: productName }
  });
};

// Removed cleanAndBoostStock to prevent accidental data loss

// --- ORDERS ---
export const submitOrderBatch = async (cart: CartItem[], departmentId: string, departmentName: string, user: User) => {
  const batch = db.batch();
  const batchId = Date.now().toString().slice(-6);
  const lowStockItems: string[] = [];

  for (const item of cart) {
    const productRef = db.collection(KEYS.PRODUCTS).doc(item.product.id);
    const newQuantity = item.product.quantity - item.quantity;
    batch.update(productRef, { quantity: newQuantity });
    
    const requestRef = db.collection(KEYS.REQUESTS).doc();
    batch.set(requestRef, {
      batchId, productId: item.product.id, productName: item.product.name,
      departmentId, departmentName, requestedBy: user.name,
      quantity: item.quantity, status: 'COMPLETED',
      date: new Date().toLocaleString(), timestamp: Date.now(), unit: item.product.unit
    });

    if (newQuantity <= item.product.minThreshold) {
      lowStockItems.push(item.product.name);
      // Create notification for low stock
      const notifRef = db.collection(KEYS.NOTIFICATIONS).doc();
      batch.set(notifRef, {
        type: NotificationType.LOW_STOCK,
        title: 'Alerta de Almacén Bajo',
        message: `El producto "${item.product.name}" ha alcanzado el umbral mínimo.`,
        icon: 'AlertTriangle',
        timestamp: Date.now(),
        readStatus: false,
        payload: { productId: item.product.id, productName: item.product.name }
      });
    }
  }
  
  // Create notification for new order
  const orderNotifRef = db.collection(KEYS.NOTIFICATIONS).doc();
  batch.set(orderNotifRef, {
    type: NotificationType.NEW_ORDER,
    title: 'Nuevo Albarán Recibido',
    message: `Nuevo albarán del departamento "${departmentName}" realizado por ${user.name}.`,
    icon: 'Package',
    timestamp: Date.now(),
    readStatus: false,
    payload: { orderBatchId: batchId, departmentName }
  });

  await batch.commit();

  return { success: true, lowStockItems, batchId };
};

export const receiveStockBatch = async (items: { productId: string; productName: string; quantityToAdd: number; unit: string }[], userName: string, sourceType: 'PROVIDER' | 'ADMIN' = 'PROVIDER') => {
  const batch = db.batch();
  const batchId = (sourceType === 'ADMIN' ? 'ADM-' : 'ING-') + Date.now().toString().slice(-6);
  
  for (const item of items) {
    const productRef = db.collection(KEYS.PRODUCTS).doc(item.productId);
    batch.update(productRef, { 
      quantity: firebase.firestore.FieldValue.increment(item.quantityToAdd) 
    });

    // Create a request document to represent this item in the Albarán
    const requestRef = db.collection(KEYS.REQUESTS).doc();
    batch.set(requestRef, {
      batchId, 
      productId: item.productId, 
      productName: item.productName,
      departmentId: 'INGRESO', 
      departmentName: sourceType === 'ADMIN' ? 'Ingreso de Mercancía' : 'Ingreso de Proveedor', 
      requestedBy: userName,
      quantity: item.quantityToAdd, 
      status: 'COMPLETED',
      date: new Date().toLocaleString(), 
      timestamp: Date.now(), 
      unit: item.unit
    });
  }

  // Create a notification for the received stock
  const notifRef = db.collection(KEYS.NOTIFICATIONS).doc();
  batch.set(notifRef, {
    type: NotificationType.STOCK_RECEIVED,
    title: sourceType === 'ADMIN' ? 'Ingreso de Mercancía' : 'Ingreso de Proveedor',
    message: sourceType === 'ADMIN' 
      ? `Se ha registrado el ingreso de ${items.length} producto(s) por el Administrador.`
      : `Se ha registrado el ingreso de ${items.length} producto(s) por el proveedor / repartidor.`,
    icon: sourceType === 'ADMIN' ? 'ShieldAlert' : 'PackagePlus',
    timestamp: Date.now(),
    readStatus: false,
    payload: { itemCount: items.length, orderBatchId: batchId, sourceType }
  });

  await batch.commit();

  return { success: true, batchId };
};

export const subscribeToBatches = (callback: (batches: OrderBatch[]) => void) => {
  return db.collection(KEYS.REQUESTS).orderBy('timestamp', 'desc').limit(200).onSnapshot(snapshot => {
    const requests = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ReplenishmentRequest));
    const batches = requests.reduce((acc, req) => {
      if (!req.batchId) return acc;
      acc[req.batchId] = acc[req.batchId] || { batchId: req.batchId, date: req.date, departmentId: req.departmentId, departmentName: req.departmentName, requestedBy: req.requestedBy, items: [] };
      acc[req.batchId].items.push(req);
      return acc;
    }, {} as Record<string, OrderBatch>);
    callback(Object.values(batches));
  }, error => handleFirestoreError(error, OperationType.GET, KEYS.REQUESTS));
};
export const deleteBatch = async (batchId: string) => {
  const q = db.collection(KEYS.REQUESTS).where('batchId', '==', batchId);
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

export const clearAllReplenishmentRequests = async () => {
  try {
    const snapshot = await db.collection(KEYS.REQUESTS).get();
    const batchSize = 450;
    let batch = db.batch();
    let count = 0;

    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
      count++;
      if (count >= batchSize) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, KEYS.REQUESTS);
  }
};

// --- USERS ---
export const subscribeToUsers = (callback: (users: User[]) => void) => {
    return db.collection(KEYS.USERS).orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => {
          const data = doc.data();
          return { ...data, contraseña: data.pin, id: doc.id } as User;
        }));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.USERS));
};
export const addUser = async (user: Omit<User, 'id'>) => {
  try {
    // Asegurar que estamos autenticados para tener permisos de escritura (reglas de seguridad)
    if (!auth.currentUser) {
      await auth.signInAnonymously();
    }

    const userId = user.name.toLowerCase().trim();
    const userRef = db.collection(KEYS.USERS).doc(userId);
    const doc = await userRef.get();
    
    if (doc.exists) {
      throw new Error('USERNAME_EXISTS');
    }

    let hashedPassword = '';
    if (user.contraseña) {
      hashedPassword = await hashContraseña(user.contraseña);
    }

    const { contraseña, ...rest } = user;
    const userData = sanitizeData({
      ...rest,
      pin: hashedPassword, // Store as pin in DB
      isSuperAdmin: false,
      isAdmin: false,
      authUid: auth.currentUser?.uid || null,
      createdAt: Date.now(),
      id: userId
    });

    await userRef.set(userData);
    return userData;
  } catch (error: any) {
    if (error.message === 'USERNAME_EXISTS') throw error;
    handleFirestoreError(error, OperationType.WRITE, KEYS.USERS);
  }
};
export const updateUser = async (user: User) => {
  // If password is changed (not a 64 char hash), we hash it
  let finalPassword = user.contraseña;
  if (user.contraseña && user.contraseña.length !== 64) {
    finalPassword = await hashContraseña(user.contraseña);
  }
  
  const { id, contraseña, ...rest } = user;
  const data = {
    ...rest,
    pin: finalPassword // Store as pin in DB
  };
  await db.collection(KEYS.USERS).doc(id).update(sanitizeData(data));
};

export const deleteUser = async (id: string) => {
  const userDoc = await db.collection(KEYS.USERS).doc(id).get();
  const userName = userDoc.exists ? userDoc.data()?.name : 'Desconocido';

  await db.collection(KEYS.USERS).doc(id).delete();
};
export const savePushToken = async (userId: string, token: string) => await db.collection(KEYS.USERS).doc(userId).set({ pushToken: token }, { merge: true });

// --- NOTIFICATIONS ---
export const subscribeToNotifications = (callback: (data: AppNotification[]) => void, unreadOnly = false) => {
  // To avoid composite index requirement, we fetch all and filter in memory if unreadOnly is true
  // or we just fetch with order and filter in memory.
  return db.collection(KEYS.NOTIFICATIONS).orderBy('timestamp', 'desc').onSnapshot(snapshot => {
      let notifications = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification));
      if (unreadOnly) {
        notifications = notifications.filter(n => n.readStatus === false);
      }
      callback(notifications);
  }, error => handleFirestoreError(error, OperationType.GET, KEYS.NOTIFICATIONS));
};
export const markNotificationAsRead = async (id: string, userId: string, userName: string) => await db.collection(KEYS.NOTIFICATIONS).doc(id).update({ readStatus: true, reviewedBy: userName, reviewedAt: Date.now() });
export const markAllNotificationsAsRead = async (userId: string, userName: string) => {
  const q = db.collection(KEYS.NOTIFICATIONS).where('readStatus', '==', false);
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.update(d.ref, { readStatus: true, reviewedBy: userName, reviewedAt: Date.now() }));
  await batch.commit();
};

// --- TASKS ---
export const subscribeToTasks = (callback: (data: Task[]) => void) => {
    return db.collection(KEYS.TASKS).orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.TASKS));
};
import { uploadVideoToCloudinary, uploadImageToCloudinary } from './cloudinaryService';

// --- IMAGES ---
export const uploadImage = async (file: File, folder: string = 'task-images'): Promise<string> => {
  try {
    return await uploadImageToCloudinary(file);
  } catch (error) {
    console.warn("Cloudinary upload failed, falling back to base64", error);
    // Fallback to base64 if Cloudinary is not configured or fails
    return await fileToBase64(file);
  }
};

export const saveTask = async (task: Partial<Task>, newFiles: File[] = [], newVideos: File[] = []) => {
  const isNew = !task.id;
  const docRef = isNew ? db.collection(KEYS.TASKS).doc() : db.collection(KEYS.TASKS).doc(task.id!);
  
  let taskData: any = sanitizeData({ ...task, id: docRef.id });

  // Handle Images
  if (newFiles.length > 0) {
      const uploadPromises = newFiles.map(file => uploadImage(file, 'task-images'));
      const newImageUrls = await Promise.all(uploadPromises);
      const existingUrls = Array.isArray(task.imageUrls) ? task.imageUrls : [];
      const finalImageUrls = [...existingUrls, ...newImageUrls];
      taskData.imageUrls = finalImageUrls;
  } else if (task.imageUrls !== undefined) {
      taskData.imageUrls = task.imageUrls.length > 0 ? task.imageUrls : firebase.firestore.FieldValue.delete();
  }

  // Handle Videos (Cloudinary)
  if (newVideos.length > 0) {
      const videoPromises = newVideos.map(file => uploadVideoToCloudinary(file));
      const newVideoUrls = await Promise.all(videoPromises);
      const existingVideoUrls = Array.isArray(task.videoUrls) ? task.videoUrls : [];
      const finalVideoUrls = [...existingVideoUrls, ...newVideoUrls];
      taskData.videoUrls = finalVideoUrls;
  } else if (task.videoUrls !== undefined) {
      taskData.videoUrls = task.videoUrls.length > 0 ? task.videoUrls : firebase.firestore.FieldValue.delete();
  }
  
  await docRef.set(taskData, { merge: true });

  if (isNew) {
     // Notify about new task
     await db.collection(KEYS.NOTIFICATIONS).add({
        type: NotificationType.NEW_TASK,
        title: 'Nueva Tarea Creada',
        message: `Tarea "${task.title}" asignada a ${task.departmentName}.`,
        icon: 'ClipboardCheck',
        timestamp: Date.now(),
        readStatus: false,
        payload: { taskId: docRef.id, taskTitle: task.title, departmentName: task.departmentName }
     });
  } else if (task.status === TaskStatus.COMPLETED) {
     const fullTask = (await docRef.get()).data() as Task;
     // Notify about task completion
     await db.collection(KEYS.NOTIFICATIONS).add({
        type: NotificationType.TASK_COMPLETED,
        title: 'Tarea Completada',
        message: `La tarea "${fullTask.title}" ha sido completada por ${fullTask.completedBy || 'un usuario'}.`,
        icon: 'CheckCircle2',
        timestamp: Date.now(),
        readStatus: false,
        payload: { taskId: docRef.id, taskTitle: fullTask.title }
     });

     // Immediate deletion for unique (non-recurring) tasks
     const isUnique = !fullTask.recurrence || fullTask.recurrence === TaskRecurrence.NONE;
     if (isUnique) {
        console.log(`Eliminando tarea única completada inmediatamente: ${fullTask.title}`);
        await docRef.delete();
     }
  }
};

export const deleteTask = async (id: string) => {
  const taskDoc = await db.collection(KEYS.TASKS).doc(id).get();
  const taskTitle = taskDoc.exists ? taskDoc.data()?.title : 'Desconocida';

  await db.collection(KEYS.TASKS).doc(id).delete();
};

// --- SHIFT HELPERS ---
const getCurrentShift = () => {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 16) return 'Mañana';
  if (hour >= 16 && hour < 24) return 'Tarde';
  return 'Noche';
};

export const resetDailyTask = async (taskId: string) => {
  const taskRef = db.collection(KEYS.TASKS).doc(taskId);
  const doc = await taskRef.get();
  if (!doc.exists) return;
  
  const data = doc.data() as Task;
  const isCompleted = data.status === TaskStatus.COMPLETED;
  const shift = getCurrentShift();
  const dept = data.departmentName || 'Sin departamento';

  const resetChecklist = (data.checklist || []).map(item => {
    const { completedBy, completedAt, ...rest } = item;
    return {
      ...rest,
      isCompleted: false
    };
  });

  const updateData: any = {
    status: TaskStatus.PENDING,
    checklist: resetChecklist,
    completedBy: firebase.firestore.FieldValue.delete(),
    completedAt: firebase.firestore.FieldValue.delete(),
    comments: firebase.firestore.FieldValue.arrayUnion({
      id: Date.now().toString(),
      userId: 'system',
      userName: 'Sistema',
      message: isCompleted 
        ? `Tarea diaria reiniciada para el siguiente turno (${shift}).`
        : `ALERTA: El turno de ${shift} NO completó esta tarea (${dept}). Reiniciada para el siguiente turno.`,
      timestamp: Date.now()
    })
  };

  await taskRef.update(updateData);
};

export const checkPendingDailyTasksAndNotify = async () => {
  try {
    // 1. Check if we already sent an alert in the last 55 minutes using a metadata document
    // This avoids complex queries on the notifications collection that require composite indexes
    const systemRef = db.collection(KEYS.SYSTEM).doc('alerts');
    const systemDoc = await systemRef.get();
    const now = Date.now();
    const oneHourAgo = now - (55 * 60 * 1000);
    
    if (systemDoc.exists) {
      const lastAlert = systemDoc.data()?.lastDailyTaskAlert || 0;
      if (lastAlert > oneHourAgo) return;
    }

    // 2. Check for pending daily tasks
    // We query only by recurrence to avoid requiring a composite index for != status
    const q = db.collection(KEYS.TASKS)
      .where('recurrence', '==', TaskRecurrence.DAILY);
    
    const snapshot = await q.get();
    if (snapshot.empty) return;

    // Filter in memory for tasks that are NOT completed
    const pendingTasks = snapshot.docs
      .map(d => d.data() as Task)
      .filter(task => task.status !== TaskStatus.COMPLETED);
    
    if (pendingTasks.length === 0) return;
    const shift = getCurrentShift();

    // 3. Move the report: instead of a global notification, add a comment to each pending task
    const batch = db.batch();
    for (const task of pendingTasks) {
      const taskRef = db.collection(KEYS.TASKS).doc(task.id);
      batch.update(taskRef, {
        comments: firebase.firestore.FieldValue.arrayUnion({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          userId: 'system',
          userName: 'Sistema',
          message: `⚠️ REPORTE PENDIENTE: Esta tarea diaria sigue sin completarse en el turno de ${shift}.`,
          timestamp: now
        }),
        // Reset seenBy so all users see the new "report" in the task card
        seenBy: []
      });
    }
    await batch.commit();

    // 4. Update the last alert timestamp
    await systemRef.set({ lastDailyTaskAlert: now }, { merge: true });
    
  } catch (error) {
    console.error("Error checking pending daily tasks:", error);
  }
};

export const cleanupCompletedTasks = async () => {
  const safetyWindowUnique = Date.now() - (5 * 60 * 1000); // 5 minutes safety for unique
  const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000); // 12 hours for others

  // To avoid composite index requirement, we query only by status and filter by time in memory
  try {
    const q = db.collection(KEYS.TASKS).where('status', '==', TaskStatus.COMPLETED);
    const snapshot = await q.get();
    if (!snapshot.empty) {
      const batch = db.batch();
      let deletedCount = 0;
      snapshot.docs.forEach(d => {
        const data = d.data() as Task;
        // EXCLUDE DAILY TASKS FROM DELETION
        if (data.recurrence !== TaskRecurrence.DAILY) {
          const isUnique = !data.recurrence || data.recurrence === TaskRecurrence.NONE;
          const window = isUnique ? safetyWindowUnique : twelveHoursAgo;
          
          if (data.completedAt && data.completedAt < window) {
            batch.delete(d.ref);
            deletedCount++;
          }
        }
      });
      if (deletedCount > 0) {
        await batch.commit();
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, KEYS.TASKS);
  }
};
export const addCommentToTask = async (taskId: string, comment: Omit<TaskComment, 'id'>) => {
  const taskRef = db.collection(KEYS.TASKS).doc(taskId);
  await taskRef.update({ comments: firebase.firestore.FieldValue.arrayUnion({ ...comment, id: Date.now().toString(), timestamp: Date.now() }), seenBy: [comment.userId] });
};
export const markTaskAsSeen = async (taskId: string, userId: string) => {
  await db.collection(KEYS.TASKS).doc(taskId).update({ seenBy: firebase.firestore.FieldValue.arrayUnion(userId) });
};
export const subscribeToTask = (taskId: string, callback: (task: Task | null) => void, onError?: (error: any) => void) => {
  return db.collection(KEYS.TASKS).doc(taskId).onSnapshot(doc => {
    if (doc.exists) {
      callback({ ...doc.data(), id: doc.id } as Task);
    } else {
      callback(null);
    }
  }, error => {
    if (onError) {
      onError(error);
    } else {
      handleFirestoreError(error, OperationType.GET, `${KEYS.TASKS}/${taskId}`);
    }
  });
};

export const getTaskById = async (taskId: string): Promise<Task | null> => {
  const doc = await db.collection(KEYS.TASKS).doc(taskId).get();
  return doc.exists ? { ...doc.data(), id: doc.id } as Task : null;
};

export const deleteAllNotifications = async () => {
  const q = db.collection(KEYS.NOTIFICATIONS);
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

export const checkAutoCleanup = async () => {
  try {
    const cleanupRef = db.collection(KEYS.SYSTEM).doc('cleanup');
    const cleanupDoc = await cleanupRef.get();
    const now = Date.now();
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;

    if (cleanupDoc.exists) {
      const lastCleanup = cleanupDoc.data()?.lastAutoCleanup || 0;
      if (now - lastCleanup < fifteenDaysInMs) return;
    }

    // Perform cleanup
    await deleteAllNotifications();
    await cleanupCompletedTasks();
    
    // Update the last cleanup timestamp
    await cleanupRef.set({ 
      lastAutoCleanup: now,
      lastCleanupDate: new Date().toLocaleString()
    }, { merge: true });
    
    console.log("Auto-limpieza de actividad completada (Ciclo de 15 días).");
  } catch (error) {
    console.error("Error en auto-limpieza:", error);
  }
};

// --- NEW: DOCUMENT MANAGEMENT ---
export const uploadDocumentFile = async (file: File): Promise<string> => {
  const path = `documents/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const snapshot = await storage.ref().child(path).put(file, { contentType: file.type || 'application/octet-stream' });
  return await snapshot.ref.getDownloadURL();
};
export const subscribeToDocuments = (callback: (data: Document[]) => void) => {
  return db.collection(KEYS.DOCUMENTS).orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Document)));
  }, error => handleFirestoreError(error, OperationType.GET, KEYS.DOCUMENTS));
};
export const saveDocument = async (document: Omit<Document, 'id'>) => {
  const result = await db.collection(KEYS.DOCUMENTS).add(sanitizeData(document));
  return result;
};
export const deleteDocument = async (doc: Document) => {
  try { await storage.refFromURL(doc.url).delete(); } catch(e) {}
  await db.collection(KEYS.DOCUMENTS).doc(doc.id).delete();
};

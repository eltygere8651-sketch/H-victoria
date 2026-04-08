import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem, AppNotification, NotificationType, NotificationPayload, OrderBatch, Task, TaskStatus, TaskPriority, TaskType, TaskComment, Document, TaskRecurrence } from '../types';
import { db, auth, storage } from '../firebaseConfig';
import firebase from 'firebase/compat/app';
import { fileToBase64 } from '../utils/imageCompressor';

const sanitizeData = (data: any) => {
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
  { id: '1', name: 'Administrador', role: UserRole.ADMIN, pin: '1234', permissions: ['CAN_MANAGE_TASKS'] },
  { id: '2', name: 'Camarero Bar', role: UserRole.STAFF, pin: '1234' },
  { id: '3', name: 'Chef Restaurante', role: UserRole.STAFF, pin: '1234' }
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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || 'no-user',
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.filter(p => !!p).map(provider => ({
        providerId: provider!.providerId,
        displayName: provider!.displayName || '',
        email: provider!.email || '',
        photoUrl: provider!.photoURL || ''
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function initFirestoreWithInitialData() {
  console.log("Iniciando sincronización de datos base...");

  try {
    const initRef = db.collection(KEYS.SYSTEM).doc('initialization');
    const initDoc = await initRef.get();

    if (initDoc.exists && initDoc.data()?.isInitialized) {
      console.log("La base de datos ya fue inicializada previamente. Omitiendo sincronización para no perder datos del usuario.");
      return;
    }

    // 1. Usuarios y Productos (Solo si está vacío para no sobrescribir stock real)
    const collectionsToInit = [
      { name: KEYS.USERS, data: INITIAL_USERS },
      { name: KEYS.PRODUCTS, data: INITIAL_PRODUCTS },
    ];

    for (const { name, data } of collectionsToInit) {
      const q = db.collection(name).limit(1);
      const snapshot = await q.get();
      if (snapshot.empty) {
        const batch = db.batch();
        data.forEach(item => {
          const docRef = item.id ? db.collection(name).doc(item.id) : db.collection(name).doc();
          batch.set(docRef, { ...item, id: item.id || docRef.id });
        });
        await batch.commit();
      }
    }

    // 2. Inicializar departamentos si está vacío
    const deptSnapshot = await db.collection(KEYS.DEPARTMENTS).limit(1).get();
    if (deptSnapshot.empty) {
      const deptBatch = db.batch();
      INITIAL_DEPARTMENTS.forEach(dept => {
        const docRef = db.collection(KEYS.DEPARTMENTS).doc(dept.id);
        deptBatch.set(docRef, dept, { merge: true });
      });
      await deptBatch.commit();
    }

    // Marcar como inicializado para no volver a ejecutar esto y borrar datos del usuario
    await initRef.set({ isInitialized: true, timestamp: Date.now() });
    console.log("Sincronización inicial completada y marcada como inicializada.");
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, KEYS.SYSTEM);
  }
}

// --- AUTH HELPERS ---

export const login = async (name: string, pin: string): Promise<User | null> => {
  const q = db.collection(KEYS.USERS).where("pin", "==", pin);
  const querySnapshot = await q.get();
  
  if (!querySnapshot.empty) {
    const match = querySnapshot.docs.find(doc => {
      const userData = doc.data();
      return userData.name.toLowerCase() === name.toLowerCase();
    });

    if (match) {
      const user = { ...match.data(), id: match.id } as User;
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
  if (auth.currentUser) return;
  return new Promise<void>((resolve) => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      try {
        if (user) {
          await initFirestoreWithInitialData();
          unsubscribe();
          resolve();
        } else {
          try {
            await retry(() => auth.signInAnonymously());
            // Do not resolve or unsubscribe here, let the onAuthStateChanged listener handle the new user
          } catch (error: any) {
             console.error("Auth error", error);
             if (error.code === 'auth/operation-not-allowed') {
               alert("Error crítico: La autenticación anónima no está habilitada en Firebase. Por favor, habilítala en la consola de Firebase (Authentication > Sign-in method > Anonymous).");
             }
             unsubscribe();
             resolve();
          }
        }
      } catch (error) {
        console.error("Error in onAuthStateChanged:", error);
        unsubscribe();
        resolve();
      }
    });
  });
};

export const saveSession = (user: User) => localStorage.setItem(KEYS.CURRENT_SESSION, JSON.stringify(user));
export const getSession = (): User | null => JSON.parse(localStorage.getItem(KEYS.CURRENT_SESSION) || 'null');
export const clearSession = () => localStorage.removeItem(KEYS.CURRENT_SESSION);
export const saveLastView = (view: string) => localStorage.setItem(KEYS.LAST_VIEW, view);
export const getLastView = (): string | null => localStorage.getItem(KEYS.LAST_VIEW);

// --- CART ---
export const saveDraftCart = async (userId: string, cart: CartItem[]) => {
  localStorage.setItem(KEYS.DRAFT_CART, JSON.stringify(cart));
  if (userId && userId !== 'guest' && !userId.startsWith('guest-')) {
    try {
      await db.collection(KEYS.USERS).doc(userId).set({ draftCart: cart }, { merge: true });
    } catch (e) {
      console.error("Error saving draft cart to cloud", e);
    }
  }
};

export const getDraftCart = async (userId?: string): Promise<CartItem[]> => {
  if (userId && userId !== 'guest' && !userId.startsWith('guest-')) {
    try {
      const doc = await db.collection(KEYS.USERS).doc(userId).get();
      if (doc.exists && doc.data()?.draftCart) {
        return doc.data()?.draftCart as CartItem[];
      }
    } catch (e) {
      console.error("Error getting draft cart from cloud", e);
    }
  }
  return JSON.parse(localStorage.getItem(KEYS.DRAFT_CART) || '[]');
};

// --- DEPARTMENTS ---
export const subscribeToDepartments = (callback: (data: Department[]) => void) => {
    return db.collection(KEYS.DEPARTMENTS).orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department)));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.DEPARTMENTS));
};
export const saveDepartment = async (department: Partial<Department>) => {
  const docRef = department.id ? db.collection(KEYS.DEPARTMENTS).doc(department.id) : db.collection(KEYS.DEPARTMENTS).doc();
  await docRef.set({ ...department, id: docRef.id }, { merge: true });
};
export const deleteDepartment = async (id: string) => await db.collection(KEYS.DEPARTMENTS).doc(id).delete();

// --- PRODUCTS ---
export const subscribeToProducts = (callback: (data: Product[]) => void) => {
    return db.collection(KEYS.PRODUCTS).orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.PRODUCTS));
};
export const saveProduct = async (product: Partial<Product>) => {
  const docRef = product.id ? db.collection(KEYS.PRODUCTS).doc(product.id) : db.collection(KEYS.PRODUCTS).doc();
  await docRef.set({ ...product, id: docRef.id }, { merge: true });
};
export const deleteProduct = async (id: string) => await db.collection(KEYS.PRODUCTS).doc(id).delete();

// Removed cleanAndBoostStock to prevent accidental data loss

export const generateRandomOrders = async (user: User) => {
  const snapshot = await db.collection(KEYS.PRODUCTS).get();
  const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)).filter(p => p.quantity > 0);
  
  const deptSnapshot = await db.collection(KEYS.DEPARTMENTS).get();
  const departments = deptSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department));
  
  if (products.length === 0 || departments.length === 0) return;

  const randomDept = departments[Math.floor(Math.random() * departments.length)];
  
  const availableProducts = products.filter(p => {
    const pDeptIds = p.departmentIds || (p.departmentId ? [p.departmentId] : []);
    return pDeptIds.includes(randomDept.id);
  });

  if (availableProducts.length === 0) return;

  const shuffled = availableProducts.sort(() => 0.5 - Math.random());
  const numItems = Math.floor(Math.random() * 4) + 2; // 2 to 5 items
  const selected = shuffled.slice(0, numItems);

  const cart: CartItem[] = selected.map(p => {
    const qty = Math.floor(Math.random() * 15) + 5;
    return { product: p, quantity: Math.min(qty, p.quantity) };
  }).filter(item => item.quantity > 0);

  if (cart.length > 0) {
    await submitOrderBatch(cart, randomDept.id, randomDept.name, user);
  }
};

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
        title: 'Alerta de Stock Bajo',
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

export const receiveStockBatch = async (items: { productId: string; productName: string; quantityToAdd: number; unit: string }[], userName: string) => {
  const batch = db.batch();
  const batchId = 'ING-' + Date.now().toString().slice(-6);
  
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
      departmentName: 'Ingreso de Proveedor', 
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
    title: 'Ingreso de Mercancía',
    message: `Se ha registrado el ingreso de ${items.length} producto(s) por ${userName}.`,
    icon: 'PackagePlus',
    timestamp: Date.now(),
    readStatus: false,
    payload: { itemCount: items.length, orderBatchId: batchId }
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

// --- USERS ---
export const subscribeToUsers = (callback: (users: User[]) => void) => {
    return db.collection(KEYS.USERS).orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    }, error => handleFirestoreError(error, OperationType.GET, KEYS.USERS));
};
export const addUser = async (user: Omit<User, 'id'>) => await db.collection(KEYS.USERS).add(user);
export const updateUser = async (user: User) => await db.collection(KEYS.USERS).doc(user.id).update({ ...user });
export const deleteUser = async (id: string) => await db.collection(KEYS.USERS).doc(id).delete();
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
export const saveTask = async (task: Partial<Task>, newFiles: File[] = []) => {
  const isNew = !task.id;
  const docRef = isNew ? db.collection(KEYS.TASKS).doc() : db.collection(KEYS.TASKS).doc(task.id!);
  
  let taskData: any = sanitizeData({ ...task, id: docRef.id });

  if (newFiles.length > 0) {
      const base64Promises = newFiles.map(file => fileToBase64(file));
      const newImageUrls = await Promise.all(base64Promises);
      const finalImageUrls = [...(task.imageUrls || []), ...newImageUrls];
      taskData.imageUrls = finalImageUrls;
  } else if (task.imageUrls !== undefined) {
      taskData.imageUrls = task.imageUrls.length > 0 ? task.imageUrls : firebase.firestore.FieldValue.delete();
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
  }
};
export const deleteTask = async (id: string) => await db.collection(KEYS.TASKS).doc(id).delete();

export const resetDailyTask = async (taskId: string) => {
  const taskRef = db.collection(KEYS.TASKS).doc(taskId);
  const doc = await taskRef.get();
  if (!doc.exists) return;
  
  const data = doc.data() as Task;
  const resetChecklist = (data.checklist || []).map(item => ({
    ...item,
    isCompleted: false,
    completedBy: undefined,
    completedAt: undefined
  }));

  await taskRef.update({
    status: TaskStatus.PENDING,
    checklist: resetChecklist,
    completedBy: firebase.firestore.FieldValue.delete(),
    completedAt: firebase.firestore.FieldValue.delete(),
    comments: firebase.firestore.FieldValue.arrayUnion({
      id: Date.now().toString(),
      userId: 'system',
      userName: 'Sistema',
      message: 'Tarea diaria reiniciada automáticamente para el siguiente turno.',
      timestamp: Date.now()
    })
  });
};

export const cleanupCompletedTasks = async () => {
  const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
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
        if (data.recurrence !== TaskRecurrence.DAILY && data.completedAt && data.completedAt < twelveHoursAgo) {
          batch.delete(d.ref);
          deletedCount++;
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
export const saveDocument = async (document: Omit<Document, 'id'>) => await db.collection(KEYS.DOCUMENTS).add(document);
export const deleteDocument = async (doc: Document) => {
  try { await storage.refFromURL(doc.url).delete(); } catch(e) {}
  await db.collection(KEYS.DOCUMENTS).doc(doc.id).delete();
};

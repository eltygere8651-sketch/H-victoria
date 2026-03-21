import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem, AppNotification, NotificationType, NotificationPayload, OrderBatch, Task, TaskStatus, TaskPriority, TaskType, TaskComment, Document } from '../types';
import { db, auth, storage } from '../firebaseConfig';
import firebase from 'firebase/compat/app';
import { fileToBase64 } from '../utils/imageCompressor';

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

async function initFirestoreWithInitialData() {
  console.log("Iniciando sincronización de datos base...");

  // 1. Usuarios y Productos (Solo si está vacío para no sobrescribir stock real)
  const collectionsToInit = [
    { name: 'users', data: INITIAL_USERS, key: KEYS.USERS },
    { name: 'products', data: INITIAL_PRODUCTS, key: KEYS.PRODUCTS },
  ];

  for (const { name, data, key } of collectionsToInit) {
    const q = db.collection(name).limit(1);
    const snapshot = await q.get();
    if (snapshot.empty) {
      const batch = db.batch();
      data.forEach(item => {
        const docRef = item.id ? db.collection(name).doc(item.id) : db.collection(name).doc();
        batch.set(docRef, { ...item, id: item.id || docRef.id });
      });
      await batch.commit();
      localStorage.setItem(key, JSON.stringify(data));
    }
  }

  // 2. SINCRONIZACIÓN ESTRICTA DE DEPARTAMENTOS
  // Esto garantiza que SIEMPRE tengas solo 'Bar' y 'Restaurante', eliminando cualquier basura vieja.
  const deptSnapshot = await db.collection('departments').get();
  const deptBatch = db.batch();
  const validDeptIds = INITIAL_DEPARTMENTS.map(d => d.id);

  // A. Eliminar departamentos que NO sean Bar o Restaurante
  deptSnapshot.docs.forEach(doc => {
    if (!validDeptIds.includes(doc.id)) {
      console.log(`Eliminando departamento obsoleto: ${doc.id}`);
      deptBatch.delete(doc.ref);
    }
  });

  // B. Asegurar que Bar y Restaurante existan con los datos correctos
  INITIAL_DEPARTMENTS.forEach(dept => {
    const docRef = db.collection('departments').doc(dept.id);
    deptBatch.set(docRef, dept, { merge: true });
  });

  await deptBatch.commit();
  console.log("Sincronización de departamentos completada: Solo Bar / Cafetería y Restaurante activos.");
  localStorage.setItem(KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DEPARTMENTS));
}

// --- AUTH HELPERS ---

export const login = async (name: string, pin: string): Promise<User | null> => {
  const q = db.collection("users").where("pin", "==", pin);
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
      if (user) {
        await initFirestoreWithInitialData();
        unsubscribe();
        resolve();
      } else {
        try {
          await retry(() => auth.signInAnonymously());
          await initFirestoreWithInitialData();
          unsubscribe();
          resolve();
        } catch (error) {
           console.error("Auth error", error);
           unsubscribe();
           resolve();
        }
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
export const saveDraftCart = (cart: CartItem[]) => localStorage.setItem(KEYS.DRAFT_CART, JSON.stringify(cart));
export const getDraftCart = (): CartItem[] => JSON.parse(localStorage.getItem(KEYS.DRAFT_CART) || '[]');

// --- DEPARTMENTS ---
export const subscribeToDepartments = (callback: (data: Department[]) => void) => {
    return db.collection('departments').orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department)));
    });
};
export const saveDepartment = async (department: Partial<Department>) => {
  const docRef = department.id ? db.collection('departments').doc(department.id) : db.collection('departments').doc();
  await docRef.set({ ...department, id: docRef.id }, { merge: true });
};
export const deleteDepartment = async (id: string) => await db.collection('departments').doc(id).delete();

// --- PRODUCTS ---
export const subscribeToProducts = (callback: (data: Product[]) => void) => {
    return db.collection('products').orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
    });
};
export const saveProduct = async (product: Partial<Product>) => {
  const docRef = product.id ? db.collection('products').doc(product.id) : db.collection('products').doc();
  await docRef.set({ ...product, id: docRef.id }, { merge: true });
};
export const deleteProduct = async (id: string) => await db.collection('products').doc(id).delete();

export const cleanAndBoostStock = async () => {
  const snapshot = await db.collection('products').get();
  const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
  
  const seenNames = new Set<string>();
  const batch = db.batch();
  
  for (const p of products) {
    const normalizedName = p.name.trim().toLowerCase();
    if (seenNames.has(normalizedName)) {
      batch.delete(db.collection('products').doc(p.id));
    } else {
      seenNames.add(normalizedName);
      batch.update(db.collection('products').doc(p.id), { quantity: 500 });
    }
  }
  
  await batch.commit();
};

export const generateRandomOrders = async (user: User) => {
  const snapshot = await db.collection('products').get();
  const products = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)).filter(p => p.quantity > 0);
  
  const deptSnapshot = await db.collection('departments').get();
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
    const productRef = db.collection('products').doc(item.product.id);
    const newQuantity = item.product.quantity - item.quantity;
    batch.update(productRef, { quantity: newQuantity });
    
    const requestRef = db.collection('requests').doc();
    batch.set(requestRef, {
      batchId, productId: item.product.id, productName: item.product.name,
      departmentId, departmentName, requestedBy: user.name,
      quantity: item.quantity, status: 'COMPLETED',
      date: new Date().toLocaleString(), timestamp: Date.now(), unit: item.product.unit
    });

    if (newQuantity <= item.product.minThreshold) {
      lowStockItems.push(item.product.name);
      // Create notification for low stock
      const notifRef = db.collection('notifications').doc();
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
  const orderNotifRef = db.collection('notifications').doc();
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
    const productRef = db.collection('products').doc(item.productId);
    batch.update(productRef, { 
      quantity: firebase.firestore.FieldValue.increment(item.quantityToAdd) 
    });

    // Create a request document to represent this item in the Albarán
    const requestRef = db.collection('requests').doc();
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
  const notifRef = db.collection('notifications').doc();
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
  return db.collection('requests').orderBy('timestamp', 'desc').limit(200).onSnapshot(snapshot => {
    const requests = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ReplenishmentRequest));
    const batches = requests.reduce((acc, req) => {
      if (!req.batchId) return acc;
      acc[req.batchId] = acc[req.batchId] || { batchId: req.batchId, date: req.date, departmentId: req.departmentId, departmentName: req.departmentName, requestedBy: req.requestedBy, items: [] };
      acc[req.batchId].items.push(req);
      return acc;
    }, {} as Record<string, OrderBatch>);
    callback(Object.values(batches));
  });
};
export const deleteBatch = async (batchId: string) => {
  const q = db.collection('requests').where('batchId', '==', batchId);
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

// --- USERS ---
export const subscribeToUsers = (callback: (users: User[]) => void) => {
    return db.collection('users').orderBy('name').onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User)));
    });
};
export const addUser = async (user: Omit<User, 'id'>) => await db.collection('users').add(user);
export const updateUser = async (user: User) => await db.collection('users').doc(user.id).update({ ...user });
export const deleteUser = async (id: string) => await db.collection('users').doc(id).delete();
export const savePushToken = async (userId: string, token: string) => await db.collection('users').doc(userId).update({ pushToken: token });

// --- NOTIFICATIONS ---
export const subscribeToNotifications = (callback: (data: AppNotification[]) => void, unreadOnly = false) => {
  let q: firebase.firestore.Query = db.collection('notifications').orderBy('timestamp', 'desc');
  if (unreadOnly) q = q.where('readStatus', '==', false);
  return q.onSnapshot(snapshot => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification)));
  });
};
export const markNotificationAsRead = async (id: string, userId: string, userName: string) => await db.collection('notifications').doc(id).update({ readStatus: true, reviewedBy: userName, reviewedAt: Date.now() });
export const markAllNotificationsAsRead = async (userId: string, userName: string) => {
  const q = db.collection('notifications').where('readStatus', '==', false);
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.update(d.ref, { readStatus: true, reviewedBy: userName, reviewedAt: Date.now() }));
  await batch.commit();
};

// --- TASKS ---
export const subscribeToTasks = (callback: (data: Task[]) => void) => {
    return db.collection('tasks').orderBy('createdAt', 'desc').limit(50).onSnapshot(snapshot => {
        callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task)));
    });
};
export const saveTask = async (task: Partial<Task>, newFiles: File[] = []) => {
  const isNew = !task.id;
  const docRef = isNew ? db.collection('tasks').doc() : db.collection('tasks').doc(task.id!);
  let newImageUrls: string[] = [];
  if (newFiles.length > 0) {
      const base64Promises = newFiles.map(file => fileToBase64(file));
      newImageUrls = await Promise.all(base64Promises);
  }
  const finalImageUrls = [...(task.imageUrls || []), ...newImageUrls];
  
  const taskData = { ...task, id: docRef.id, imageUrls: finalImageUrls.length > 0 ? finalImageUrls : firebase.firestore.FieldValue.delete() };
  await docRef.set(taskData, { merge: true });

  if (isNew) {
     // Notify about new task
     await db.collection('notifications').add({
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
export const deleteTask = async (id: string) => await db.collection('tasks').doc(id).delete();
export const cleanupCompletedTasks = async () => {
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  const q = db.collection('tasks').where('status', '==', TaskStatus.COMPLETED).where('completedAt', '<', thirtyMinutesAgo);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    const batch = db.batch();
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
};
export const addCommentToTask = async (taskId: string, comment: Omit<TaskComment, 'id'>) => {
  const taskRef = db.collection('tasks').doc(taskId);
  await taskRef.update({ comments: firebase.firestore.FieldValue.arrayUnion({ ...comment, id: Date.now().toString(), timestamp: Date.now() }), seenBy: [comment.userId] });
};
export const markTaskAsSeen = async (taskId: string, userId: string) => {
  await db.collection('tasks').doc(taskId).update({ seenBy: firebase.firestore.FieldValue.arrayUnion(userId) });
};
export const getTaskById = async (taskId: string): Promise<Task | null> => {
  const doc = await db.collection('tasks').doc(taskId).get();
  return doc.exists ? { ...doc.data(), id: doc.id } as Task : null;
};
export const deleteAllBatches = async () => {
  const q = db.collection('requests');
  const snapshot = await q.get();
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};
export const deleteAllNotifications = async () => {
  const q = db.collection('notifications');
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
  return db.collection('documents').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Document)));
  });
};
export const saveDocument = async (document: Omit<Document, 'id'>) => await db.collection('documents').add(document);
export const deleteDocument = async (doc: Document) => {
  try { await storage.refFromURL(doc.url).delete(); } catch(e) {}
  await db.collection('documents').doc(doc.id).delete();
};
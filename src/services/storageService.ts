import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem, AppNotification, NotificationType, NotificationPayload, OrderBatch, Task, TaskStatus, TaskPriority, TaskType, TaskComment, Document, Reservation, Table, Room } from '../types';
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
  RESERVATIONS: 'hotel_victoria_reservations',
  TABLES: 'hotel_victoria_tables',
  ROOMS: 'hotel_victoria_rooms',
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

const INITIAL_ROOMS: Room[] = [
  { id: 'r-victoria', name: 'Salón Victoria', createdAt: Date.now() },
  { id: 'r-gastrobar', name: 'Gastro Bar', createdAt: Date.now() },
];

// Mesas iniciales basadas en la foto del salón (Hotel Victoria)
const INITIAL_TABLES: Table[] = [
  { id: 't1', roomId: 'r-victoria', number: '1', capacity: 4, status: 'AVAILABLE', x: 12, y: 72, width: 28, height: 22, shape: 'RECTANGLE' }, // Primer plano izq
  { id: 't2', roomId: 'r-victoria', number: '2', capacity: 6, status: 'AVAILABLE', x: 58, y: 68, width: 32, height: 26, shape: 'RECTANGLE' }, // Primer plano der
  { id: 't3', roomId: 'r-victoria', number: '3', capacity: 4, status: 'AVAILABLE', x: 18, y: 45, width: 22, height: 18, shape: 'RECTANGLE' }, // Fila media izq
  { id: 't4', roomId: 'r-victoria', number: '4', capacity: 4, status: 'AVAILABLE', x: 52, y: 45, width: 22, height: 18, shape: 'RECTANGLE' }, // Fila media der
  { id: 't5', roomId: 'r-victoria', number: '5', capacity: 2, status: 'AVAILABLE', x: 12, y: 15, width: 12, height: 12, shape: 'SQUARE' },    // Barra 1 (fondo izq)
  { id: 't6', roomId: 'r-victoria', number: '6', capacity: 2, status: 'AVAILABLE', x: 30, y: 15, width: 12, height: 12, shape: 'SQUARE' },    // Barra 2 (fondo izq)
  { id: 't7', roomId: 'r-victoria', number: '7', capacity: 4, status: 'AVAILABLE', x: 55, y: 15, width: 18, height: 15, shape: 'RECTANGLE' }, // Ventana 1 (fondo der)
  { id: 't8', roomId: 'r-victoria', number: '8', capacity: 4, status: 'AVAILABLE', x: 78, y: 15, width: 16, height: 15, shape: 'RECTANGLE' }, // Ventana 2 (fondo der)
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

  try {
    const initRef = db.collection('system').doc('initialization');
    const initDoc = await initRef.get();

    if (initDoc.exists && initDoc.data()?.isInitialized) {
      console.log("La base de datos ya fue inicializada previamente. Omitiendo sincronización para no perder datos del usuario.");
      return;
    }

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
      }
    }

    // 2. Inicializar departamentos si está vacío
    const deptSnapshot = await db.collection('departments').limit(1).get();
    if (deptSnapshot.empty) {
      const deptBatch = db.batch();
      INITIAL_DEPARTMENTS.forEach(dept => {
        const docRef = db.collection('departments').doc(dept.id);
        deptBatch.set(docRef, dept, { merge: true });
      });
      await deptBatch.commit();
    }

    // 3. Inicializar mesas si está vacío
    const tableSnapshot = await db.collection('tables').limit(1).get();
    if (tableSnapshot.empty) {
      const tableBatch = db.batch();
      INITIAL_TABLES.forEach(table => {
        const docRef = db.collection('tables').doc(table.id);
        tableBatch.set(docRef, table, { merge: true });
      });
      await tableBatch.commit();
    }

    // 4. Inicializar salones si está vacío
    const roomSnapshot = await db.collection('rooms').limit(1).get();
    if (roomSnapshot.empty) {
      const roomBatch = db.batch();
      INITIAL_ROOMS.forEach(room => {
        const docRef = db.collection('rooms').doc(room.id);
        roomBatch.set(docRef, room, { merge: true });
      });
      await roomBatch.commit();
    }

    // Marcar como inicializado para no volver a ejecutar esto y borrar datos del usuario
    await initRef.set({ isInitialized: true, timestamp: Date.now() });
    console.log("Sincronización inicial completada y marcada como inicializada.");
  } catch (error) {
    console.error("Error during initFirestoreWithInitialData:", error);
  }
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
      await db.collection('users').doc(userId).update({ draftCart: cart });
    } catch (e) {
      console.error("Error saving draft cart to cloud", e);
    }
  }
};

export const getDraftCart = async (userId?: string): Promise<CartItem[]> => {
  if (userId && userId !== 'guest' && !userId.startsWith('guest-')) {
    try {
      const doc = await db.collection('users').doc(userId).get();
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

// Removed cleanAndBoostStock to prevent accidental data loss

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
  
  let taskData: any = { ...task, id: docRef.id };

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

// --- NEW: SALONES / RESERVATIONS ---
export const subscribeToRooms = (callback: (data: Room[]) => void) => {
  return db.collection('rooms').orderBy('createdAt', 'asc').onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Room)));
  });
};

export const saveRoom = async (room: Partial<Room>) => {
  const docRef = room.id ? db.collection('rooms').doc(room.id) : db.collection('rooms').doc();
  await docRef.set({ ...room, id: docRef.id, createdAt: room.createdAt || Date.now() }, { merge: true });
};

export const deleteRoom = async (id: string) => {
  // Delete all tables and reservations for this room
  const tables = await db.collection('tables').where('roomId', '==', id).get();
  const reservations = await db.collection('reservations').where('roomId', '==', id).get();
  
  const batch = db.batch();
  tables.docs.forEach(d => batch.delete(d.ref));
  reservations.docs.forEach(d => batch.delete(d.ref));
  batch.delete(db.collection('rooms').doc(id));
  
  await batch.commit();
};

export const uploadFloorPlan = async (file: File): Promise<string> => {
  const path = `floorplans/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const snapshot = await storage.ref().child(path).put(file, { contentType: file.type || 'application/octet-stream' });
  return await snapshot.ref.getDownloadURL();
};

export const subscribeToTables = (callback: (data: Table[]) => void, roomId?: string) => {
  let q: firebase.firestore.Query = db.collection('tables').orderBy('number');
  if (roomId) q = q.where('roomId', '==', roomId);
  return q.onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Table)));
  });
};

export const saveTable = async (table: Partial<Table>) => {
  const docRef = table.id ? db.collection('tables').doc(table.id) : db.collection('tables').doc();
  await docRef.set({ ...table, id: docRef.id }, { merge: true });
};

export const deleteTable = async (id: string) => await db.collection('tables').doc(id).delete();

export const subscribeToReservations = (callback: (data: Reservation[]) => void, roomId?: string) => {
  let q: firebase.firestore.Query = db.collection('reservations').orderBy('startTime', 'asc');
  if (roomId) q = q.where('roomId', '==', roomId);
  return q.onSnapshot(snapshot => {
    callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Reservation)));
  });
};

export const saveReservation = async (reservation: Partial<Reservation>) => {
  const docRef = reservation.id ? db.collection('reservations').doc(reservation.id) : db.collection('reservations').doc();
  
  const resData = { 
    ...reservation, 
    id: docRef.id,
    createdAt: reservation.createdAt || Date.now()
  };

  await docRef.set(resData, { merge: true });

  // Update table status if tableId is provided
  if (reservation.tableId) {
    const tableStatus = reservation.status === 'ACTIVE' ? 'OCCUPIED' : 
                        reservation.status === 'PENDING' ? 'RESERVED' : 'AVAILABLE';
    await db.collection('tables').doc(reservation.tableId).update({ status: tableStatus });
  }
};

export const deleteReservation = async (id: string, tableId?: string) => {
  await db.collection('reservations').doc(id).delete();
  if (tableId) {
    await db.collection('tables').doc(tableId).update({ status: 'AVAILABLE' });
  }
};

export const resetTables = async () => {
  const snapshot = await db.collection('tables').get();
  const batch = db.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  INITIAL_TABLES.forEach(table => {
    const docRef = db.collection('tables').doc(table.id);
    batch.set(docRef, table);
  });
  await batch.commit();
};

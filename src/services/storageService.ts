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
  { id: '3', name: 'Chef Cocina', role: UserRole.STAFF, pin: '1234' }
];
const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'd-bar', name: 'Bar' },
  { id: 'd-cocina', name: 'Cocina' },
  { id: 'd-limpieza', name: 'Limpieza' }
];
const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: 'Coca Cola', category: 'Bebidas', quantity: 24, unit: 'latas', minThreshold: 12, departmentId: 'd-bar', departmentName: 'Bar' },
  { id: 'p2', name: 'Agua Mineral', category: 'Bebidas', quantity: 48, unit: 'botellas', minThreshold: 24, departmentId: 'd-bar', departmentName: 'Bar' },
  { id: 'p3', name: 'Harina de Trigo', category: 'Secos', quantity: 15, unit: 'kg', minThreshold: 5, departmentId: 'd-cocina', departmentName: 'Cocina' },
  { id: 'p4', name: 'Lejía', category: 'Limpieza', quantity: 10, unit: 'litros', minThreshold: 4, departmentId: 'd-limpieza', departmentName: 'Limpieza' },
];

async function initFirestoreWithInitialData() {
  const collectionsToInit = [
    { name: 'users', data: INITIAL_USERS, key: KEYS.USERS },
    { name: 'departments', data: INITIAL_DEPARTMENTS, key: KEYS.DEPARTMENTS },
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
}

export const login = async (name: string, pin: string): Promise<User | null> => {
  // Buscamos por PIN y luego filtramos por nombre insensible a capitalización
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
          await auth.signInAnonymously();
          await initFirestoreWithInitialData();
          unsubscribe();
          resolve();
        } catch (error) {
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

// --- ORDERS ---
export const submitOrderBatch = async (cart: CartItem[], departmentId: string, departmentName: string, user: User) => {
  const batch = db.batch();
  const batchId = Date.now().toString().slice(-6);
  // FIX: Added tracking for low stock items to return to the UI
  const lowStockItems: string[] = [];

  for (const item of cart) {
    const productRef = db.collection('products').doc(item.product.id);
    // FIX: Calculate new quantity to check against threshold
    const newQuantity = item.product.quantity - item.quantity;
    batch.update(productRef, { quantity: newQuantity });
    
    const requestRef = db.collection('requests').doc();
    batch.set(requestRef, {
      batchId, productId: item.product.id, productName: item.product.name,
      departmentId, departmentName, requestedBy: user.name,
      quantity: item.quantity, status: 'COMPLETED',
      date: new Date().toLocaleString(), timestamp: Date.now(), unit: item.product.unit
    });

    // FIX: Detect if item reached low stock threshold
    if (newQuantity <= item.product.minThreshold) {
      lowStockItems.push(item.product.name);
    }
  }
  await batch.commit();
  // FIX: Return lowStockItems array as expected by the UI in Replenishment.tsx
  return { success: true, lowStockItems };
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
  await docRef.set({ ...task, id: docRef.id, imageUrls: finalImageUrls.length > 0 ? finalImageUrls : firebase.firestore.FieldValue.delete() }, { merge: true });
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
import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem, AppNotification, NotificationType, NotificationPayload, OrderBatch, Task, TaskStatus, TaskPriority, TaskType, TaskComment } from '../types';
// FIX: Remove modular imports and use compat 'db' instance directly
import { db } from '../firebaseConfig';
import firebase from 'firebase/compat/app';

// LOCAL STORAGE FALLBACK KEYS
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

// INITIAL DATA
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
    // FIX: Use compat query syntax
    const q = db.collection(name).limit(1);
    const snapshot = await q.get();
    if (snapshot.empty) {
      console.log(`Initializing ${name} collection...`);
      // FIX: Use compat batch syntax
      const batch = db.batch();
      data.forEach(item => {
        // FIX: Use compat doc reference syntax
        const docRef = item.id ? db.collection(name).doc(item.id) : db.collection(name).doc();
        batch.set(docRef, { ...item, id: item.id || docRef.id });
      });
      await batch.commit();
      localStorage.setItem(key, JSON.stringify(data));
    }
  }
}
initFirestoreWithInitialData();

// --- NOTIFICATION HELPERS ---
const createNotification = async (type: NotificationType, payload: NotificationPayload) => {
  let title = '', message = '', icon = 'Bell';
  switch (type) {
    case NotificationType.LOW_STOCK:
      title = 'Alerta de Stock Bajo';
      message = `El producto "${payload.productName}" ha alcanzado el umbral mínimo.`;
      icon = 'AlertTriangle';
      break;
    case NotificationType.NEW_ORDER:
      title = 'Nuevo Pedido Recibido';
      message = `Nuevo pedido del departamento "${payload.departmentName}".`;
      icon = 'Package';
      break;
    case NotificationType.NEW_TASK:
      title = 'Nueva Tarea Creada';
      message = `Tarea "${payload.taskTitle}" para el dpto. ${payload.departmentName}.`;
      icon = 'ClipboardCheck';
      break;
    case NotificationType.NEW_ANNOUNCEMENT:
      title = 'Nuevo Anuncio Publicado';
      message = `Anuncio "${payload.taskTitle}" para ${payload.departmentName}.`;
      icon = 'Megaphone';
      break;
  }
  const newNotification: Omit<AppNotification, 'id'> = {
    type, title, message, icon,
    timestamp: Date.now(),
    readStatus: false,
    payload,
  };
  // FIX: Use compat addDoc syntax
  await db.collection('notifications').add(newNotification);
};

// --- AUTH & SESSION ---
export const login = async (name: string, pin: string): Promise<User | null> => {
  // FIX: Use compat query syntax
  // FIX: Corrected arguments in where clause. The comma was inside the string literal.
  const q = db.collection("users").where("name", "==", name).where("pin", "==", pin);
  const querySnapshot = await q.get();
  if (!querySnapshot.empty) {
    const user = { ...querySnapshot.docs[0].data(), id: querySnapshot.docs[0].id } as User;
    saveSession(user);
    return user;
  }
  return null;
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
// FIX: Use compat query syntax for onSnapshot
export const subscribeToDepartments = (callback: (data: Department[]) => void) => db.collection('departments').orderBy('name').onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department))));
export const saveDepartment = async (department: Partial<Department>) => {
  // FIX: Use compat doc reference and set syntax
  const docRef = department.id ? db.collection('departments').doc(department.id) : db.collection('departments').doc();
  await docRef.set({ ...department, id: docRef.id }, { merge: true });
};
// FIX: Use compat delete syntax
export const deleteDepartment = async (id: string) => await db.collection('departments').doc(id).delete();

// --- PRODUCTS ---
// FIX: Use compat query syntax for onSnapshot
export const subscribeToProducts = (callback: (data: Product[]) => void) => db.collection('products').orderBy('name').onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product))));
export const saveProduct = async (product: Partial<Product>) => {
  // FIX: Use compat doc reference and set syntax
  const docRef = product.id ? db.collection('products').doc(product.id) : db.collection('products').doc();
  await docRef.set({ ...product, id: docRef.id }, { merge: true });
};
// FIX: Use compat delete syntax
export const deleteProduct = async (id: string) => await db.collection('products').doc(id).delete();

// --- ORDERS / REPLENISHMENT ---
export const submitOrderBatch = async (cart: CartItem[], departmentId: string, departmentName: string, user: User) => {
  // FIX: Use compat batch syntax
  const batch = db.batch();
  const lowStockItems: string[] = [];
  const batchId = Date.now().toString().slice(-6);

  for (const item of cart) {
    // FIX: Use compat doc reference syntax
    const productRef = db.collection('products').doc(item.product.id);
    const newQuantity = item.product.quantity - item.quantity;
    batch.update(productRef, { quantity: newQuantity });

    const request: Omit<ReplenishmentRequest, 'id'> = {
      batchId, productId: item.product.id, productName: item.product.name,
      departmentId, departmentName, requestedBy: user.name,
      quantity: item.quantity, status: 'COMPLETED',
      date: new Date().toLocaleString(), timestamp: Date.now(), unit: item.product.unit
    };
    // FIX: Use compat doc reference syntax
    const requestRef = db.collection('requests').doc();
    batch.set(requestRef, request);
    
    if (newQuantity <= item.product.minThreshold) {
      lowStockItems.push(item.product.name);
      await createNotification(NotificationType.LOW_STOCK, { productName: item.product.name });
    }
  }

  await batch.commit();
  await createNotification(NotificationType.NEW_ORDER, { departmentName, orderBatchId: batchId });
  return { success: true, lowStockItems };
};

export const subscribeToBatches = (callback: (batches: OrderBatch[]) => void) => {
  // FIX: Use compat query syntax for onSnapshot
  const q = db.collection('requests').orderBy('timestamp', 'desc');
  return q.onSnapshot(snapshot => {
    const requests = snapshot.docs.map(d => ({ ...d.data(), id: d.id } as ReplenishmentRequest));
    const batches = requests.reduce((acc, req) => {
      if (!req.batchId) return acc;
      acc[req.batchId] = acc[req.batchId] || {
        batchId: req.batchId, date: req.date, departmentId: req.departmentId,
        departmentName: req.departmentName, requestedBy: req.requestedBy, items: []
      };
      acc[req.batchId].items.push(req);
      return acc;
    }, {} as Record<string, OrderBatch>);
    callback(Object.values(batches));
  });
};
export const deleteBatch = async (batchId: string) => {
  // FIX: Use compat query syntax
  const q = db.collection('requests').where('batchId', '==', batchId);
  const snapshot = await q.get();
  // FIX: Use compat batch syntax
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

// --- USERS ---
// FIX: Use compat query syntax for onSnapshot
export const subscribeToUsers = (callback: (users: User[]) => void) => db.collection('users').orderBy('name').onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User))));
// FIX: Use compat add syntax
export const addUser = async (user: Omit<User, 'id'>) => await db.collection('users').add(user);
// FIX: Use compat update syntax
export const updateUser = async (user: User) => await db.collection('users').doc(user.id).update({ ...user });
// FIX: Use compat delete syntax
export const deleteUser = async (id: string) => await db.collection('users').doc(id).delete();
// FIX: Added function to save the FCM push token to a user's document.
// FIX: Use compat update syntax
export const savePushToken = async (userId: string, token: string) => await db.collection('users').doc(userId).update({ pushToken: token });

// --- NOTIFICATIONS ---
export const subscribeToNotifications = (callback: (data: AppNotification[]) => void, unreadOnly = false) => {
  // FIX: Use compat query syntax
  let q: firebase.firestore.Query = db.collection('notifications').orderBy('timestamp', 'desc');
  if (unreadOnly) q = q.where('readStatus', '==', false);
  return q.onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification))));
};
// FIX: Use compat update syntax
export const markNotificationAsRead = async (id: string, userId: string, userName: string) => await db.collection('notifications').doc(id).update({ readStatus: true, reviewedBy: userName, reviewedAt: Date.now() });
export const markAllNotificationsAsRead = async (userId: string, userName: string) => {
  // FIX: Use compat query syntax
  const q = db.collection('notifications').where('readStatus', '==', false);
  const snapshot = await q.get();
  // FIX: Use compat batch syntax
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.update(d.ref, { readStatus: true, reviewedBy: userName, reviewedAt: Date.now() }));
  await batch.commit();
};

// --- TASKS ---
// FIX: Use compat query syntax for onSnapshot
export const subscribeToTasks = (callback: (data: Task[]) => void) => db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot(snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task))));

export const saveTask = async (task: Partial<Task>) => {
  const isNew = !task.id;
  // FIX: Use compat doc reference and set syntax
  const docRef = isNew ? db.collection('tasks').doc() : db.collection('tasks').doc(task.id!);
  
  let taskData: Partial<Task> = { ...task, id: docRef.id };
  if (isNew) {
    taskData.seenBy = [task.createdById!]; // Mark as seen by creator
  }

  await docRef.set(taskData, { merge: true });

  if(isNew) {
    const notificationType = task.type === TaskType.ANNOUNCEMENT ? NotificationType.NEW_ANNOUNCEMENT : NotificationType.NEW_TASK;
    await createNotification(notificationType, {
      taskId: docRef.id,
      taskTitle: task.title,
      departmentName: task.departmentName,
      departmentId: task.departmentId,
    });
  }
};

// FIX: Use compat delete syntax
export const deleteTask = async (id: string) => await db.collection('tasks').doc(id).delete();

export const cleanupCompletedTasks = async () => {
  const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
  // FIX: Use compat query syntax
  const q = db.collection('tasks')
    .where('status', '==', TaskStatus.COMPLETED)
    .where('completedAt', '<', thirtyMinutesAgo);
  const snapshot = await q.get();
  if (!snapshot.empty) {
    console.log(`Cleaning up ${snapshot.size} completed tasks...`);
    // FIX: Use compat batch syntax
    const batch = db.batch();
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
};

// New: Function to add a comment to a task
export const addCommentToTask = async (taskId: string, comment: Omit<TaskComment, 'id'>) => {
  const newComment = {
    ...comment,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    timestamp: Date.now()
  };
  const taskRef = db.collection('tasks').doc(taskId);
  await taskRef.update({
    comments: firebase.firestore.FieldValue.arrayUnion(newComment),
    seenBy: [comment.userId] // Reset seenBy to just the commenter
  });
};

// New: Function to mark a task as seen by the current user
export const markTaskAsSeen = async (taskId: string, userId: string) => {
  const taskRef = db.collection('tasks').doc(taskId);
  await taskRef.update({
    seenBy: firebase.firestore.FieldValue.arrayUnion(userId)
  });
};

// New: Function to delete all order batches
export const deleteAllBatches = async () => {
  const q = db.collection('requests');
  const snapshot = await q.get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

// New: Function to delete all notifications
export const deleteAllNotifications = async () => {
  const q = db.collection('notifications');
  const snapshot = await q.get();
  if (snapshot.empty) return;
  const batch = db.batch();
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

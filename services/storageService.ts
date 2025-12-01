import { Product, User, ReplenishmentRequest, UserRole, Department, CartItem, AppNotification, NotificationType, NotificationPayload, OrderBatch, Task, TaskStatus, TaskPriority } from '../types';
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
import { db } from '../firebaseConfig';

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
    const q = query(collection(db, name), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log(`Initializing ${name} collection...`);
      const batch = writeBatch(db);
      data.forEach(item => {
        const docRef = item.id ? doc(db, name, item.id) : doc(collection(db, name));
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
  }
  const newNotification: Omit<AppNotification, 'id'> = {
    type, title, message, icon,
    timestamp: Date.now(),
    readStatus: false,
    payload,
  };
  await addDoc(collection(db, 'notifications'), newNotification);
};

// --- AUTH & SESSION ---
export const login = async (name: string, pin: string): Promise<User | null> => {
  const q = query(collection(db, "users"), where("name", "==", name), where("pin", "==", pin));
  const querySnapshot = await getDocs(q);
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
export const subscribeToDepartments = (callback: (data: Department[]) => void) => onSnapshot(query(collection(db, 'departments'), orderBy('name')), snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Department))));
export const saveDepartment = async (department: Partial<Department>) => {
  const docRef = department.id ? doc(db, 'departments', department.id) : doc(collection(db, 'departments'));
  await setDoc(docRef, { ...department, id: docRef.id }, { merge: true });
};
export const deleteDepartment = async (id: string) => await deleteDoc(doc(db, 'departments', id));

// --- PRODUCTS ---
export const subscribeToProducts = (callback: (data: Product[]) => void) => onSnapshot(query(collection(db, 'products'), orderBy('name')), snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product))));
export const saveProduct = async (product: Partial<Product>) => {
  const docRef = product.id ? doc(db, 'products', product.id) : doc(collection(db, 'products'));
  await setDoc(docRef, { ...product, id: docRef.id }, { merge: true });
};
export const deleteProduct = async (id: string) => await deleteDoc(doc(db, 'products', id));

// --- ORDERS / REPLENISHMENT ---
export const submitOrderBatch = async (cart: CartItem[], departmentId: string, departmentName: string, user: User) => {
  const batch = writeBatch(db);
  const lowStockItems: string[] = [];
  const batchId = Date.now().toString().slice(-6);

  for (const item of cart) {
    const productRef = doc(db, 'products', item.product.id);
    const newQuantity = item.product.quantity - item.quantity;
    batch.update(productRef, { quantity: newQuantity });

    const request: Omit<ReplenishmentRequest, 'id'> = {
      batchId, productId: item.product.id, productName: item.product.name,
      departmentId, departmentName, requestedBy: user.name,
      quantity: item.quantity, status: 'COMPLETED',
      date: new Date().toLocaleString(), timestamp: Date.now(), unit: item.product.unit
    };
    const requestRef = doc(collection(db, 'requests'));
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
  const q = query(collection(db, 'requests'), orderBy('timestamp', 'desc'));
  return onSnapshot(q, snapshot => {
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
  const q = query(collection(db, 'requests'), where('batchId', '==', batchId));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

// --- USERS ---
export const subscribeToUsers = (callback: (users: User[]) => void) => onSnapshot(query(collection(db, 'users'), orderBy('name')), snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User))));
export const addUser = async (user: Omit<User, 'id'>) => await addDoc(collection(db, 'users'), user);
export const updateUser = async (user: User) => await updateDoc(doc(db, 'users', user.id), { ...user });
export const deleteUser = async (id: string) => await deleteDoc(doc(db, 'users', id));

// --- NOTIFICATIONS ---
export const subscribeToNotifications = (callback: (data: AppNotification[]) => void, unreadOnly = false) => {
  let q = query(collection(db, 'notifications'), orderBy('timestamp', 'desc'));
  if (unreadOnly) q = query(q, where('readStatus', '==', false));
  return onSnapshot(q, snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as AppNotification))));
};
export const markNotificationAsRead = async (id: string, userId: string, userName: string) => await updateDoc(doc(db, 'notifications', id), { readStatus: true, reviewedBy: userName, reviewedAt: Date.now() });
export const markAllNotificationsAsRead = async (userId: string, userName: string) => {
  const q = query(collection(db, 'notifications'), where('readStatus', '==', false));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(d => batch.update(d.ref, { readStatus: true, reviewedBy: userName, reviewedAt: Date.now() }));
  await batch.commit();
};

// --- TASKS ---
export const subscribeToTasks = (callback: (data: Task[]) => void) => onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), snapshot => callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Task))));
export const saveTask = async (task: Partial<Task>) => {
  const isNew = !task.id;
  const docRef = isNew ? doc(collection(db, 'tasks')) : doc(db, 'tasks', task.id!);
  const taskData = { ...task, id: docRef.id };
  await setDoc(docRef, taskData, { merge: true });

  if(isNew) {
    await createNotification(NotificationType.NEW_TASK, {
      taskId: docRef.id,
      taskTitle: task.title,
      departmentName: task.departmentName
    });
  }
};
export const deleteTask = async (id: string) => await deleteDoc(doc(db, 'tasks', id));
export const cleanupCompletedTasks = async () => {
  const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
  const q = query(
    collection(db, 'tasks'), 
    where('status', '==', TaskStatus.COMPLETED),
    where('completedAt', '<', twelveHoursAgo)
  );
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    console.log(`Cleaning up ${snapshot.size} completed tasks...`);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
};
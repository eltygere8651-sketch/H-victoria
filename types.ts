export type Permission =
  | 'CAN_VIEW_INVENTORY'
  | 'CAN_MANAGE_INVENTORY'
  | 'CAN_MAKE_ORDERS'
  | 'CAN_MANAGE_TASKS'
  | 'CAN_MANAGE_USERS'
  | 'CAN_MANAGE_ROLES'
  | 'CAN_VIEW_REPORTS';

export const ALL_PERMISSIONS: { id: Permission, name: string }[] = [
  { id: 'CAN_VIEW_INVENTORY', name: 'Ver Inventario' },
  { id: 'CAN_MANAGE_INVENTORY', name: 'Gestionar Inventario (Crear/Editar/Eliminar Productos y Dptos.)' },
  { id: 'CAN_MAKE_ORDERS', name: 'Realizar Pedidos' },
  { id: 'CAN_MANAGE_TASKS', name: 'Gestionar Tareas (Crear/Editar/Eliminar)' },
  { id: 'CAN_MANAGE_USERS', name: 'Gestionar Usuarios' },
  { id: 'CAN_MANAGE_ROLES', name: 'Gestionar Roles y Permisos' },
  { id: 'CAN_VIEW_REPORTS', name: 'Ver Reportes y Notificaciones' },
];

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  isEditable: boolean; // Prevent editing core roles like Admin
}

export interface User {
  id: string;
  name: string;
  roleId: string;
  pin: string;
}

// This is the user object available globally after login
export interface AuthenticatedUser extends User {
  role: Role; // The resolved role object
  permissions: Permission[]; // The resolved permissions for quick checking
}

export interface Department {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  departmentId: string;
  departmentName: string;
}

export interface ReplenishmentRequest {
  id: string;
  batchId?: string;
  productId: string;
  productName: string;
  departmentId: string;
  departmentName: string;
  requestedBy: string;
  quantity: number;
  status: 'PENDING' | 'COMPLETED';
  date: string;
  timestamp?: number;
  unit?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderBatch {
  batchId: string;
  date: string;
  departmentId: string;
  departmentName: string;
  requestedBy: string;
  items: ReplenishmentRequest[];
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  location?: string;
  departmentId: string;
  departmentName: string;
  createdBy: string;
  createdById: string;
  createdAt: number;
  completedBy?: string;
  completedAt?: number;
  imagesBase64?: string[];
}

export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  NEW_ORDER = 'NEW_ORDER',
  NEW_TASK = 'NEW_TASK',
}

export interface NotificationPayload {
  productId?: string;
  productName?: string;
  orderBatchId?: string;
  departmentId?: string;
  departmentName?: string;
  taskId?: string;
  taskTitle?: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  timestamp: number;
  readStatus: boolean;
  reviewedBy?: string;
  reviewedAt?: number;
  payload: NotificationPayload;
}
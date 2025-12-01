export type UserRole = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string;
}

// This is the user object available globally after login
export type AuthenticatedUser = User;

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
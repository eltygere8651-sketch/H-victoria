export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  GUEST = 'GUEST', // New role for public access links
  PROVIDER = 'PROVIDER' // Role for external providers
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  contraseña: string; // Password for the user
  email?: string; // New: For Google Login authorization
  permissions?: ('CAN_MANAGE_TASKS')[]; // New: Granular permissions
  isSuperAdmin?: boolean; // New: Flag for higher-level permissions
  isAdmin?: boolean; // New: Flag for higher-level permissions
  // FIX: Added optional pushToken for FCM integration.
  pushToken?: string;
  authUid?: string; // New: Link between Firestore user and Auth account
}

// New dynamic Department interface
export interface Department {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string; // e.g., 'unidades', 'litros', 'cajas'
  minThreshold: number; // For low stock alerts
  maxThreshold?: number; // New: For maximum capacity/stock limit
  departmentId: string; // Legacy/Primary department ID
  departmentName: string; // Legacy/Primary department Name
  departmentIds?: string[]; // New: Array of department IDs
  departmentNames?: string[]; // New: Array of department names
}

export interface ReplenishmentRequest {
  id: string;
  batchId?: string; // Group requests into a single order
  productId: string;
  productName: string;
  departmentId: string; // Updated: Use department ID
  departmentName: string; // Updated: For display purposes
  requestedBy: string;
  quantity: number;
  status: 'PENDING' | 'COMPLETED';
  date: string;
  timestamp?: number; // Numeric timestamp for auto-cleanup
  unit?: string;
}

export interface AppState {
  currentUser: User | null;
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

// --- New Task Management Types ---
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

// New: Enum to differentiate between a task and an announcement
export enum TaskType {
  TASK = 'TASK',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export enum TaskRecurrence {
  NONE = 'NONE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

// New: Interface for comments within a task
export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}


export interface TaskChecklistItem {
  id: string;
  text: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  location?: string;
  departmentId: string; // The department this task is assigned to
  departmentName: string;
  createdBy: string; // User's name
  createdById: string; // User's ID
  createdAt: number; // Timestamp
  startDate?: number; // New: Task start date/time
  dueDate?: number; // New: Task end/due date/time
  completedBy?: string;
  completedAt?: number;
  imageUrls?: string[]; // New: Store Firebase Storage URLs for images
  videoUrls?: string[]; // New: Store Cloudinary URLs for videos
  imagesTitle?: string; // New: Title for the images section
  type: TaskType; // New: Differentiates between task and announcement
  comments?: TaskComment[]; // New: Thread for discussions
  seenBy?: string[]; // New: Array of user IDs who have seen the latest update
  checklist?: TaskChecklistItem[]; // New: Interactive checklist for tasks
  recurrence?: TaskRecurrence; // New: Recurrence for scheduled tasks
}

// --- Notification System Types ---
export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  NEW_ORDER = 'NEW_ORDER',
  NEW_TASK = 'NEW_TASK',
  STOCK_RECEIVED = 'STOCK_RECEIVED',
  DAILY_TASK_ALERT = 'DAILY_TASK_ALERT',
  INVENTORY_ADJUSTMENT = 'INVENTORY_ADJUSTMENT',
  TASK_COMPLETED = 'TASK_COMPLETED',
}

export interface NotificationPayload {
  productId?: string;
  productName?: string;
  orderBatchId?: string;
  departmentId?: string;
  departmentName?: string;
  taskId?: string; // For new task notifications
  taskTitle?: string;
  itemCount?: number;
  shift?: string; // For daily task alerts
  count?: number; // For generic counts
}

export interface AppNotification {
  id: string; // Firestore document ID
  type: NotificationType;
  title: string;
  message: string;
  icon: string; // Lucide icon name, e.g., 'AlertTriangle', 'BellRing'
  timestamp: number; // Unix timestamp for sorting and display
  readStatus: boolean;
  reviewedBy?: string; // User ID who marked it as read/reviewed
  reviewedAt?: number; // Unix timestamp when it was reviewed
  payload: NotificationPayload;
}

// --- New Room Assembly Types ---
export enum RoomName {
  RESTAURANTE = 'Restaurante',
  SALON_C = 'Salon C',
  TERRAZA = 'Terraza'
}

export interface RoomPost {
  id: string;
  roomName: RoomName | string;
  title: string;
  description?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  createdBy: string;
  createdById: string;
  createdAt: number;
}

export interface Document {
  id: string;
  name: string;
  url: string; // Firebase Storage URL
  category: string;
  fileType: string; // e.g., 'application/pdf'
  uploadedBy: string; // User's name
  createdAt: number; // Timestamp
}

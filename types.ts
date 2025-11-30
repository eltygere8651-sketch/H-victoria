export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  pin: string; // Simplified password for this demo
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
  departmentId: string; // New: Link to a department
  departmentName: string; // New: For display purposes
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
  completedBy?: string;
  completedAt?: number;
  imageUrl?: string; // URL for the task image
  imagePath?: string; // Path in Firebase Storage for deletion
}

// --- New Announcement Type ---
export interface Announcement {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number; // timestamp
}


// --- Notification System Types ---
export enum NotificationType {
  LOW_STOCK = 'LOW_STOCK',
  NEW_ORDER = 'NEW_ORDER',
  NEW_TASK = 'NEW_TASK',
  NEW_ANNOUNCEMENT = 'NEW_ANNOUNCEMENT',
}

export interface NotificationPayload {
  productId?: string;
  productName?: string;
  orderBatchId?: string;
  departmentId?: string;
  departmentName?: string;
  taskId?: string; // For new task notifications
  taskTitle?: string;
  announcementId?: string; // For new announcement notifications
  announcementTitle?: string;
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
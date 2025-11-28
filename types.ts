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
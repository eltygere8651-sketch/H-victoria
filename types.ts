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

export enum Department {
  BAR = 'Bar',
  GASTRO_BAR = 'Gastro Bar',
  COCINA = 'Cocina',
  LIMPIEZA = 'Limpieza',
  TIENDA_REGALOS = 'Tienda de Regalos',
  GENERAL = 'General'
}

export interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string; // e.g., 'unidades', 'litros', 'cajas'
  minThreshold: number; // For low stock alerts
}

export interface ReplenishmentRequest {
  id: string;
  batchId?: string; // Group requests into a single order
  productId: string;
  productName: string;
  department: Department;
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
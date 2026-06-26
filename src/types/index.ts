export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string | null;
  created_at: string;
}

export interface ProductStoreStock {
  product_id: string;
  store_id: string;
  stock: number;
}

export interface Attendance {
  id: string;
  user_id: string;
  store_id: string | null;
  store?: Store;
  date: string;
  clock_in: string;
  clock_out: string | null;
  created_at: string;
  user_name?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  purchase_price: number;
  selling_price: number;
  stock: number;
  min_stock: number;
  description: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  created_at: string;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  supplier?: Supplier;
  store_id?: string | null;
  total_amount: number;
  purchase_date: string;
  created_at: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
}

export interface Sale {
  id: string;
  customer_id: string;
  customer?: Customer;
  store_id?: string | null;
  invoice_no: string;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  sale_date: string;
  created_at: string;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
}

export interface DashboardStats {
  totalProducts: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalPurchases: number;
  totalSales: number;
  totalRevenue: number;
  revenueOverview: { date: string; sales: number; purchases: number }[];
  monthlySales: { name: string; amount: number }[];
  recentSales: Sale[];
  lowStockProducts: Product[];
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'staff';
  created_at: string;
}

export interface Task {
  id: string;
  assigned_to: string;
  assigned_to_profile?: Profile;
  assigned_by: string;
  assigned_by_profile?: Profile;
  store_id: string | null;
  title: string;
  description: string | null;
  due_date: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  created_at: string;
  updated_at: string;
}

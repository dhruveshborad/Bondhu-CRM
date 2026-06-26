import type { Product, Customer, Supplier, Purchase, Sale } from '@/types'

// INITIAL DEMO DATA
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'MacBook Pro 14" M3',
    sku: 'MBP-14-M3',
    category: 'Electronics',
    purchase_price: 1350.00,
    selling_price: 1599.00,
    stock: 12,
    min_stock: 5,
    description: 'Apple MacBook Pro with M3 Chip, 16GB RAM, 512GB SSD',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p2',
    name: 'Wireless Magic Mouse',
    sku: 'MM-WIRELESS',
    category: 'Accessories',
    purchase_price: 55.00,
    selling_price: 79.00,
    stock: 4,
    min_stock: 10, // Low stock!
    description: 'Rechargeable wireless mouse with multi-touch surface',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p3',
    name: 'Dell UltraSharp 27" Monitor',
    sku: 'DELL-U2723QE',
    category: 'Electronics',
    purchase_price: 320.00,
    selling_price: 499.00,
    stock: 8,
    min_stock: 4,
    description: '4K USB-C Hub Monitor with IPS Black technology',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p4',
    name: 'Ergonomic Office Chair',
    sku: 'CHAIR-ERGO',
    category: 'Furniture',
    purchase_price: 180.00,
    selling_price: 299.00,
    stock: 0,
    min_stock: 5, // Out of stock!
    description: 'High-back mesh chair with adjustable lumbar support',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'p5',
    name: 'USB-C Docking Station',
    sku: 'DOCK-11IN1',
    category: 'Accessories',
    purchase_price: 40.00,
    selling_price: 89.00,
    stock: 25,
    min_stock: 8,
    description: '11-in-1 Triple Display USB-C Adapter with Power Delivery',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Acme Corporation',
    phone: '+1 (555) 019-2834',
    email: 'billing@acme.com',
    address: '102 Industrial Parkway, Tech City, CA',
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'c2',
    name: 'Johnathan Doe',
    phone: '+1 (555) 014-9988',
    email: 'john.doe@gmail.com',
    address: '456 Oak Avenue, Metropolis, NY',
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'c3',
    name: 'Sarah Connor',
    phone: '+1 (555) 017-1122',
    email: 'sconnor@cyberdyne.io',
    address: '742 Evergreen Terrace, Springfield, OR',
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 's1',
    name: 'Global Tech Distributors',
    phone: '+1 (800) 555-0100',
    email: 'sales@globaltech.com',
    address: '100 Distribution Way, Logistics Hub, TX',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 's2',
    name: 'Office Depot & Supplies Inc.',
    phone: '+1 (800) 555-0155',
    email: 'bulkorders@officedepot.com',
    address: '500 Commerce Boulevard, Miami, FL',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// Seed Purchases & Sales to generate realistic chart history
const getDemoDate = (daysAgo: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
};

const DEFAULT_PURCHASES: Purchase[] = [
  {
    id: 'pur1',
    supplier_id: 's1',
    total_amount: 16200.00,
    purchase_date: getDemoDate(25),
    created_at: new Date(getDemoDate(25)).toISOString(),
    items: [
      { id: 'pi1', purchase_id: 'pur1', product_id: 'p1', quantity: 10, unit_price: 1350.00 },
      { id: 'pi2', purchase_id: 'pur1', product_id: 'p3', quantity: 5, unit_price: 320.00 }
    ]
  },
  {
    id: 'pur2',
    supplier_id: 's2',
    total_amount: 1420.00,
    purchase_date: getDemoDate(10),
    created_at: new Date(getDemoDate(10)).toISOString(),
    items: [
      { id: 'pi3', purchase_id: 'pur2', product_id: 'p2', quantity: 20, unit_price: 55.00 },
      { id: 'pi4', purchase_id: 'pur2', product_id: 'p5', quantity: 8, unit_price: 40.00 }
    ]
  }
];

const DEFAULT_SALES: Sale[] = [
  {
    id: 'sal1',
    customer_id: 'c1',
    invoice_no: 'INV-2026-0001',
    subtotal: 3697.00,
    discount: 100.00,
    tax: 287.76,
    grand_total: 3884.76,
    sale_date: getDemoDate(18),
    created_at: new Date(getDemoDate(18)).toISOString(),
    items: [
      { id: 'si1', sale_id: 'sal1', product_id: 'p1', quantity: 2, unit_price: 1599.00 },
      { id: 'si2', sale_id: 'sal1', product_id: 'p3', quantity: 1, unit_price: 499.00 }
    ]
  },
  {
    id: 'sal2',
    customer_id: 'c2',
    invoice_no: 'INV-2026-0002',
    subtotal: 1678.00,
    discount: 0.00,
    tax: 134.24,
    grand_total: 1812.24,
    sale_date: getDemoDate(5),
    created_at: new Date(getDemoDate(5)).toISOString(),
    items: [
      { id: 'si3', sale_id: 'sal2', product_id: 'p2', quantity: 1, unit_price: 79.00 },
      { id: 'si4', sale_id: 'sal2', product_id: 'p1', quantity: 1, unit_price: 1599.00 }
    ]
  },
  {
    id: 'sal3',
    customer_id: 'c3',
    invoice_no: 'INV-2026-0003',
    subtotal: 890.00,
    discount: 50.00,
    tax: 67.20,
    grand_total: 907.20,
    sale_date: getDemoDate(2),
    created_at: new Date(getDemoDate(2)).toISOString(),
    items: [
      { id: 'si5', sale_id: 'sal3', product_id: 'p5', quantity: 10, unit_price: 89.00 }
    ]
  }
];

const DEFAULT_STORES = [
  { id: 'f1111111-1111-1111-1111-111111111111', name: 'Main Warehouse', location: 'Logistics Park, CA', created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'f2222222-2222-2222-2222-222222222222', name: 'Downtown Outlet', location: '456 Commerce St, NY', created_at: new Date(Date.now() - 48 * 24 * 60 * 60 * 1000).toISOString() }
];

const DEFAULT_PRODUCT_STORE_STOCKS = [
  // MBP (p1) total 12
  { product_id: 'p1', store_id: 'f1111111-1111-1111-1111-111111111111', stock: 10 },
  { product_id: 'p1', store_id: 'f2222222-2222-2222-2222-222222222222', stock: 2 },
  // Magic Mouse (p2) total 4
  { product_id: 'p2', store_id: 'f1111111-1111-1111-1111-111111111111', stock: 1 },
  { product_id: 'p2', store_id: 'f2222222-2222-2222-2222-222222222222', stock: 3 },
  // Dell Monitor (p3) total 8
  { product_id: 'p3', store_id: 'f1111111-1111-1111-1111-111111111111', stock: 6 },
  { product_id: 'p3', store_id: 'f2222222-2222-2222-2222-222222222222', stock: 2 },
  // Ergo Chair (p4) total 0
  { product_id: 'p4', store_id: 'f1111111-1111-1111-1111-111111111111', stock: 0 },
  { product_id: 'p4', store_id: 'f2222222-2222-2222-2222-222222222222', stock: 0 },
  // USB-C Dock (p5) total 25
  { product_id: 'p5', store_id: 'f1111111-1111-1111-1111-111111111111', stock: 20 },
  { product_id: 'p5', store_id: 'f2222222-2222-2222-2222-222222222222', stock: 5 }
];

const DEFAULT_PROFILES = [
  { id: 'demo-user-id', email: 'dhruveshborad007@gmail.com', full_name: 'Dhruvesh Borad', role: 'admin', created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'demo-user-2', email: 'manager@company.com', full_name: 'Sarah Connor', role: 'manager', created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
  { id: 'demo-user-3', email: 'staff@company.com', full_name: 'Johnathan Doe', role: 'staff', created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString() }
];

const DEFAULT_TASKS = [
  {
    id: 'task-1',
    assigned_to: 'demo-user-3',
    assigned_by: 'demo-user-id',
    store_id: 'f1111111-1111-1111-1111-111111111111',
    title: 'Audit inventory count in Warehouse',
    description: 'Verify current MacBook Pro and monitor stock matches physical counts.',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'task-2',
    assigned_to: 'demo-user-id',
    assigned_by: 'demo-user-2',
    store_id: 'f2222222-2222-2222-2222-222222222222',
    title: 'Update store display setup',
    description: 'Make sure promotional monitors are correctly mounted in Downtown Outlet.',
    due_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'In Progress',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_ATTENDANCE = [
  {
    id: 'att1',
    user_id: 'demo-user-id',
    store_id: 'f1111111-1111-1111-1111-111111111111',
    store: DEFAULT_STORES[0],
    date: getDemoDate(1),
    clock_in: new Date(getDemoDate(1) + 'T09:00:00Z').toISOString(),
    clock_out: new Date(getDemoDate(1) + 'T17:30:00Z').toISOString(),
    created_at: new Date(getDemoDate(1) + 'T09:00:00Z').toISOString(),
    user_name: 'Dhruvesh Borad'
  }
];

export const initializeLocalDb = () => {
  if (!localStorage.getItem('demo_users')) {
    const demoUsers = [
      { id: 'demo-user-id', email: 'dhruveshborad007@gmail.com', password: 'password', full_name: 'Dhruvesh Borad', role: 'admin' },
      { id: 'demo-user-2', email: 'manager@company.com', password: 'password', full_name: 'Sarah Connor', role: 'manager' },
      { id: 'demo-user-3', email: 'staff@company.com', password: 'password', full_name: 'Johnathan Doe', role: 'staff' }
    ];
    localStorage.setItem('demo_users', JSON.stringify(demoUsers));
  }
  if (!localStorage.getItem('erp_products')) {
    localStorage.setItem('erp_products', JSON.stringify(DEFAULT_PRODUCTS));
  }
  if (!localStorage.getItem('erp_customers')) {
    localStorage.setItem('erp_customers', JSON.stringify(DEFAULT_CUSTOMERS));
  }
  if (!localStorage.getItem('erp_suppliers')) {
    localStorage.setItem('erp_suppliers', JSON.stringify(DEFAULT_SUPPLIERS));
  }
  if (!localStorage.getItem('erp_stores')) {
    localStorage.setItem('erp_stores', JSON.stringify(DEFAULT_STORES));
  }
  if (!localStorage.getItem('erp_profiles')) {
    localStorage.setItem('erp_profiles', JSON.stringify(DEFAULT_PROFILES));
  }
  if (!localStorage.getItem('erp_tasks')) {
    localStorage.setItem('erp_tasks', JSON.stringify(DEFAULT_TASKS));
  }
  if (!localStorage.getItem('erp_product_store_stocks')) {
    localStorage.setItem('erp_product_store_stocks', JSON.stringify(DEFAULT_PRODUCT_STORE_STOCKS));
  }
  if (!localStorage.getItem('erp_attendance')) {
    localStorage.setItem('erp_attendance', JSON.stringify(DEFAULT_ATTENDANCE));
  }
  if (!localStorage.getItem('erp_purchases')) {
    // Add store_id to default purchases
    const purchases = DEFAULT_PURCHASES.map((p, idx) => ({
      ...p,
      store_id: idx === 0 ? 'f1111111-1111-1111-1111-111111111111' : 'f2222222-2222-2222-2222-222222222222'
    }));
    localStorage.setItem('erp_purchases', JSON.stringify(purchases));
  }
  if (!localStorage.getItem('erp_sales')) {
    // Add store_id to default sales
    const sales = DEFAULT_SALES.map((s, idx) => ({
      ...s,
      store_id: idx === 2 ? 'f2222222-2222-2222-2222-222222222222' : 'f1111111-1111-1111-1111-111111111111'
    }));
    localStorage.setItem('erp_sales', JSON.stringify(sales));
  }
};

// Generic Local Storage Table Helpers
export const getLocalItems = <T>(key: string): T[] => {
  initializeLocalDb();
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : [];
};

export const setLocalItems = <T>(key: string, items: T[]): void => {
  localStorage.setItem(key, JSON.stringify(items));
};

// Store specific stock helpers
export const getStoreStock = (productId: string, storeId: string): number => {
  const stocks = getLocalItems<any>('erp_product_store_stocks');
  const record = stocks.find(s => s.product_id === productId && s.store_id === storeId);
  return record ? record.stock : 0;
};

export const updateStoreStock = (productId: string, storeId: string, qtyDiff: number): void => {
  const stocks = getLocalItems<any>('erp_product_store_stocks');
  const idx = stocks.findIndex(s => s.product_id === productId && s.store_id === storeId);
  
  if (idx > -1) {
    stocks[idx].stock = Math.max(0, stocks[idx].stock + qtyDiff);
  } else {
    stocks.push({ product_id: productId, store_id: storeId, stock: Math.max(0, qtyDiff) });
  }
  setLocalItems('erp_product_store_stocks', stocks);

  // Sync to global erp_products stock (global stock is sum of all stores)
  const products = getLocalItems<any>('erp_products');
  const pIdx = products.findIndex((p: any) => p.id === productId);
  if (pIdx > -1) {
    const totalStock = stocks
      .filter(s => s.product_id === productId)
      .reduce((sum, s) => sum + s.stock, 0);
    products[pIdx].stock = totalStock;
    setLocalItems('erp_products', products);
  }
};

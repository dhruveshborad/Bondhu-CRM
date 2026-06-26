-- MINI ERP SYSTEM DATABASE SCHEMA
-- Execute this SQL script in the Supabase SQL Editor

-- -------------------------------------------------------------
-- Clean Up Existing Objects (For clean installations)
-- -------------------------------------------------------------
-- Drop tables first using CASCADE to automatically remove triggers and foreign keys
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS product_store_stocks CASCADE;
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;
DROP TABLE IF EXISTS purchase_items CASCADE;
DROP TABLE IF EXISTS purchases CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Now safely drop the trigger functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS fn_handle_purchase_item_insert();
DROP FUNCTION IF EXISTS fn_handle_purchase_item_update();
DROP FUNCTION IF EXISTS fn_handle_purchase_item_delete();
DROP FUNCTION IF EXISTS fn_handle_sale_item_insert();
DROP FUNCTION IF EXISTS fn_handle_sale_item_update();
DROP FUNCTION IF EXISTS fn_handle_sale_item_delete();

-- -------------------------------------------------------------
-- Tables Creation
-- -------------------------------------------------------------

-- 1. PRODUCTS TABLE
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    purchase_price NUMERIC(12, 2) NOT NULL CHECK (purchase_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_stock INTEGER NOT NULL DEFAULT 10 CHECK (min_stock >= 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CUSTOMERS TABLE
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. SUPPLIERS TABLE
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5. STORES TABLE
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PURCHASES TABLE
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PURCHASE ITEMS TABLE
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

-- 6. SALES TABLE
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    invoice_no TEXT UNIQUE NOT NULL,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
    grand_total NUMERIC(12, 2) NOT NULL CHECK (grand_total >= 0),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SALE ITEMS TABLE
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0)
);

-- 7.5. PRODUCT STORE STOCKS TABLE
CREATE TABLE product_store_stocks (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    PRIMARY KEY (product_id, store_id)
);

-- 8. PROFILES TABLE (Synced with auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8.5. ATTENDANCE TABLE
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMPTZ NOT NULL,
    clock_out TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. TASKS TABLE
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assigned_to UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Indexes for Performance & Search Optimization
-- -------------------------------------------------------------
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX idx_purchases_store_id ON purchases(store_id);
CREATE INDEX idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX idx_purchase_items_product_id ON purchase_items(product_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_invoice_no ON sales(invoice_no);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product_id ON sale_items(product_id);
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_store_id ON attendance(store_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_store_id ON tasks(store_id);

-- -------------------------------------------------------------
-- Database Triggers for Inventory Stock Management
-- -------------------------------------------------------------

-- --- PURCHASE STOCK TRIGGERS ---

-- A. On Insert Purchase Item: Add stock
CREATE OR REPLACE FUNCTION fn_handle_purchase_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    target_store_id UUID;
BEGIN
    SELECT store_id INTO target_store_id FROM purchases WHERE id = NEW.purchase_id;
    
    IF target_store_id IS NOT NULL THEN
        INSERT INTO product_store_stocks (product_id, store_id, stock)
        VALUES (NEW.product_id, target_store_id, NEW.quantity)
        ON CONFLICT (product_id, store_id)
        DO UPDATE SET stock = product_store_stocks.stock + NEW.quantity;
    END IF;

    UPDATE products
    SET stock = stock + NEW.quantity
    WHERE id = NEW.product_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_purchase_item_inserted
AFTER INSERT ON purchase_items
FOR EACH ROW EXECUTE FUNCTION fn_handle_purchase_item_insert();

-- B. On Delete Purchase Item: Deduct stock (ensure we don't go negative, if so throw error)
CREATE OR REPLACE FUNCTION fn_handle_purchase_item_delete()
RETURNS TRIGGER AS $$
DECLARE
    target_store_id UUID;
    current_store_stock INTEGER;
    current_global_stock INTEGER;
BEGIN
    SELECT store_id INTO target_store_id FROM purchases WHERE id = OLD.purchase_id;
    
    -- Check global stock
    SELECT stock INTO current_global_stock FROM products WHERE id = OLD.product_id;
    IF current_global_stock < OLD.quantity THEN
        RAISE EXCEPTION 'Cannot delete purchase item. Removing this item would result in negative global stock for product %.', 
            (SELECT name FROM products WHERE id = OLD.product_id);
    END IF;

    -- Check store stock
    IF target_store_id IS NOT NULL THEN
        SELECT stock INTO current_store_stock FROM product_store_stocks 
        WHERE product_id = OLD.product_id AND store_id = target_store_id;
        
        IF current_store_stock IS NULL OR current_store_stock < OLD.quantity THEN
            RAISE EXCEPTION 'Cannot delete purchase item. Removing this item would result in negative stock in store % for product %.', 
                (SELECT name FROM stores WHERE id = target_store_id),
                (SELECT name FROM products WHERE id = OLD.product_id);
        END IF;

        UPDATE product_store_stocks
        SET stock = stock - OLD.quantity
        WHERE product_id = OLD.product_id AND store_id = target_store_id;
    END IF;

    UPDATE products
    SET stock = stock - OLD.quantity
    WHERE id = OLD.product_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_purchase_item_deleted
AFTER DELETE ON purchase_items
FOR EACH ROW EXECUTE FUNCTION fn_handle_purchase_item_delete();

-- C. On Update Purchase Item: Adjust stock difference
CREATE OR REPLACE FUNCTION fn_handle_purchase_item_update()
RETURNS TRIGGER AS $$
DECLARE
    old_store_id UUID;
    new_store_id UUID;
    current_store_stock INTEGER;
    current_global_stock INTEGER;
    stock_diff INTEGER;
BEGIN
    SELECT store_id INTO old_store_id FROM purchases WHERE id = OLD.purchase_id;
    SELECT store_id INTO new_store_id FROM purchases WHERE id = NEW.purchase_id;
    
    stock_diff := NEW.quantity - OLD.quantity;
    
    -- If product is changed
    IF OLD.product_id <> NEW.product_id THEN
        -- 1. Deduct from old product (global & store)
        SELECT stock INTO current_global_stock FROM products WHERE id = OLD.product_id;
        IF current_global_stock < OLD.quantity THEN
            RAISE EXCEPTION 'Cannot update purchase item. Changing product would result in negative global stock for old product %.', 
                (SELECT name FROM products WHERE id = OLD.product_id);
        END IF;

        IF old_store_id IS NOT NULL THEN
            SELECT stock INTO current_store_stock FROM product_store_stocks 
            WHERE product_id = OLD.product_id AND store_id = old_store_id;
            
            IF current_store_stock IS NULL OR current_store_stock < OLD.quantity THEN
                RAISE EXCEPTION 'Cannot update purchase item. Changing product would result in negative stock in store % for old product %.', 
                    (SELECT name FROM stores WHERE id = old_store_id),
                    (SELECT name FROM products WHERE id = OLD.product_id);
            END IF;
            
            UPDATE product_store_stocks SET stock = stock - OLD.quantity WHERE product_id = OLD.product_id AND store_id = old_store_id;
        END IF;
        
        UPDATE products SET stock = stock - OLD.quantity WHERE id = OLD.product_id;

        -- 2. Add to new product (global & store)
        IF new_store_id IS NOT NULL THEN
            INSERT INTO product_store_stocks (product_id, store_id, stock)
            VALUES (NEW.product_id, new_store_id, NEW.quantity)
            ON CONFLICT (product_id, store_id)
            DO UPDATE SET stock = product_store_stocks.stock + NEW.quantity;
        END IF;
        
        UPDATE products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
        
    -- If store is changed or quantity is changed (or both)
    ELSE
        -- Global stock diff check
        IF stock_diff < 0 THEN
            SELECT stock INTO current_global_stock FROM products WHERE id = NEW.product_id;
            IF current_global_stock < ABS(stock_diff) THEN
                RAISE EXCEPTION 'Cannot update purchase item. Decreasing quantity would result in negative global stock for product %.', 
                    (SELECT name FROM products WHERE id = NEW.product_id);
            END IF;
        END IF;

        -- Handle store transfer/change
        IF old_store_id <> new_store_id THEN
            -- Deduct old quantity from old store
            IF old_store_id IS NOT NULL THEN
                SELECT stock INTO current_store_stock FROM product_store_stocks 
                WHERE product_id = OLD.product_id AND store_id = old_store_id;
                
                IF current_store_stock IS NULL OR current_store_stock < OLD.quantity THEN
                    RAISE EXCEPTION 'Cannot update purchase item. Transferring store would result in negative stock in old store %.', 
                        (SELECT name FROM stores WHERE id = old_store_id);
                END IF;
                
                UPDATE product_store_stocks SET stock = stock - OLD.quantity WHERE product_id = OLD.product_id AND store_id = old_store_id;
            END IF;

            -- Add new quantity to new store
            IF new_store_id IS NOT NULL THEN
                INSERT INTO product_store_stocks (product_id, store_id, stock)
                VALUES (NEW.product_id, new_store_id, NEW.quantity)
                ON CONFLICT (product_id, store_id)
                DO UPDATE SET stock = product_store_stocks.stock + NEW.quantity;
            END IF;
        ELSE
            -- Normal quantity adjustment in same store
            IF new_store_id IS NOT NULL THEN
                IF stock_diff < 0 THEN
                    SELECT stock INTO current_store_stock FROM product_store_stocks 
                    WHERE product_id = NEW.product_id AND store_id = new_store_id;
                    
                    IF current_store_stock IS NULL OR current_store_stock < ABS(stock_diff) THEN
                        RAISE EXCEPTION 'Cannot update purchase item. Decreasing quantity would result in negative stock in store % for product %.', 
                            (SELECT name FROM stores WHERE id = new_store_id),
                            (SELECT name FROM products WHERE id = NEW.product_id);
                    END IF;
                END IF;

                INSERT INTO product_store_stocks (product_id, store_id, stock)
                VALUES (NEW.product_id, new_store_id, GREATEST(0, stock_diff))
                ON CONFLICT (product_id, store_id)
                DO UPDATE SET stock = product_store_stocks.stock + stock_diff;
            END IF;
        END IF;

        -- Update global
        UPDATE products SET stock = stock + stock_diff WHERE id = NEW.product_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_purchase_item_updated
AFTER UPDATE ON purchase_items
FOR EACH ROW EXECUTE FUNCTION fn_handle_purchase_item_update();


-- --- SALES STOCK TRIGGERS (WITH NEGATIVE STOCK PREVENTION) ---

-- A. On Insert Sale Item: Validate stock availability and deduct
CREATE OR REPLACE FUNCTION fn_handle_sale_item_insert()
RETURNS TRIGGER AS $$
DECLARE
    target_store_id UUID;
    current_store_stock INTEGER;
    current_global_stock INTEGER;
    product_name TEXT;
BEGIN
    SELECT name, stock INTO product_name, current_global_stock FROM products WHERE id = NEW.product_id;
    
    IF current_global_stock IS NULL THEN
        RAISE EXCEPTION 'Product with ID % does not exist.', NEW.product_id;
    END IF;

    -- Check global stock
    IF current_global_stock < NEW.quantity THEN
        RAISE EXCEPTION 'Insufficient global stock for product %. Available: %, Requested: %.', 
            product_name, current_global_stock, NEW.quantity;
    END IF;

    -- Check store stock
    SELECT store_id INTO target_store_id FROM sales WHERE id = NEW.sale_id;
    IF target_store_id IS NOT NULL THEN
        SELECT stock INTO current_store_stock FROM product_store_stocks 
        WHERE product_id = NEW.product_id AND store_id = target_store_id;
        
        IF current_store_stock IS NULL OR current_store_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Insufficient stock in store % for product %. Available: %, Requested: %.', 
                (SELECT name FROM stores WHERE id = target_store_id),
                product_name, COALESCE(current_store_stock, 0), NEW.quantity;
        END IF;

        UPDATE product_store_stocks
        SET stock = stock - NEW.quantity
        WHERE product_id = NEW.product_id AND store_id = target_store_id;
    END IF;

    UPDATE products
    SET stock = stock - NEW.quantity
    WHERE id = NEW.product_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sale_item_inserted
AFTER INSERT ON sale_items
FOR EACH ROW EXECUTE FUNCTION fn_handle_sale_item_insert();

-- B. On Delete Sale Item: Return stock
CREATE OR REPLACE FUNCTION fn_handle_sale_item_delete()
RETURNS TRIGGER AS $$
DECLARE
    target_store_id UUID;
BEGIN
    SELECT store_id INTO target_store_id FROM sales WHERE id = OLD.sale_id;
    
    IF target_store_id IS NOT NULL THEN
        INSERT INTO product_store_stocks (product_id, store_id, stock)
        VALUES (OLD.product_id, target_store_id, OLD.quantity)
        ON CONFLICT (product_id, store_id)
        DO UPDATE SET stock = product_store_stocks.stock + OLD.quantity;
    END IF;

    UPDATE products
    SET stock = stock + OLD.quantity
    WHERE id = OLD.product_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sale_item_deleted
AFTER DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION fn_handle_sale_item_delete();

-- C. On Update Sale Item: Adjust stock difference and validate
CREATE OR REPLACE FUNCTION fn_handle_sale_item_update()
RETURNS TRIGGER AS $$
DECLARE
    old_store_id UUID;
    new_store_id UUID;
    current_store_stock INTEGER;
    current_global_stock INTEGER;
    product_name TEXT;
    stock_diff INTEGER;
BEGIN
    SELECT store_id INTO old_store_id FROM sales WHERE id = OLD.sale_id;
    SELECT store_id INTO new_store_id FROM sales WHERE id = NEW.sale_id;
    SELECT name INTO product_name FROM products WHERE id = NEW.product_id;
    
    stock_diff := NEW.quantity - OLD.quantity;
    
    -- If product is changed
    IF OLD.product_id <> NEW.product_id THEN
        -- 1. Check stock of new product (global & new store)
        SELECT stock INTO current_global_stock FROM products WHERE id = NEW.product_id;
        IF current_global_stock < NEW.quantity THEN
            RAISE EXCEPTION 'Insufficient global stock for new product %. Available: %, Requested: %.', 
                product_name, current_global_stock, NEW.quantity;
        END IF;

        IF new_store_id IS NOT NULL THEN
            SELECT stock INTO current_store_stock FROM product_store_stocks 
            WHERE product_id = NEW.product_id AND store_id = new_store_id;
            
            IF current_store_stock IS NULL OR current_store_stock < NEW.quantity THEN
                RAISE EXCEPTION 'Insufficient stock in store % for new product %. Available: %, Requested: %.', 
                    (SELECT name FROM stores WHERE id = new_store_id),
                    product_name, COALESCE(current_store_stock, 0), NEW.quantity;
            END IF;
            
            UPDATE product_store_stocks SET stock = stock - NEW.quantity WHERE product_id = NEW.product_id AND store_id = new_store_id;
        END IF;
        
        UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;

        -- 2. Return stock to old product (global & old store)
        IF old_store_id IS NOT NULL THEN
            INSERT INTO product_store_stocks (product_id, store_id, stock)
            VALUES (OLD.product_id, old_store_id, OLD.quantity)
            ON CONFLICT (product_id, store_id)
            DO UPDATE SET stock = product_store_stocks.stock + OLD.quantity;
        END IF;
        
        UPDATE products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;

    -- Same product, but store or quantity (or both) changed
    ELSE
        -- Global stock diff check
        IF stock_diff > 0 THEN
            SELECT stock INTO current_global_stock FROM products WHERE id = NEW.product_id;
            IF current_global_stock < stock_diff THEN
                RAISE EXCEPTION 'Insufficient global stock for product %. Available: %, Additional: %.', 
                    product_name, current_global_stock, stock_diff;
            END IF;
        END IF;

        -- Handle store change
        IF old_store_id <> new_store_id THEN
            -- Check stock in new store for the full NEW quantity
            IF new_store_id IS NOT NULL THEN
                SELECT stock INTO current_store_stock FROM product_store_stocks 
                WHERE product_id = NEW.product_id AND store_id = new_store_id;
                
                IF current_store_stock IS NULL OR current_store_stock < NEW.quantity THEN
                    RAISE EXCEPTION 'Insufficient stock in target store % for product %. Available: %, Requested: %.', 
                        (SELECT name FROM stores WHERE id = new_store_id),
                        product_name, COALESCE(current_store_stock, 0), NEW.quantity;
                END IF;
                
                UPDATE product_store_stocks SET stock = stock - NEW.quantity WHERE product_id = NEW.product_id AND store_id = new_store_id;
            END IF;

            -- Return old quantity to old store
            IF old_store_id IS NOT NULL THEN
                INSERT INTO product_store_stocks (product_id, store_id, stock)
                VALUES (OLD.product_id, old_store_id, OLD.quantity)
                ON CONFLICT (product_id, store_id)
                DO UPDATE SET stock = product_store_stocks.stock + OLD.quantity;
            END IF;
        ELSE
            -- Normal quantity adjustment in same store
            IF new_store_id IS NOT NULL THEN
                -- If buying more (stock_diff > 0), check store stock
                IF stock_diff > 0 THEN
                    SELECT stock INTO current_store_stock FROM product_store_stocks 
                    WHERE product_id = NEW.product_id AND store_id = new_store_id;
                    
                    IF current_store_stock IS NULL OR current_store_stock < stock_diff THEN
                        RAISE EXCEPTION 'Insufficient stock in store % for product %. Available: %, Additional: %.', 
                            (SELECT name FROM stores WHERE id = new_store_id),
                            product_name, COALESCE(current_store_stock, 0), stock_diff;
                    END IF;
                END IF;

                UPDATE product_store_stocks
                SET stock = stock - stock_diff
                WHERE product_id = NEW.product_id AND store_id = new_store_id;
            END IF;
        END IF;

        -- Update global stock
        UPDATE products SET stock = stock - stock_diff WHERE id = NEW.product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_sale_item_updated
AFTER UPDATE ON sale_items
FOR EACH ROW EXECUTE FUNCTION fn_handle_sale_item_update();

-- --- PROFILES AUTO-POPULATE TRIGGER ---
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'staff')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed existing auth.users into profiles if they don't exist
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', email), 
    COALESCE(raw_user_meta_data->>'role', 'staff')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Explicitly ensure dhruveshborad007@gmail.com has the admin role
UPDATE public.profiles 
SET role = 'admin' 
WHERE email = 'dhruveshborad007@gmail.com';

-- -------------------------------------------------------------
-- Row Level Security (RLS) & Policies
-- -------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_store_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create Policies for Authenticated Users (Read & Write Access)
CREATE POLICY "Allow authenticated users all operations on products" 
ON products TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on customers" 
ON customers TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on suppliers" 
ON suppliers TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on purchases" 
ON purchases TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on purchase_items" 
ON purchase_items TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on sales" 
ON sales TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on sale_items" 
ON sale_items TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on stores" 
ON stores TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on product_store_stocks" 
ON product_store_stocks TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated users all operations on attendance" 
ON attendance TO authenticated USING (true) WITH CHECK (true);

-- Profiles Policies
CREATE POLICY "Allow all authenticated users to read profiles" 
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow admins to update user roles" 
ON profiles FOR UPDATE TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
) 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Tasks Policies
CREATE POLICY "Allow users to read assigned or created tasks"
ON tasks FOR SELECT TO authenticated
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Allow admins/managers to create tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
);

CREATE POLICY "Allow users to update task status or details"
ON tasks FOR UPDATE TO authenticated
USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

CREATE POLICY "Allow task creators to delete tasks"
ON tasks FOR DELETE TO authenticated
USING (assigned_by = auth.uid());


-- -------------------------------------------------------------
-- Seed Mock Data (Optional, for testing)
-- -------------------------------------------------------------

-- Seed Stores
INSERT INTO stores (id, name, location, created_at) VALUES
('f1111111-1111-1111-1111-111111111111', 'Main Warehouse', 'Logistics Park, CA', NOW() - INTERVAL '50 days'),
('f2222222-2222-2222-2222-222222222222', 'Downtown Outlet', '456 Commerce St, NY', NOW() - INTERVAL '48 days');

-- Seed Products (Stock initialized to 0; triggers will increment/decrement it during purchases/sales)
INSERT INTO products (id, name, sku, category, purchase_price, selling_price, stock, min_stock, description, created_at) VALUES
('d1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'MacBook Pro 14" M3', 'MBP-14-M3', 'Electronics', 1350.00, 1599.00, 0, 5, 'Apple MacBook Pro with M3 Chip, 16GB RAM, 512GB SSD', NOW() - INTERVAL '30 days'),
('d2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Wireless Magic Mouse', 'MM-WIRELESS', 'Accessories', 55.00, 79.00, 0, 10, 'Rechargeable wireless mouse with multi-touch surface', NOW() - INTERVAL '25 days'),
('d3a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Dell UltraSharp 27" Monitor', 'DELL-U2723QE', 'Electronics', 320.00, 499.00, 0, 4, '4K USB-C Hub Monitor with IPS Black technology', NOW() - INTERVAL '20 days'),
('d4a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Ergonomic Office Chair', 'CHAIR-ERGO', 'Furniture', 180.00, 299.00, 0, 5, 'High-back mesh chair with adjustable lumbar support', NOW() - INTERVAL '15 days'),
('d5a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'USB-C Docking Station', 'DOCK-11IN1', 'Accessories', 40.00, 89.00, 0, 8, '11-in-1 Triple Display USB-C Adapter with Power Delivery', NOW() - INTERVAL '10 days');

-- Seed Customers
INSERT INTO customers (id, name, phone, email, address, created_at) VALUES
('c1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Acme Corporation', '+1 (555) 019-2834', 'billing@acme.com', '102 Industrial Parkway, Tech City, CA', NOW() - INTERVAL '40 days'),
('c2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Johnathan Doe', '+1 (555) 014-9988', 'john.doe@gmail.com', '456 Oak Avenue, Metropolis, NY', NOW() - INTERVAL '28 days'),
('c3a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Sarah Connor', '+1 (555) 017-1122', 'sconnor@cyberdyne.io', '742 Evergreen Terrace, Springfield, OR', NOW() - INTERVAL '12 days');

-- Seed Suppliers
INSERT INTO suppliers (id, name, phone, email, address, created_at) VALUES
('e1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Global Tech Distributors', '+1 (800) 555-0100', 'sales@globaltech.com', '100 Distribution Way, Logistics Hub, TX', NOW() - INTERVAL '50 days'),
('e2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'Office Depot & Supplies Inc.', '+1 (800) 555-0155', 'bulkorders@officedepot.com', '500 Commerce Boulevard, Miami, FL', NOW() - INTERVAL '45 days');

-- Seed Purchases (Creates sourcing logs, triggers will increment product stock)
INSERT INTO purchases (id, supplier_id, store_id, total_amount, purchase_date, created_at) VALUES
('a1111111-1111-1111-1111-111111111111', 'e1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f1111111-1111-1111-1111-111111111111', 15650.00, (CURRENT_DATE - INTERVAL '25 days')::date, NOW() - INTERVAL '25 days'),
('a2222222-2222-2222-2222-222222222222', 'e2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f2222222-2222-2222-2222-222222222222', 1420.00, (CURRENT_DATE - INTERVAL '10 days')::date, NOW() - INTERVAL '10 days');

-- Seed Purchase Items ( Triggers will run: MBP gets +10 stock, Dell U27 gets +5 stock, Magic Mouse gets +10 stock in Warehouse & +20 in Outlet, USB-C Dock gets +8 stock)
INSERT INTO purchase_items (id, purchase_id, product_id, quantity, unit_price) VALUES
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 10, 1350.00), -- 10 MBP
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'd3a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 5, 320.00),  -- 5 Dell Mon
(gen_random_uuid(), 'a1111111-1111-1111-1111-111111111111', 'd2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 10, 55.00),   -- 10 Magic Mouse at Warehouse
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'd2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 20, 55.00),  -- 20 Magic Mouse
(gen_random_uuid(), 'a2222222-2222-2222-2222-222222222222', 'd5a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 8, 40.00);   -- 8 USB-C Dock

-- Seed Sales (Creates invoices logs, triggers will decrement product stock)
INSERT INTO sales (id, customer_id, store_id, invoice_no, subtotal, discount, tax, grand_total, sale_date, created_at) VALUES
('b1111111-1111-1111-1111-111111111111', 'c1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f1111111-1111-1111-1111-111111111111', 'INV-2026-0001', 3697.00, 100.00, 287.76, 3884.76, (CURRENT_DATE - INTERVAL '18 days')::date, NOW() - INTERVAL '18 days'),
('b2222222-2222-2222-2222-222222222222', 'c2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f1111111-1111-1111-1111-111111111111', 'INV-2026-0002', 1678.00, 0.00, 134.24, 1812.24, (CURRENT_DATE - INTERVAL '5 days')::date, NOW() - INTERVAL '5 days'),
('b3333333-3333-3333-3333-333333333333', 'c3a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'f2222222-2222-2222-2222-222222222222', 'INV-2026-0003', 445.00, 0.00, 35.60, 480.60, (CURRENT_DATE - INTERVAL '2 days')::date, NOW() - INTERVAL '2 days');

-- Seed Sale Items (Triggers will run: MBP: 10 - 2 - 1 = 7 stock, Dell Mon: 5 - 1 = 4 stock, Magic Mouse: 20 - 1 = 19 stock, USB-C Dock: 8 - 5 = 3 stock)
INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price) VALUES
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'd1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 2, 1599.00), -- 2 MBP
(gen_random_uuid(), 'b1111111-1111-1111-1111-111111111111', 'd3a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 1, 499.00),  -- 1 Dell Mon
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'd2a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 1, 79.00),   -- 1 Magic Mouse
(gen_random_uuid(), 'b2222222-2222-2222-2222-222222222222', 'd1a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 1, 1599.00), -- 1 MBP
(gen_random_uuid(), 'b3333333-3333-3333-3333-333333333333', 'd5a2b3c4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 5, 89.00);   -- 5 USB-C Dock



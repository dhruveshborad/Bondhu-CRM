import { supabase, isDemoMode } from '@/lib/supabase'
import type { Product } from '@/types'
import { getLocalItems, setLocalItems, getStoreStock } from './localDb'

export const productsService = {
  async getAll(storeId?: string): Promise<Product[]> {
    if (isDemoMode) {
      const products = getLocalItems<Product>('erp_products');
      if (storeId) {
        return products.map(p => ({
          ...p,
          stock: getStoreStock(p.id, storeId)
        }));
      }
      return products;
    }

    if (storeId) {
      const { data: products, error: pErr } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });
      if (pErr) throw pErr;

      const { data: stocks, error: sErr } = await supabase
        .from('product_store_stocks')
        .select('*')
        .eq('store_id', storeId);
      if (sErr) throw sErr;

      return (products || []).map((p: any) => {
        const match = (stocks || []).find((s: any) => s.product_id === p.id);
        return {
          ...p,
          stock: match ? match.stock : 0
        };
      });
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string, storeId?: string): Promise<Product | null> {
    if (isDemoMode) {
      const products = getLocalItems<Product>('erp_products');
      const p = products.find((prod) => prod.id === id) || null;
      if (p && storeId) {
        return { ...p, stock: getStoreStock(p.id, storeId) };
      }
      return p;
    }

    if (storeId) {
      const { data: product, error: pErr } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (pErr) throw pErr;
      if (!product) return null;

      const { data: stockRecord, error: sErr } = await supabase
        .from('product_store_stocks')
        .select('*')
        .eq('product_id', id)
        .eq('store_id', storeId)
        .maybeSingle();
      if (sErr) throw sErr;

      return {
        ...product,
        stock: stockRecord ? stockRecord.stock : 0
      };
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(product: Omit<Product, 'id' | 'created_at'>): Promise<Product> {
    if (isDemoMode) {
      const products = getLocalItems<Product>('erp_products');
      
      // SKU uniqueness check
      if (products.some((p) => p.sku.toLowerCase() === product.sku.toLowerCase())) {
        throw new Error(`A product with SKU "${product.sku}" already exists.`);
      }

      const newProduct: Product = {
        ...product,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString()
      };

      products.push(newProduct);
      setLocalItems('erp_products', products);
      return newProduct;
    }

    // Supabase insert
    const { data, error } = await supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation in PG
        throw new Error(`A product with SKU "${product.sku}" already exists.`);
      }
      throw error;
    }
    return data;
  },

  async update(id: string, product: Partial<Omit<Product, 'id' | 'created_at'>>): Promise<Product> {
    if (isDemoMode) {
      const products = getLocalItems<Product>('erp_products');
      const idx = products.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Product not found');

      // SKU uniqueness check
      if (product.sku && products.some((p) => p.id !== id && p.sku.toLowerCase() === product.sku!.toLowerCase())) {
        throw new Error(`A product with SKU "${product.sku}" already exists.`);
      }

      const updatedProduct = {
        ...products[idx],
        ...product
      };

      products[idx] = updatedProduct;
      setLocalItems('erp_products', products);
      return updatedProduct;
    }

    const { data, error } = await supabase
      .from('products')
      .update(product)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error(`A product with SKU "${product.sku}" already exists.`);
      }
      throw error;
    }
    return data;
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode) {
      // Check if product is referenced in purchases or sales
      const purchases = getLocalItems<any>('erp_purchases');
      const hasPurchases = purchases.some((p: any) => 
        p.items?.some((item: any) => item.product_id === id)
      );

      const sales = getLocalItems<any>('erp_sales');
      const hasSales = sales.some((s: any) => 
        s.items?.some((item: any) => item.product_id === id)
      );

      if (hasPurchases || hasSales) {
        throw new Error('Cannot delete product because it has transaction history. Try adjusting stock to 0 instead.');
      }

      const products = getLocalItems<Product>('erp_products');
      const filtered = products.filter((p) => p.id !== id);
      setLocalItems('erp_products', filtered);
      return;
    }

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') { // Foreign key constraint violation in PG
        throw new Error('Cannot delete product because it has purchase or sale transaction history.');
      }
      throw error;
    }
  }
};

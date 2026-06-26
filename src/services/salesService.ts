import { supabase, isDemoMode } from '@/lib/supabase'
import type { Sale, SaleItem, Product } from '@/types'
import { getLocalItems, setLocalItems, getStoreStock, updateStoreStock } from './localDb'
import { productsService } from './productsService'
import { customersService } from './customersService'

export const salesService = {
  async getAll(storeId?: string): Promise<Sale[]> {
    if (isDemoMode) {
      let sales = getLocalItems<Sale>('erp_sales');
      if (storeId) {
        sales = sales.filter((s: any) => s.store_id === storeId);
      }
      const customers = await customersService.getAll();
      const products = await productsService.getAll(storeId);

      // Hydrate customer and products
      return sales.map((sale) => {
        const customerObj = customers.find((c) => c.id === sale.customer_id);
        const hydratedItems = sale.items?.map((item) => {
          const productObj = products.find((p) => p.id === item.product_id);
          return { ...item, product: productObj };
        });

        return {
          ...sale,
          customer: customerObj,
          items: hydratedItems
        };
      }).sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
    }

    let query = supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        items:sale_items(
          *,
          product:products(*)
        )
      `);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query.order('sale_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getNextInvoiceNo(): Promise<string> {
    if (isDemoMode) {
      const sales = getLocalItems<Sale>('erp_sales');
      const count = sales.length + 1;
      const year = new Date().getFullYear();
      return `INV-${year}-${String(count).padStart(4, '0')}`;
    }

    const { data, error } = await supabase
      .from('sales')
      .select('invoice_no')
      .order('created_at', { ascending: false })
      .limit(1);

    const year = new Date().getFullYear();
    if (error || !data || data.length === 0) {
      return `INV-${year}-0001`;
    }

    // Parse last invoice number e.g., INV-2026-0012 -> 0012 -> 13
    const lastInvoice = data[0].invoice_no;
    const parts = lastInvoice.split('-');
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 10) + 1;
      return `INV-${year}-${String(seq).padStart(4, '0')}`;
    }
    return `INV-${year}-${Math.floor(Math.random() * 9000 + 1000)}`;
  },

  async create(
    sale: Omit<Sale, 'id' | 'created_at' | 'invoice_no' | 'subtotal' | 'grand_total'>,
    items: Omit<SaleItem, 'id' | 'sale_id'>[]
  ): Promise<Sale> {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const grandTotal = Math.max(0, subtotal - sale.discount + sale.tax);
    const invoiceNo = await this.getNextInvoiceNo();

    if (isDemoMode) {
      const sales = getLocalItems<Sale>('erp_sales');
      const products = getLocalItems<Product>('erp_products');

      const saleId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);

      // 1. Validate stock availability and adjust stock (trigger simulation)
      const saleItems: SaleItem[] = [];

      for (const item of items) {
        const pIdx = products.findIndex((p) => p.id === item.product_id);
        if (pIdx === -1) {
          throw new Error(`Product not found.`);
        }

        const product = products[pIdx];
        const storeId = sale.store_id;
        const availableStock = storeId ? getStoreStock(product.id, storeId) : product.stock;

        if (availableStock < item.quantity) {
          throw new Error(`Insufficient stock for product "${product.name}". Available: ${availableStock}, Requested: ${item.quantity}.`);
        }

        // Deduct stock
        if (storeId) {
          updateStoreStock(item.product_id, storeId, -item.quantity);
        } else {
          products[pIdx].stock -= item.quantity;
        }

        const itemId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        saleItems.push({
          id: itemId,
          sale_id: saleId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        });
      }

      // Save updated products stock (only if no store_id - updateStoreStock already saved it)
      if (!sale.store_id) {
        setLocalItems('erp_products', products);
      }

      // 2. Save sales record
      const newSale: Sale = {
        ...sale,
        id: saleId,
        invoice_no: invoiceNo,
        subtotal,
        grand_total: grandTotal,
        created_at: new Date().toISOString(),
        items: saleItems
      };

      sales.push(newSale);
      setLocalItems('erp_sales', sales);
      return newSale;
    }

    // SUPABASE MODE:
    // Pre-validate stock on the frontend to avoid unnecessary inserts
    const storeId = sale.store_id;
    if (storeId) {
      const { data: storeStocks, error: stockErr } = await supabase
        .from('product_store_stocks')
        .select('product_id, stock')
        .eq('store_id', storeId)
        .in('product_id', items.map(item => item.product_id));

      if (!stockErr && storeStocks) {
        const { data: currentProducts } = await supabase
          .from('products')
          .select('id, name')
          .in('id', items.map(item => item.product_id));

        for (const item of items) {
          const match = storeStocks.find(s => s.product_id === item.product_id);
          const available = match ? match.stock : 0;
          if (available < item.quantity) {
            const pName = currentProducts?.find(p => p.id === item.product_id)?.name || 'Unknown Product';
            throw new Error(`Insufficient stock for product "${pName}". Available: ${available}, Requested: ${item.quantity}.`);
          }
        }
      }
    } else {
      const { data: currentProducts, error: prodError } = await supabase
        .from('products')
        .select('id, name, stock')
        .in('id', items.map(item => item.product_id));

      if (!prodError && currentProducts) {
        for (const item of items) {
          const prod = currentProducts.find(p => p.id === item.product_id);
          if (prod && prod.stock < item.quantity) {
            throw new Error(`Insufficient stock for product "${prod.name}". Available: ${prod.stock}, Requested: ${item.quantity}.`);
          }
        }
      }
    }

    // 1. Insert Sales Header
    const { data: saleData, error: saleError } = await supabase
      .from('sales')
      .insert([{
        customer_id: sale.customer_id,
        store_id: storeId || null,
        invoice_no: invoiceNo,
        subtotal,
        discount: sale.discount,
        tax: sale.tax,
        grand_total: grandTotal,
        sale_date: sale.sale_date
      }])
      .select()
      .single();

    if (saleError) throw saleError;

    // 2. Insert Sale Items (The database trigger will automatically validate stock levels and deduct)
    const itemsToInsert = items.map(item => ({
      sale_id: saleData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Rollback header since items failed
      await supabase.from('sales').delete().eq('id', saleData.id);
      
      // Check if it's a trigger exception from database
      if (itemsError.message?.includes('Insufficient stock')) {
        throw new Error(itemsError.message);
      }
      throw itemsError;
    }

    return saleData;
  }
};

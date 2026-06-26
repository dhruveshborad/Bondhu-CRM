import { supabase, isDemoMode } from '@/lib/supabase'
import type { Purchase, PurchaseItem } from '@/types'
import { getLocalItems, setLocalItems, updateStoreStock } from './localDb'
import { productsService } from './productsService'
import { suppliersService } from './suppliersService'

export const purchasesService = {
  async getAll(storeId?: string): Promise<Purchase[]> {
    if (isDemoMode) {
      let purchases = getLocalItems<Purchase>('erp_purchases');
      if (storeId) {
        purchases = purchases.filter((p: any) => p.store_id === storeId);
      }
      const suppliers = await suppliersService.getAll();
      const products = await productsService.getAll();

      // Hydrate supplier and products into purchase
      return purchases.map((purchase) => {
        const supplierObj = suppliers.find((s) => s.id === purchase.supplier_id);
        const hydratedItems = purchase.items?.map((item) => {
          const productObj = products.find((p) => p.id === item.product_id);
          return { ...item, product: productObj };
        });

        return {
          ...purchase,
          supplier: supplierObj,
          items: hydratedItems
        };
      }).sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime());
    }

    let query = supabase
      .from('purchases')
      .select(`
        *,
        supplier:suppliers(*),
        items:purchase_items(
          *,
          product:products(*)
        )
      `);
    
    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query.order('purchase_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(
    purchase: Omit<Purchase, 'id' | 'created_at' | 'total_amount'>,
    items: Omit<PurchaseItem, 'id' | 'purchase_id'>[]
  ): Promise<Purchase> {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

    if (isDemoMode) {
      const purchases = getLocalItems<Purchase>('erp_purchases');
      const purchaseId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);

      // 1. Process items and update product store stock (trigger simulation)
      const purchaseItems: PurchaseItem[] = items.map((item) => {
        const itemId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
        
        // Update product store stock level
        if ((purchase as any).store_id) {
          updateStoreStock(item.product_id, (purchase as any).store_id, item.quantity);
        }

        return {
          id: itemId,
          purchase_id: purchaseId,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        };
      });

      // 2. Save purchase log
      const newPurchase: Purchase = {
        ...purchase,
        id: purchaseId,
        total_amount: totalAmount,
        created_at: new Date().toISOString(),
        items: purchaseItems
      };

      purchases.push(newPurchase);
      setLocalItems('erp_purchases', purchases);
      return newPurchase;
    }

    // SUPABASE MODE:
    // 1. Insert Purchase
    const { data: purchaseData, error: purchaseError } = await supabase
      .from('purchases')
      .insert([{
        supplier_id: purchase.supplier_id,
        store_id: (purchase as any).store_id || null,
        purchase_date: purchase.purchase_date,
        total_amount: totalAmount
      }])
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 2. Insert Purchase Items (The database trigger will automatically increment product store stock)
    const itemsToInsert = items.map(item => ({
      purchase_id: purchaseData.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('purchase_items')
      .insert(itemsToInsert);

    if (itemsError) {
      // Rollback (delete purchase) since we don't have transaction helper in standard js client easily
      await supabase.from('purchases').delete().eq('id', purchaseData.id);
      throw itemsError;
    }

    return purchaseData;
  }
};

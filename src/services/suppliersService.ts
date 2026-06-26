import { supabase, isDemoMode } from '@/lib/supabase'
import type { Supplier } from '@/types'
import { getLocalItems, setLocalItems } from './localDb'

export const suppliersService = {
  async getAll(): Promise<Supplier[]> {
    if (isDemoMode) {
      return getLocalItems<Supplier>('erp_suppliers');
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Supplier | null> {
    if (isDemoMode) {
      const suppliers = getLocalItems<Supplier>('erp_suppliers');
      return suppliers.find((s) => s.id === id) || null;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(supplier: Omit<Supplier, 'id' | 'created_at'>): Promise<Supplier> {
    if (isDemoMode) {
      const suppliers = getLocalItems<Supplier>('erp_suppliers');
      
      const newSupplier: Supplier = {
        ...supplier,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString()
      };

      suppliers.push(newSupplier);
      setLocalItems('erp_suppliers', suppliers);
      return newSupplier;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, supplier: Partial<Omit<Supplier, 'id' | 'created_at'>>): Promise<Supplier> {
    if (isDemoMode) {
      const suppliers = getLocalItems<Supplier>('erp_suppliers');
      const idx = suppliers.findIndex((s) => s.id === id);
      if (idx === -1) throw new Error('Supplier not found');

      const updatedSupplier = {
        ...suppliers[idx],
        ...supplier
      };

      suppliers[idx] = updatedSupplier;
      setLocalItems('erp_suppliers', suppliers);
      return updatedSupplier;
    }

    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode) {
      // Check if supplier is referenced in purchases
      const purchases = getLocalItems<any>('erp_purchases');
      if (purchases.some((p: any) => p.supplier_id === id)) {
        throw new Error('Cannot delete supplier because they have transaction history.');
      }

      const suppliers = getLocalItems<Supplier>('erp_suppliers');
      const filtered = suppliers.filter((s) => s.id !== id);
      setLocalItems('erp_suppliers', filtered);
      return;
    }

    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Cannot delete supplier because they are linked to purchase order history.');
      }
      throw error;
    }
  }
};

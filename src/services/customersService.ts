import { supabase, isDemoMode } from '@/lib/supabase'
import type { Customer } from '@/types'
import { getLocalItems, setLocalItems } from './localDb'

export const customersService = {
  async getAll(): Promise<Customer[]> {
    if (isDemoMode) {
      return getLocalItems<Customer>('erp_customers');
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getById(id: string): Promise<Customer | null> {
    if (isDemoMode) {
      const customers = getLocalItems<Customer>('erp_customers');
      return customers.find((c) => c.id === id) || null;
    }

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async create(customer: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> {
    if (isDemoMode) {
      const customers = getLocalItems<Customer>('erp_customers');
      
      const newCustomer: Customer = {
        ...customer,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        created_at: new Date().toISOString()
      };

      customers.push(newCustomer);
      setLocalItems('erp_customers', customers);
      return newCustomer;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id: string, customer: Partial<Omit<Customer, 'id' | 'created_at'>>): Promise<Customer> {
    if (isDemoMode) {
      const customers = getLocalItems<Customer>('erp_customers');
      const idx = customers.findIndex((c) => c.id === id);
      if (idx === -1) throw new Error('Customer not found');

      const updatedCustomer = {
        ...customers[idx],
        ...customer
      };

      customers[idx] = updatedCustomer;
      setLocalItems('erp_customers', customers);
      return updatedCustomer;
    }

    const { data, error } = await supabase
      .from('customers')
      .update(customer)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode) {
      // Check if customer is referenced in sales
      const sales = getLocalItems<any>('erp_sales');
      if (sales.some((s: any) => s.customer_id === id)) {
        throw new Error('Cannot delete customer because they have purchase/sales transaction history.');
      }

      const customers = getLocalItems<Customer>('erp_customers');
      const filtered = customers.filter((c) => c.id !== id);
      setLocalItems('erp_customers', filtered);
      return;
    }

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      if (error.code === '23503') {
        throw new Error('Cannot delete customer because they are linked to invoice sales history.');
      }
      throw error;
    }
  }
};

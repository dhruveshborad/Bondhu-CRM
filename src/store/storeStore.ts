import { create } from 'zustand'
import { supabase, isDemoMode } from '@/lib/supabase'
import type { Store } from '@/types'
import { getLocalItems, setLocalItems } from '@/services/localDb'

interface StoreState {
  stores: Store[];
  activeStoreId: string | null;
  loading: boolean;
  error: string | null;
  fetchStores: () => Promise<Store[]>;
  setActiveStoreId: (id: string) => void;
  createStore: (name: string, location?: string) => Promise<Store>;
}

export const useStoreStore = create<StoreState>((set, get) => ({
  stores: [],
  activeStoreId: localStorage.getItem('erp_active_store_id'),
  loading: false,
  error: null,

  fetchStores: async () => {
    set({ loading: true, error: null })
    if (isDemoMode) {
      const storesList = getLocalItems<Store>('erp_stores')
      
      // Default fallback if no stores exist
      if (storesList.length === 0) {
        const defaultStores: Store[] = [
          { id: 'f1111111-1111-1111-1111-111111111111', name: 'Main Warehouse', location: 'Logistics Park, CA', created_at: new Date().toISOString() },
          { id: 'f2222222-2222-2222-2222-222222222222', name: 'Downtown Outlet', location: '456 Commerce St, NY', created_at: new Date().toISOString() }
        ]
        setLocalItems('erp_stores', defaultStores)
        storesList.push(...defaultStores)
      }

      let activeId = get().activeStoreId
      if (!activeId || !storesList.some(s => s.id === activeId)) {
        activeId = storesList[0].id
        localStorage.setItem('erp_active_store_id', activeId)
      }

      set({ stores: storesList, activeStoreId: activeId, loading: false })
      return storesList
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error

      const storesList = data || []
      let activeId = get().activeStoreId

      if (storesList.length > 0) {
        if (!activeId || !storesList.some(s => s.id === activeId)) {
          activeId = storesList[0].id
          localStorage.setItem('erp_active_store_id', activeId as string)
        }
      } else {
        activeId = null
      }

      set({ stores: storesList, activeStoreId: activeId, loading: false })
      return storesList
    } catch (err: any) {
      set({ error: err.message, loading: false })
      return []
    }
  },

  setActiveStoreId: (id: string) => {
    localStorage.setItem('erp_active_store_id', id)
    set({ activeStoreId: id })
  },

  createStore: async (name, location = '') => {
    set({ loading: true, error: null })
    if (isDemoMode) {
      const storesList = getLocalItems<Store>('erp_stores')
      const newStore: Store = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        name,
        location: location || null,
        created_at: new Date().toISOString()
      }
      storesList.push(newStore)
      setLocalItems('erp_stores', storesList)
      
      set({ stores: storesList, loading: false })
      return newStore
    }

    try {
      const { data, error } = await supabase
        .from('stores')
        .insert([{ name, location: location || null }])
        .select()
        .single()

      if (error) throw error

      const storesList = [...get().stores, data]
      set({ stores: storesList, loading: false })
      return data
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  }
}))

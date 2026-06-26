import { create } from 'zustand'
import { supabase, isDemoMode } from '@/lib/supabase'
import type { Attendance } from '@/types'
import { getLocalItems, setLocalItems } from '@/services/localDb'
import { useAuthStore } from './authStore'

interface AttendanceState {
  currentSession: Attendance | null;
  logs: Attendance[];
  allLogs: Attendance[];
  loading: boolean;
  error: string | null;
  clockIn: (storeId: string) => Promise<Attendance>;
  clockOut: () => Promise<Attendance>;
  fetchUserLogs: () => Promise<Attendance[]>;
  fetchAllLogs: () => Promise<Attendance[]>;
  checkActiveSession: () => Promise<Attendance | null>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  currentSession: null,
  logs: [],
  allLogs: [],
  loading: false,
  error: null,

  checkActiveSession: async () => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return null

    set({ loading: true, error: null })

    if (isDemoMode) {
      const allAtt = getLocalItems<Attendance>('erp_attendance')
      const active = allAtt.find(a => a.user_id === currentUser.id && a.clock_out === null) || null
      set({ currentSession: active, loading: false })
      return active
    }

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, store:stores(*)')
        .eq('user_id', currentUser.id)
        .is('clock_out', null)
        .maybeSingle()

      if (error) throw error

      set({ currentSession: data, loading: false })
      return data
    } catch (err: any) {
      set({ error: err.message, loading: false })
      return null
    }
  },

  clockIn: async (storeId: string) => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) throw new Error('User not authenticated')

    set({ loading: true, error: null })

    const clockInTime = new Date().toISOString()
    const today = clockInTime.split('T')[0]

    if (isDemoMode) {
      const allAtt = getLocalItems<Attendance>('erp_attendance')
      
      // Ensure they aren't already clocked in
      const existing = allAtt.find(a => a.user_id === currentUser.id && a.clock_out === null)
      if (existing) throw new Error('You are already clocked in.')

      // Fetch store name
      const stores = getLocalItems<any>('erp_stores')
      const targetStore = stores.find((s: any) => s.id === storeId)

      const newSession: Attendance = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        user_id: currentUser.id,
        store_id: storeId,
        store: targetStore || null,
        date: today,
        clock_in: clockInTime,
        clock_out: null,
        created_at: clockInTime,
        user_name: currentUser.full_name
      }

      allAtt.push(newSession)
      setLocalItems('erp_attendance', allAtt)
      set({ currentSession: newSession, loading: false })
      return newSession
    }

    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert([{
          user_id: currentUser.id,
          store_id: storeId,
          clock_in: clockInTime,
          date: today
        }])
        .select('*, store:stores(*)')
        .single()

      if (error) throw error

      const sessionWithMeta: Attendance = {
        ...data,
        user_name: currentUser.full_name
      }

      set({ currentSession: sessionWithMeta, loading: false })
      return sessionWithMeta
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  clockOut: async () => {
    const session = get().currentSession
    if (!session) throw new Error('No active clock-in session found.')

    set({ loading: true, error: null })
    const clockOutTime = new Date().toISOString()

    if (isDemoMode) {
      const allAtt = getLocalItems<Attendance>('erp_attendance')
      const idx = allAtt.findIndex(a => a.id === session.id)
      if (idx === -1) throw new Error('Clock-in record not found.')

      const updated = {
        ...allAtt[idx],
        clock_out: clockOutTime
      }
      allAtt[idx] = updated
      setLocalItems('erp_attendance', allAtt)
      set({ currentSession: null, loading: false })
      return updated
    }

    try {
      const { data, error } = await supabase
        .from('attendance')
        .update({ clock_out: clockOutTime })
        .eq('id', session.id)
        .select('*, store:stores(*)')
        .single()

      if (error) throw error

      set({ currentSession: null, loading: false })
      return data
    } catch (err: any) {
      set({ error: err.message, loading: false })
      throw err
    }
  },

  fetchUserLogs: async () => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser) return []

    set({ loading: true, error: null })

    if (isDemoMode) {
      const allAtt = getLocalItems<Attendance>('erp_attendance')
      const userLogs = allAtt
        .filter(a => a.user_id === currentUser.id)
        .sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())
      set({ logs: userLogs, loading: false })
      return userLogs
    }

    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, store:stores(*)')
        .eq('user_id', currentUser.id)
        .order('clock_in', { ascending: false })

      if (error) throw error
      set({ logs: data || [], loading: false })
      return data || []
    } catch (err: any) {
      set({ error: err.message, loading: false })
      return []
    }
  },

  fetchAllLogs: async () => {
    set({ loading: true, error: null })

    if (isDemoMode) {
      const allAtt = getLocalItems<Attendance>('erp_attendance')
      const sorted = allAtt.sort((a, b) => new Date(b.clock_in).getTime() - new Date(a.clock_in).getTime())
      set({ allLogs: sorted, loading: false })
      return sorted
    }

    try {
      // In Supabase Connected Mode, we fetch all attendance joined with profiles
      const { data, error } = await supabase
        .from('attendance')
        .select('*, store:stores(*), profiles(full_name)')
        .order('clock_in', { ascending: false })

      if (error) throw error

      const mapped = (data || []).map((item: any) => ({
        ...item,
        user_name: item.profiles?.full_name || 'ERP Employee'
      }))

      set({ allLogs: mapped, loading: false })
      return mapped
    } catch (err: any) {
      set({ error: err.message, loading: false })
      return []
    }
  }
}))

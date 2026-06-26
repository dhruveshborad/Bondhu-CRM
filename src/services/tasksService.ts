import { supabase, isDemoMode } from '@/lib/supabase'
import type { Task, Profile } from '@/types'
import { getLocalItems, setLocalItems } from './localDb'
import { useAuthStore } from '@/store/authStore'

export const tasksService = {
  async getAll(storeId?: string): Promise<Task[]> {
    if (isDemoMode) {
      let tasks = getLocalItems<Task>('erp_tasks');
      const profiles = getLocalItems<Profile>('erp_profiles');

      // Filter by store if provided
      if (storeId) {
        tasks = tasks.filter((t) => t.store_id === storeId);
      }

      // Hydrate profiles
      return tasks.map((t) => {
        const assignedTo = profiles.find((p) => p.id === t.assigned_to);
        const assignedBy = profiles.find((p) => p.id === t.assigned_by);
        return {
          ...t,
          assigned_to_profile: assignedTo,
          assigned_by_profile: assignedBy
        };
      }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    // In Supabase mode, we fetch tasks and join with the profiles table
    let query = supabase
      .from('tasks')
      .select(`
        *,
        assigned_to_profile:profiles!tasks_assigned_to_fkey(*),
        assigned_by_profile:profiles!tasks_assigned_by_fkey(*)
      `);

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async create(task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'status' | 'assigned_by'>): Promise<Task> {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser) throw new Error('User not authenticated');

    if (isDemoMode) {
      const tasks = getLocalItems<Task>('erp_tasks');
      const newTask: Task = {
        ...task,
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        assigned_by: currentUser.id,
        status: 'Pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      tasks.push(newTask);
      setLocalItems('erp_tasks', tasks);
      return newTask;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert([{
        assigned_to: task.assigned_to,
        assigned_by: currentUser.id,
        store_id: task.store_id || null,
        title: task.title,
        description: task.description,
        due_date: task.due_date
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateStatus(id: string, status: 'Pending' | 'In Progress' | 'Completed'): Promise<Task> {
    if (isDemoMode) {
      const tasks = getLocalItems<Task>('erp_tasks');
      const idx = tasks.findIndex((t) => t.id === id);
      if (idx === -1) throw new Error('Task not found.');

      tasks[idx].status = status;
      tasks[idx].updated_at = new Date().toISOString();
      setLocalItems('erp_tasks', tasks);
      return tasks[idx];
    }

    const { data, error } = await supabase
      .from('tasks')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    if (isDemoMode) {
      const tasks = getLocalItems<Task>('erp_tasks');
      const filtered = tasks.filter((t) => t.id !== id);
      setLocalItems('erp_tasks', filtered);
      return;
    }

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

import { supabase, isDemoMode } from '@/lib/supabase'
import type { Profile } from '@/types'
import { getLocalItems, setLocalItems } from './localDb'

export const profilesService = {
  async getAll(): Promise<Profile[]> {
    if (isDemoMode) {
      return getLocalItems<Profile>('erp_profiles');
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async updateRole(id: string, role: 'admin' | 'manager' | 'staff'): Promise<Profile> {
    if (isDemoMode) {
      const profiles = getLocalItems<Profile>('erp_profiles');
      const idx = profiles.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('User profile not found.');

      profiles[idx].role = role;
      setLocalItems('erp_profiles', profiles);

      // Keep demo_users credentials file in sync
      const users = JSON.parse(localStorage.getItem('demo_users') || '[]');
      const uIdx = users.findIndex((u: any) => u.id === id);
      if (uIdx > -1) {
        users[uIdx].role = role;
        localStorage.setItem('demo_users', JSON.stringify(users));
      }

      return profiles[idx];
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

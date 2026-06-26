import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Check if credentials are placeholders or empty
export const isDemoMode = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-project-ref') || 
  supabaseAnonKey.includes('your-anon-key-here')

if (isDemoMode) {
  console.warn(
    '⚠️ Supabase credentials are missing or set to placeholder values. ' +
    'The Mini ERP system will run in Demo Mode using local storage fallback. ' +
    'To connect a real database, update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Initialize Supabase. If credentials are empty, use dummy url to prevent Supabase JS from throwing instantiation errors.
export const supabase = createClient(
  isDemoMode ? 'https://placeholder-project.supabase.co' : supabaseUrl,
  isDemoMode ? 'placeholder-anon-key' : supabaseAnonKey
)

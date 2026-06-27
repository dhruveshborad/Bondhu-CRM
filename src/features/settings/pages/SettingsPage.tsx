import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Database, 
  Sun, 
  Save, 
  HelpCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/store/toastStore'
import { isDemoMode } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'

export const SettingsPage: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  })
  const [isResetOpen, setIsResetOpen] = useState(false)

  // Supabase runtime connection settings
  const [supabaseUrl, setSupabaseUrl] = useState(() => {
    return localStorage.getItem('supabase_url') || import.meta.env.VITE_SUPABASE_URL || '';
  })
  const [supabaseKey, setSupabaseKey] = useState(() => {
    return localStorage.getItem('supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '';
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const handleSaveConnection = () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.warning('Incomplete configuration', 'Please fill in both URL and key to establish database connections.')
      return;
    }

    try {
      localStorage.setItem('supabase_url', supabaseUrl.trim());
      localStorage.setItem('supabase_anon_key', supabaseKey.trim());
      toast.success('Credentials saved!', 'Updating client connection. Page will reload in 1.5 seconds.');
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (e: any) {
      toast.error('Save failed', e.message)
    }
  }

  const handleResetDemo = () => {
    setIsResetOpen(true)
  }

  const handleConfirmReset = () => {
    setIsResetOpen(false)
    localStorage.removeItem('erp_products')
    localStorage.removeItem('erp_customers')
    localStorage.removeItem('erp_suppliers')
    localStorage.removeItem('erp_purchases')
    localStorage.removeItem('erp_sales')
    localStorage.removeItem('demo_users')
    localStorage.removeItem('demo_session')
    toast.success('Simulation database wiped!', 'Reloading workspace environment.')
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 text-left"
    >
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">System Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure styling preferences, active tenant databases, and Supabase client keys.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Style Settings */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <div>
                <CardTitle>Interface Customizations</CardTitle>
                <CardDescription>Adjust dashboard styling parameters</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <span className="font-semibold text-foreground text-sm block">Dark Theme Mode</span>
                <span className="text-xs text-muted-foreground mt-0.5">Toggle sleek nocturnal dark palette</span>
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-input transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-ring ${
                  darkMode ? 'bg-primary' : ''
                }"
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <div>
                <span className="font-semibold text-foreground text-sm block">Database Status</span>
                <span className="text-xs text-muted-foreground mt-0.5">Active database connector</span>
              </div>
              <Badge variant={isDemoMode ? 'warning' : 'success'} className="gap-1.5 py-1 px-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                {isDemoMode ? 'Offline Demo Mode' : 'Supabase Live Connected'}
              </Badge>
            </div>
            
            {isDemoMode && (
              <div className="pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetDemo}
                  className="w-full font-bold"
                >
                  Wipe Simulation Database
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Supabase Connection */}
        <Card className="shadow-sm">
          <CardHeader className="border-b pb-4 mb-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Supabase Database Sourcing</CardTitle>
                <CardDescription>Map connections to your live Supabase cloud engine</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/40 p-3 rounded-lg border text-xs leading-relaxed text-muted-foreground">
              By default, variables are loaded from the project <code className="bg-muted font-bold px-1 py-0.5 rounded">.env</code> configuration. Entering credentials here overrides those settings in localStorage.
            </div>

            <Input
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              label="Supabase API Project URL"
              placeholder="https://xxxx.supabase.co"
            />

            <Input
              value={supabaseKey}
              onChange={(e) => setSupabaseKey(e.target.value)}
              label="Supabase Anon Key API Key"
              placeholder="eyJhbGciOi..."
              type="password"
            />

            <Button
              onClick={handleSaveConnection}
              className="w-full gap-1.5 font-bold shadow"
            >
              <Save className="h-4 w-4" />
              Save Connection Settings
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Database Setup Walkthrough */}
      <Card className="shadow-sm border-dashed">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-1.5">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Supabase Cloud Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground leading-relaxed space-y-2">
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>Create a free account and start a project on <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-primary font-bold hover:underline">Supabase.com</a>.</li>
            <li>Go to the <strong>SQL Editor</strong> tab inside your Supabase project dashboard.</li>
            <li>Open the file <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold select-all">supabase_schema.sql</code> located at the root of this repository, copy its contents, and execute it. This creates the PostgreSQL tables, indexes, RLS policies, and stock-updating database triggers.</li>
            <li>Navigate to <strong>Project Settings &gt; API</strong> on Supabase, locate the <strong>Project URL</strong> and <strong>anon public API key</strong>, and paste them into the settings form above or save them in a <code className="bg-muted px-1.5 py-0.5 rounded font-mono font-bold">.env</code> file.</li>
            <li>Finalize by saving and signing up a new account. The Mini ERP is now fully backed by live PostgreSQL database!</li>
          </ol>
        </CardContent>
      </Card>

      <ConfirmDialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirm={handleConfirmReset}
        title="Confirm Database Wipe"
        description="WARNING: This will permanently wipe all LocalStorage products, customers, suppliers, purchases, sales, and demo user sessions. This action cannot be undone."
        confirmText="Confirm Wipe"
        variant="destructive"
      />

    </motion.div>
  )
}

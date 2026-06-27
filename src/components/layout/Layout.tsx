import React, { useState, useEffect } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  ShoppingCart, 
  TrendingUp, 
  BarChart3, 
  Settings,
  Sparkles,
  Clock,
  Store as StoreIcon,
  Sun,
  Moon
} from 'lucide-react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { isDemoMode } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { useStoreStore } from '@/store/storeStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import { toast } from '@/store/toastStore'

export const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user } = useAuthStore()
  const userRole = user?.role || 'admin'

  const { stores, activeStoreId, fetchStores, setActiveStoreId } = useStoreStore()
  const { currentSession, clockIn, clockOut, checkActiveSession, loading: attLoading } = useAttendanceStore()
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  })

  useEffect(() => {
    if (isMobileMenuOpen) {
      fetchStores()
      checkActiveSession()
    }
  }, [isMobileMenuOpen, fetchStores, checkActiveSession])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const mobileNavItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Products', path: '/products', icon: Package },
    { name: 'Customers', path: '/customers', icon: Users },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['admin', 'manager'] },
    { name: 'Purchases', path: '/purchases', icon: ShoppingCart, roles: ['admin', 'manager'] },
    { name: 'Sales & Invoices', path: '/sales', icon: TrendingUp },
    { name: 'Attendance', path: '/attendance', icon: Clock },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin', 'manager'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] },
  ].filter(item => !item.roles || item.roles.includes(userRole))

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-200">
      
      {/* 1. Sidebar Navigation (Desktop & Tablet) */}
      <Sidebar isCollapsed={isSidebarCollapsed} setIsCollapsed={setIsSidebarCollapsed} />

      {/* 2. Mobile Drawer Navigation (Slide-in Menu Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Slide-out Sidebar Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative flex w-full max-w-[280px] flex-col border-r bg-card p-4 shadow-xl text-card-foreground"
            >
              {/* Header */}
              <div className="flex h-12 items-center justify-between border-b pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
                    BG
                  </div>
                  <span className="font-bold text-sm tracking-tight text-foreground">Bondhu ERP</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="rounded-md p-1 hover:bg-accent text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close menu</span>
                </button>
              </div>

              {/* Demo Mode Alert */}
              {isDemoMode && (
                <div className="mb-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold p-2.5 rounded-lg flex items-center justify-center gap-1.5 animate-pulse">
                  <Sparkles className="h-3 w-3" />
                  Running in Offline Demo Mode
                </div>
              )}

              {/* Mobile Quick Actions Panel */}
              <div className="mb-4 p-3 rounded-xl bg-muted/40 border border-border/60 space-y-3 text-left">
                {/* Store Selector */}
                {stores.length > 0 && (
                  <div className="flex flex-col space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <StoreIcon className="h-3 w-3" /> Active Location
                    </label>
                    <select
                      value={activeStoreId || ''}
                      onChange={(e) => setActiveStoreId(e.target.value)}
                      className="bg-card text-foreground border border-input rounded-md px-2 py-1 text-xs focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer w-full font-semibold"
                    >
                      {stores.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Clock In/Out Widget */}
                <div className="flex items-center justify-between gap-2 border-t pt-2.5">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold">Duty Status</span>
                  </div>
                  {currentSession ? (
                    <button
                      disabled={attLoading}
                      onClick={async () => {
                        try {
                          await clockOut()
                          toast.success('Clocked out successfully')
                        } catch (e: any) {
                          toast.error('Clock out failed', e.message)
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Clock Out
                    </button>
                  ) : (
                    <button
                      disabled={attLoading || !activeStoreId}
                      onClick={async () => {
                        if (activeStoreId) {
                          try {
                            await clockIn(activeStoreId)
                            toast.success('Clocked in successfully')
                          } catch (e: any) {
                            toast.error('Clock in failed', e.message)
                          }
                        }
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Clock In
                    </button>
                  )}
                </div>

                {/* Theme Toggle */}
                <div className="flex items-center justify-between gap-2 border-t pt-2.5">
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    {darkMode ? <Sun className="h-4 w-4 text-amber-500" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
                    Dark Appearance
                  </span>
                  <button
                    onClick={() => setDarkMode(!darkMode)}
                    className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-ring focus:ring-offset-1 bg-muted-foreground/20 dark:bg-primary"
                    type="button"
                    role="switch"
                    aria-checked={darkMode}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                        darkMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Navigation list */}
              <nav className="flex-1 space-y-1 overflow-y-auto">
                {mobileNavItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{item.name}</span>
                  </NavLink>
                ))}
              </nav>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Main Workspace Area (Header + Main Page View) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Sticky Header with menu trigger */}
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* Scrollable Page viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <Outlet />
          </div>
        </main>

      </div>
    </div>
  )
}

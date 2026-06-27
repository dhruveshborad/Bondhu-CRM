import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Truck, 
  ShoppingCart, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Clock,
  Store as StoreIcon,
  Sun,
  Moon
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { isDemoMode } from '@/lib/supabase'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useStoreStore } from '@/store/storeStore'
import { useAttendanceStore } from '@/store/attendanceStore'
import { toast } from '@/store/toastStore'

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { logout, user } = useAuthStore()
  const [isLogoutOpen, setIsLogoutOpen] = useState(false)

  const userRole = user?.role || 'admin'

  const { stores, activeStoreId, fetchStores, setActiveStoreId } = useStoreStore()
  const { currentSession, clockIn, clockOut, checkActiveSession, loading: attLoading } = useAttendanceStore()
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  })

  useEffect(() => {
    fetchStores()
    checkActiveSession()
  }, [fetchStores, checkActiveSession])

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  const navItems = [
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
    <motion.aside
      animate={{ width: isCollapsed ? 72 : 260 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="hidden md:flex flex-col border-r bg-card h-screen sticky top-0 shrink-0 text-card-foreground select-none overflow-hidden"
    >
      {/* Sidebar Header Logo */}
      <div className="flex h-16 items-center px-4 justify-between border-b border-border/60">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black tracking-tight shrink-0 shadow-sm">
            BG
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col"
            >
              <span className="font-bold text-sm tracking-tight leading-none text-foreground">Bondhu ERP</span>
              <span className="text-[10px] text-muted-foreground font-medium mt-0.5">Enterprise v1.0</span>
            </motion.div>
          )}
        </div>
        
        {!isCollapsed && isDemoMode && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 animate-pulse">
            <Sparkles className="h-2.5 w-2.5" />
            Demo Mode
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group relative ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="whitespace-nowrap"
              >
                {item.name}
              </motion.span>
            )}
            
            {/* Tooltip on Collapsed Sidebar */}
            {isCollapsed && (
              <div className="absolute left-16 z-50 rounded-md bg-foreground text-background text-xs font-semibold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-md">
                {item.name}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Sidebar Footer User / Logout */}
      <div className="p-3 border-t border-border/60 space-y-2">
        {!isCollapsed && (
          <div className="lg:hidden p-2.5 rounded-xl bg-muted/40 border border-border/60 space-y-2.5 mb-2 text-left">
            {/* Store Selector */}
            {stores.length > 0 && (
              <div className="flex flex-col space-y-1">
                <label className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <StoreIcon className="h-3 w-3" /> Active Location
                </label>
                <select
                  value={activeStoreId || ''}
                  onChange={(e) => setActiveStoreId(e.target.value)}
                  className="bg-card text-foreground border border-input rounded-md px-1.5 py-0.5 text-xs focus:ring-1 focus:ring-ring focus:outline-none cursor-pointer w-full font-semibold"
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
            <div className="flex items-center justify-between gap-1.5 border-t pt-2">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] font-semibold">Duty Status</span>
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors"
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
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                >
                  Clock In
                </button>
              )}
            </div>

            {/* Theme Toggle */}
            <div className="flex items-center justify-between gap-1.5 border-t pt-2">
              <span className="text-[11px] font-semibold flex items-center gap-1">
                {darkMode ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-muted-foreground" />}
                Dark Appearance
              </span>
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-transparent transition-colors duration-200 ease-in-out bg-muted-foreground/20 dark:bg-primary"
                type="button"
                role="switch"
                aria-checked={darkMode}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-3' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {!isCollapsed && user && (
          <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg bg-muted/40 overflow-hidden">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border">
              {user.full_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-semibold text-foreground truncate leading-none">
                {user.full_name}
              </span>
              <span className="text-[10px] text-muted-foreground truncate mt-0.5">
                {user.email}
              </span>
            </div>
          </div>
        )}
        
        <button
          onClick={() => setIsLogoutOpen(true)}
          className={`flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>

        <ConfirmDialog
          isOpen={isLogoutOpen}
          onClose={() => setIsLogoutOpen(false)}
          onConfirm={() => {
            setIsLogoutOpen(false)
            logout()
          }}
          title="Confirm Logout"
          description="Are you absolutely sure you want to log out of your session? You will need to log back in to access the system."
          confirmText="Logout"
          variant="destructive"
        />

        {/* Collapsed Toggle Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex h-6 w-full items-center justify-center rounded bg-accent/40 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </motion.aside>
  )
}

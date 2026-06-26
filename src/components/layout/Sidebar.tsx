import React from 'react'
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
  Clock
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { isDemoMode } from '@/lib/supabase'

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const { logout, user } = useAuthStore()

  const userRole = user?.role || 'admin'

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
          onClick={() => {
            if (window.confirm('Are you sure you want to log out?')) {
              logout()
            }
          }}
          className={`flex w-full items-center gap-3.5 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors ${
            isCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Logout</span>}
        </button>

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

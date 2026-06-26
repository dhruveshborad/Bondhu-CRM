import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Menu, Bell, Sun, Moon, LogOut, ChevronDown, Clock, Store as StoreIcon } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useStoreStore } from '@/store/storeStore'
import { useAttendanceStore } from '@/store/attendanceStore'

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const { stores, activeStoreId, fetchStores, setActiveStoreId } = useStoreStore()
  const { currentSession, clockIn, clockOut, checkActiveSession, loading: attLoading } = useAttendanceStore()
  
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return document.documentElement.classList.contains('dark') || 
      localStorage.getItem('theme') === 'dark';
  })
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  // Toggle Dark Mode (Tailwind v4 class-based strategy)
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [darkMode])

  // Fetch stores and active session on mount
  useEffect(() => {
    fetchStores()
    checkActiveSession()
  }, [fetchStores, checkActiveSession])

  // Get Page Title from active path
  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Dashboard Analytics'
    if (path.startsWith('/products')) return 'Product Inventory'
    if (path.startsWith('/customers')) return 'Customer Directory'
    if (path.startsWith('/suppliers')) return 'Supplier Directory'
    if (path.startsWith('/purchases')) return 'Purchase Orders'
    if (path.startsWith('/sales')) return 'Sales & Invoice Invoicing'
    if (path.startsWith('/reports')) return 'Business Intelligence Reports'
    if (path.startsWith('/settings')) return 'System Settings'
    return 'Mini ERP Admin'
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur-md md:px-6 shadow-sm">
      {/* Left side: Hamburger (Mobile only) + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle Menu</span>
        </button>
        <h1 className="text-base font-bold tracking-tight text-foreground md:text-lg animate-fade-in">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side: Utilities & Profile */}
      <div className="flex items-center gap-3.5">
        {/* Store Selector */}
        {stores.length > 0 && (
          <div className="flex items-center gap-1 bg-accent/45 border border-border/80 rounded-lg p-1">
            <StoreIcon className="h-3.5 w-3.5 text-muted-foreground ml-1.5 hidden sm:inline shrink-0" />
            <select
              value={activeStoreId || ''}
              onChange={(e) => setActiveStoreId(e.target.value)}
              className="bg-transparent text-foreground text-xs font-semibold rounded-md px-1.5 py-1 focus:outline-none cursor-pointer border-0 w-[100px] sm:w-[130px] truncate"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-card text-foreground">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Attendance Widget */}
        <div className="flex items-center gap-2">
          {currentSession ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-bold hidden md:inline max-w-[120px] truncate">
                Clocked In: {currentSession.store?.name || 'Store'}
              </span>
              <button
                disabled={attLoading}
                onClick={async () => {
                  try {
                    await clockOut()
                  } catch (e: any) {
                    alert(e.message)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold px-2 py-0.5 rounded cursor-pointer transition-colors disabled:opacity-50"
              >
                Clock Out
              </button>
            </div>
          ) : (
            <button
              disabled={attLoading || !activeStoreId}
              onClick={async () => {
                if (activeStoreId) {
                  try {
                    await clockIn(activeStoreId)
                  } catch (e: any) {
                    alert(e.message)
                  }
                }
              }}
              className="flex items-center gap-1 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 animate-fade-in"
            >
              <Clock className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Clock In</span>
            </button>
          )}
        </div>

        {/* Dark/Light Mode Toggler */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          title="Toggle Theme"
        >
          {darkMode ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
        </button>

        {/* Notifications Icon (Alert Indicator) */}
        <div className="relative">
          <button className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
            <Bell className="h-4.5 w-4.5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive animate-ping"></span>
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive"></span>
          </button>
        </div>

        {/* User Dropdown Profile Button */}
        {user && (
          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              onBlur={() => setTimeout(() => setIsProfileOpen(false), 200)}
              className="flex items-center gap-2 rounded-lg p-1 hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
            >
              <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] border shadow-sm shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline-block text-xs font-semibold text-foreground truncate max-w-[100px]">
                {user.full_name.split(' ')[0]}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
            </button>

            {/* Profile Dropdown Card */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-52 origin-top-right rounded-lg border bg-card p-1 shadow-lg ring-1 ring-black/5 animate-scale-in text-card-foreground">
                <div className="px-3 py-2 border-b border-border/60">
                  <p className="text-xs font-bold truncate text-foreground">{user.full_name}</p>
                  <p className="text-[10px] truncate text-muted-foreground mt-0.5">{user.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to log out?')) {
                        logout()
                      }
                    }}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout Account
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

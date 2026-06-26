import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized || (loading && !user)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">Initializing ERP System...</p>
      </div>
    )
  }

  if (!user) {
    // Redirect to login page and keep track of current location
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

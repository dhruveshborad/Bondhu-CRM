import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface PublicRouteProps {
  children: React.ReactNode;
}

export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { user, loading, isInitialized } = useAuthStore()

  if (!isInitialized || (loading && !user)) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="mt-4 text-sm text-muted-foreground animate-pulse">Initializing ERP System...</p>
      </div>
    )
  }

  if (user) {
    // Redirect to dashboard if logged in
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

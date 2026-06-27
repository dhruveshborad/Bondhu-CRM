import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { RoleRoute } from './RoleRoute'
import { Layout } from '@/components/layout/Layout'
import { SkeletonTable } from '@/components/common/States'

// Page imports (Lazy loaded for route code-splitting)
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage').then(m => ({ default: m.ProductsPage })))
const CustomersPage = lazy(() => import('@/features/customers/pages/CustomersPage').then(m => ({ default: m.CustomersPage })))
const SuppliersPage = lazy(() => import('@/features/suppliers/pages/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const PurchasesPage = lazy(() => import('@/features/purchases/pages/PurchasesPage').then(m => ({ default: m.PurchasesPage })))
const SalesPage = lazy(() => import('@/features/sales/pages/SalesPage').then(m => ({ default: m.SalesPage })))
const AttendancePage = lazy(() => import('@/features/attendance/pages/AttendancePage').then(m => ({ default: m.AttendancePage })))
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage').then(m => ({ default: m.ReportsPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            }>
              <LoginPage />
            </Suspense>
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Suspense fallback={
              <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            }>
              <RegisterPage />
            </Suspense>
          </PublicRoute>
        }
      />

      {/* Protected ERP Workspace Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route 
          index 
          element={
            <Suspense fallback={
              <div className="p-6 space-y-6 text-left animate-pulse">
                <div className="h-8 w-60 bg-muted rounded mb-2"></div>
                <div className="h-4 w-96 bg-muted rounded mb-6"></div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="h-28 bg-muted rounded-xl"></div>
                  <div className="h-28 bg-muted rounded-xl"></div>
                  <div className="h-28 bg-muted rounded-xl"></div>
                </div>
              </div>
            }>
              <DashboardPage />
            </Suspense>
          } 
        />
        <Route 
          path="products" 
          element={
            <Suspense fallback={
              <div className="p-6 space-y-6 text-left">
                <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                <SkeletonTable rows={5} cols={5} />
              </div>
            }>
              <ProductsPage />
            </Suspense>
          } 
        />
        <Route 
          path="customers" 
          element={
            <Suspense fallback={
              <div className="p-6 space-y-6 text-left">
                <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                <SkeletonTable rows={5} cols={4} />
              </div>
            }>
              <CustomersPage />
            </Suspense>
          } 
        />
        <Route 
          path="suppliers" 
          element={
            <RoleRoute 
              element={
                <Suspense fallback={
                  <div className="p-6 space-y-6 text-left">
                    <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                    <SkeletonTable rows={5} cols={4} />
                  </div>
                }>
                  <SuppliersPage />
                </Suspense>
              } 
              allowedRoles={['admin', 'manager']} 
            />
          } 
        />
        <Route 
          path="purchases" 
          element={
            <RoleRoute 
              element={
                <Suspense fallback={
                  <div className="p-6 space-y-6 text-left">
                    <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                    <SkeletonTable rows={5} cols={5} />
                  </div>
                }>
                  <PurchasesPage />
                </Suspense>
              } 
              allowedRoles={['admin', 'manager']} 
            />
          } 
        />
        <Route 
          path="sales" 
          element={
            <Suspense fallback={
              <div className="p-6 space-y-6 text-left">
                <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                <SkeletonTable rows={5} cols={5} />
              </div>
            }>
              <SalesPage />
            </Suspense>
          } 
        />
        <Route 
          path="attendance" 
          element={
            <RoleRoute 
              element={
                <Suspense fallback={
                  <div className="p-6 space-y-6 text-left">
                    <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                    <SkeletonTable rows={5} cols={5} />
                  </div>
                }>
                  <AttendancePage />
                </Suspense>
              } 
              allowedRoles={['admin', 'manager', 'staff']} 
            />
          } 
        />
        <Route 
          path="reports" 
          element={
            <RoleRoute 
              element={
                <Suspense fallback={
                  <div className="p-6 space-y-6 text-left">
                    <div className="h-8 w-48 bg-muted rounded animate-pulse"></div>
                    <SkeletonTable rows={5} cols={5} />
                  </div>
                }>
                  <ReportsPage />
                </Suspense>
              } 
              allowedRoles={['admin', 'manager']} 
            />
          } 
        />
        <Route 
          path="settings" 
          element={
            <RoleRoute 
              element={
                <Suspense fallback={
                  <div className="p-6 space-y-6 text-left animate-pulse">
                    <div className="h-8 w-48 bg-muted rounded mb-4"></div>
                    <div className="h-40 bg-muted rounded-xl"></div>
                  </div>
                }>
                  <SettingsPage />
                </Suspense>
              } 
              allowedRoles={['admin']} 
            />
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
export default AppRoutes

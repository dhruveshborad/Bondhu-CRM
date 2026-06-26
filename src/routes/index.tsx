import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicRoute } from './PublicRoute'
import { RoleRoute } from './RoleRoute'
import { Layout } from '@/components/layout/Layout'

// Page imports
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { ProductsPage } from '@/features/products/pages/ProductsPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { SuppliersPage } from '@/features/suppliers/pages/SuppliersPage'
import { PurchasesPage } from '@/features/purchases/pages/PurchasesPage'
import { SalesPage } from '@/features/sales/pages/SalesPage'
import { AttendancePage } from '@/features/attendance/pages/AttendancePage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
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
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="suppliers" element={<RoleRoute element={<SuppliersPage />} allowedRoles={['admin', 'manager']} />} />
        <Route path="purchases" element={<RoleRoute element={<PurchasesPage />} allowedRoles={['admin', 'manager']} />} />
        <Route path="sales" element={<SalesPage />} />
        <Route path="attendance" element={<RoleRoute element={<AttendancePage />} allowedRoles={['admin', 'manager', 'staff']} />} />
        <Route path="reports" element={<RoleRoute element={<ReportsPage />} allowedRoles={['admin', 'manager']} />} />
        <Route path="settings" element={<RoleRoute element={<SettingsPage />} allowedRoles={['admin']} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
export default AppRoutes

import React from 'react'
import { useAuthStore } from '@/store/authStore'
import { AccessDenied } from '@/components/common/States'

interface RoleRouteProps {
  element: React.ReactElement;
  allowedRoles: string[];
}

export const RoleRoute: React.FC<RoleRouteProps> = ({ element, allowedRoles }) => {
  const { user } = useAuthStore()
  const role = user?.role || 'admin'

  if (!allowedRoles.includes(role)) {
    return <AccessDenied />
  }

  return element
}

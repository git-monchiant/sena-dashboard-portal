import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@shared/auth';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  children: ReactNode;
  permissions?: string[];
  requireAuth?: boolean;
  fallback?: ReactNode;
}

// Mock permission check - replace with actual implementation
function hasPermission(userRole: string, requiredPermissions: string[]): boolean {
  // Admin has all permissions
  if (userRole === 'admin') return true;

  // For now, allow all permissions in development
  // Replace with actual permission logic
  const rolePermissions: Record<string, string[]> = {
    admin: ['*'],
    manager: ['sales:read', 'transfer:read', 'finance:read'],
    viewer: ['sales:read', 'transfer:read'],
  };

  const userPermissions = rolePermissions[userRole] || [];

  if (userPermissions.includes('*')) return true;

  return requiredPermissions.every((p) => userPermissions.includes(p));
}

export function PermissionGuard({
  children,
  permissions = [],
  requireAuth = true,
  fallback,
}: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Check authentication
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check permissions
  if (permissions.length > 0 && user) {
    const hasAccess = hasPermission(user.role, permissions);

    if (!hasAccess) {
      if (fallback) {
        return <>{fallback}</>;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2">
              Access Denied
            </h1>
            <p className="text-slate-500 mb-4">
              You don't have permission to access this page.
            </p>
            <a
              href="/"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

// Higher-order component version
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: string[]
) {
  return function WrappedComponent(props: P) {
    return (
      <PermissionGuard permissions={permissions}>
        <Component {...props} />
      </PermissionGuard>
    );
  };
}

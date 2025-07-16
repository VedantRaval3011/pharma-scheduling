'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { UserRole } from '@/types/auth';
import { IModuleAccess } from '@/models/employee';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredModule?: string;
  requiredPermission?: 'read' | 'write' | 'delete' | 'edit' | 'audit';
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles, 
  requiredModule, 
  requiredPermission 
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log('Session user:', session?.user); // Debug log
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(session.user.role)) {
      router.push('/unauthorized');
      return;
    }

    if (requiredModule) {
      const hasModuleAccess = session.user.moduleAccess?.some(
        (module: IModuleAccess) => 
          module.modulePath === requiredModule && 
          (!requiredPermission || module.permissions.includes(requiredPermission))
      );

      if (!hasModuleAccess) {
        router.push('/unauthorized');
        return;
      }
    }
  }, [session, status, router, allowedRoles, requiredModule, requiredPermission]);

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(session.user.role)) {
    return null;
  }

  if (requiredModule) {
    const hasModuleAccess = session.user.moduleAccess?.some(
      (module: IModuleAccess) => 
        module.modulePath === requiredModule && 
        (!requiredPermission || module.permissions.includes(requiredPermission))
    );

    if (!hasModuleAccess) {
      return null;
    }
  }

  return <>{children}</>;
}
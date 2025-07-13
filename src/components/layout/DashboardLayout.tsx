'use client';
import React from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { NavigationMenu } from '../navigation/NavigationMenu';
import { NavItem } from '../../types';
import { superAdminNavData, adminEmployeeNavData, employeeNavData } from '../../data/navigationData';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Show loading state
  if (status === 'loading') {
    return <div className="p-4">Loading...</div>;
  }

  // Redirect if not authenticated
  if (!session) {
    router.push('/auth/login');
    return null;
  }

  const user = {
    userId: session.user?.userId || '',
    role: session.user?.role || 'employee',
    company: session.user?.company || '',
    companyId: session.user?.companyId || ''
  };

  const getNavData = (): NavItem[] => {
    switch (user.role) {
      case 'super_admin':
        return superAdminNavData;
      case 'admin':
        return adminEmployeeNavData;
      case 'employee':
        return employeeNavData;
      default:
        return [];
    }
  };

  const handleItemClick = (item: NavItem) => {
    console.log('Navigation item clicked:', item.label);

    if (item.path) {
      router.push(item.path);
    } else if (item.children) {
      console.log('Menu item has children, showing dropdown');
    }
  };


  return (
    <div className="min-h-screen flex flex-col font-sans">
      
      {/* Navigation */}
      <NavigationMenu 
        navData={getNavData()} 
        onItemClick={handleItemClick}
      />

      {/* Main Content */}
      <main className="flex-1 bg-gray-50">
        {children}
      </main>
    </div>
  );
};

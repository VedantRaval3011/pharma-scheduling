'use client';
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { NavigationMenu } from '../navigation/NavigationMenu';
import { NavItem } from '../../types';
import { superAdminNavData, adminEmployeeNavData, employeeNavData } from '../../data/navigationData';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface ModuleAccess {
  moduleId: string;
  modulePath: string;
  moduleName: string;
  permissions: string[];
}

interface PermissionsResponse {
  employeeId: string;
  moduleAccess: ModuleAccess[];
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userPermissions, setUserPermissions] = useState<ModuleAccess[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Get permissions directly from session - MUST be before any conditional returns
  useEffect(() => {
    if (session?.user?.moduleAccess) {
      setUserPermissions(session.user.moduleAccess);
    } else {
      setUserPermissions([]);
    }
    setPermissionsLoaded(true);
  }, [session]);

  // Show loading state
  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  // Redirect if not authenticated
  if (!session) {
    router.push('/auth/login');
    return null;
  }

  const user = {
    userId: session.user?.userId || '',
    role: session.user?.role || 'employee',
    company: session.user?.companies[0]?.name || '',
    companyId: session.user?.companies[0]?.companyId || '',
  };

  // Check if user has permission for a specific module path
  const hasModuleAccess = (modulePath: string): boolean => {
    // Super admin has access to everything
    if (user.role === 'super_admin') {
      return true;
    }

    // Check for wildcard permission (admin with all modules access)
    const hasWildcardAccess = userPermissions.some(permission => 
      permission.modulePath === '*' && permission.permissions.length > 0
    );
    
    if (hasWildcardAccess) {
      return true;
    }

    // Check if the specific module path exists in user permissions
    return userPermissions.some(permission => 
      permission.modulePath === modulePath && 
      permission.permissions.length > 0
    );
  };

  // Sort navigation items with custom priority order
  const sortNavItems = (navItems: NavItem[]): NavItem[] => {
    // Define priority order for top-level items
    const priorityOrder = ['master', 'batch', 'tests', 'analysis'];
    
    // Helper function to find priority index with flexible matching
    const getPriorityIndex = (label: string): number => {
      const lowerLabel = label.toLowerCase();
      
      // First try exact match
      let index = priorityOrder.indexOf(lowerLabel);
      if (index !== -1) return index;
      
      // Then try if label starts with any priority term
      for (let i = 0; i < priorityOrder.length; i++) {
        if (lowerLabel.startsWith(priorityOrder[i])) {
          return i;
        }
      }
      
      // Then try if label contains any priority term
      for (let i = 0; i < priorityOrder.length; i++) {
        if (lowerLabel.includes(priorityOrder[i])) {
          return i;
        }
      }
      
      return -1; // Not found
    };
    
    return navItems
      .sort((a, b) => {
        const aIndex = getPriorityIndex(a.label);
        const bIndex = getPriorityIndex(b.label);
        
        // If both items are in priority list, sort by their priority index
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex;
        }
        
        // If only 'a' is in priority list, it comes first
        if (aIndex !== -1 && bIndex === -1) {
          return -1;
        }
        
        // If only 'b' is in priority list, it comes first
        if (aIndex === -1 && bIndex !== -1) {
          return 1;
        }
        
        // If neither is in priority list, sort alphabetically
        return a.label.toLowerCase().localeCompare(b.label.toLowerCase());
      })
      .map(item => ({
        ...item,
        children: item.children ? sortNavItems(item.children) : undefined
      }));
  };

  // Filter navigation items based on permissions
  const filterNavItems = (navItems: NavItem[]): NavItem[] => {
    return navItems
      .map(item => {
        // If item has children, recursively filter them
        if (item.children && item.children.length > 0) {
          const filteredChildren = filterNavItems(item.children);
          
          // Only include parent if it has accessible children or if parent itself has a path with access
          if (filteredChildren.length > 0 || (item.path && hasModuleAccess(item.path))) {
            return {
              ...item,
              children: filteredChildren
            };
          }
          return null;
        }
        
        // For leaf items, check if user has access to the path
        if (item.path && hasModuleAccess(item.path)) {
          return item;
        }
        
        // If no path specified (likely a parent menu), include it
        if (!item.path) {
          return item;
        }
        
        return null;
      })
      .filter((item): item is NavItem => item !== null);
  };

  const getNavData = (): NavItem[] => {
    let baseNavData: NavItem[] = [];
    
    switch (user.role) {
      case 'super_admin':
        baseNavData = superAdminNavData;
        break;
      case 'admin':
        baseNavData = adminEmployeeNavData;
        break;
      case 'employee':
        baseNavData = employeeNavData;
        break;
      default:
        baseNavData = [];
    }

    // Filter navigation based on permissions, then sort alphabetically
    const filteredNavData = filterNavItems(baseNavData);
    return sortNavItems(filteredNavData);
  };

  const handleItemClick = (item: NavItem) => {
    console.log('Navigation item clicked:', item.label);
    
    if (item.path) {
      // Check permissions before navigation
      if (hasModuleAccess(item.path)) {
        router.push(item.path);
      } else {
        console.warn('Access denied to module:', item.path);
        // Optionally show a toast or alert here
        alert('You do not have permission to access this module.');
      }
    } else if (item.children) {
      console.log('Menu item has children, showing dropdown');
    }
  };

  // Show loading until permissions are loaded
  if (!permissionsLoaded) {
    return <div>Loading permissions...</div>;
  }

  return (
    <div>
      {/* Sticky Navigation */}
      <div className="sticky top-0 z-50 bg-white shadow-md">
        <NavigationMenu navData={getNavData()} onItemClick={handleItemClick} />
      </div>
      {/* Main Content with top padding to account for sticky nav */}
      <main >{children}</main>
    </div>
  );
};
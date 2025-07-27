'use client';

import React, { useEffect } from 'react';
import {
  Plus,
  Save,
  X,
  LogOut,
  ChevronUp,
  ChevronDown,
  Search,
  Play,
  Edit,
  Trash2,
  History,
  Printer,
  HelpCircle,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface ToolbarProps {
  modulePath: string; // The module path to check permissions for
  onAddNew?: () => void;
  onSave?: () => void;
  onClear?: () => void;
  onExit?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  onSearch?: () => void;
  onImplementQuery?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onAudit?: () => void;
  onPrint?: () => void;
  onHelp?: () => void;
}

const WindowsToolbar: React.FC<ToolbarProps> = ({
  modulePath,
  onAddNew,
  onSave,
  onClear,
  onExit,
  onUp,
  onDown,
  onSearch,
  onImplementQuery,
  onEdit,
  onDelete,
  onAudit,
  onPrint,
  onHelp,
}) => {
  const { data: session } = useSession();

  // Map buttons to required permissions - refined based on your requirements
  const buttonPermissions = [
    { 
      id: 'addNew', 
      icon: Plus, 
      label: 'Add New', 
      shortcut: 'F1', 
      onClick: onAddNew, 
      requiredPermissions: ['read', 'write'] // Need both read and write to add new
    },
    { 
      id: 'save', 
      icon: Save, 
      label: 'Save', 
      shortcut: 'F2', 
      onClick: onSave, 
      requiredPermissions: ['read', 'write','edit'] // Need read, write, and edit to save
    },
    { 
      id: 'clear', 
      icon: X, 
      label: 'Clear', 
      shortcut: 'F3', 
      onClick: onClear, 
      requiredPermissions: ['read', 'write'] // Need read and write to clear
    },
    { 
      id: 'exit', 
      icon: LogOut, 
      label: 'Exit', 
      shortcut: 'F4', 
      onClick: onExit, 
      requiredPermissions: [] // Always available
    },
    { 
      id: 'up', 
      icon: ChevronUp, 
      label: 'Up', 
      shortcut: 'F5', 
      onClick: onUp, 
      requiredPermissions: ['read'] // Only need read permission
    },
    { 
      id: 'down', 
      icon: ChevronDown, 
      label: 'Down', 
      shortcut: 'F6', 
      onClick: onDown, 
      requiredPermissions: ['read'] // Only need read permission
    },
    { 
      id: 'search', 
      icon: Search, 
      label: 'Search', 
      shortcut: 'F7', 
      onClick: onSearch, 
      requiredPermissions: ['read'] // Only need read permission
    },
    {
      id: 'implement',
      icon: Play,
      label: 'Implement Query',
      shortcut: 'F8',
      onClick: onImplementQuery,
      requiredPermissions: ['read', 'write'], // Need read and write to implement
    },
    { 
      id: 'edit', 
      icon: Edit, 
      label: 'Edit', 
      shortcut: 'F9', 
      onClick: onEdit, 
      requiredPermissions: ['read', 'edit'] // Need read and edit permissions
    },
    { 
      id: 'delete', 
      icon: Trash2, 
      label: 'Delete', 
      shortcut: 'F10', 
      onClick: onDelete, 
      requiredPermissions: ['read', 'delete'] // Need read and delete permissions
    },
    { 
      id: 'audit', 
      icon: History, 
      label: 'Audit', 
      shortcut: 'F11', 
      onClick: onAudit, 
      requiredPermissions: ['read', 'audit'] // Need read and audit permissions
    },
    { 
      id: 'print', 
      icon: Printer, 
      label: 'Print', 
      shortcut: 'F12', 
      onClick: onPrint, 
      requiredPermissions: ['read'] // Only need read permission
    },
    { 
      id: 'help', 
      icon: HelpCircle, 
      label: 'Help', 
      shortcut: 'Ctrl+H', 
      onClick: onHelp, 
      requiredPermissions: [] // Always available
    },
  ];

  // Check if user has all required permissions for a specific action
  const hasPermission = (requiredPermissions: string[]) => {
    // If no permissions required, always allow
    if (requiredPermissions.length === 0) return true;
    
    // If no session or user, deny access
    if (!session?.user) return false;
    
    // Super admins and admins have all permissions
    if (['super_admin', 'admin'].includes(session.user.role)) return true;
    
    // Find the module in user's moduleAccess
    const module = session.user.moduleAccess?.find((m) => 
      m.modulePath === modulePath || m.modulePath === '*'
    );
    
    // If module not found, deny access
    if (!module) return false;
    
    // Check if user has ALL required permissions for this action
    return requiredPermissions.every(permission => 
      module.permissions.includes(permission)
    );
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const button = buttonPermissions.find(
        (b) => b.shortcut === event.key || (event.ctrlKey && event.key === 'h' && b.shortcut === 'Ctrl+H')
      );
      if (button && button.onClick && hasPermission(button.requiredPermissions)) {
        event.preventDefault();
        button.onClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buttonPermissions, modulePath, session]);

  return (
    <div
      className="fixed left-4 top-1/2 transform -translate-y-1/2 z-20"
      style={{
        background: 'linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%)',
        border: '2px ridge #c0c0c0',
        borderRadius: '4px',
        padding: '4px',
        boxShadow: '2px 2px 4px rgba(0,0,0,0.3)',
      }}
    >
      <div className="flex flex-col space-y-1">
        {buttonPermissions.map((button) => {
          const IconComponent = button.icon;
          const isDisabled = !hasPermission(button.requiredPermissions);
          const isVisible = button.onClick !== undefined; // Only show if handler is provided

          // Don't render the button if no onClick handler is provided
          if (!isVisible) return null;

          return (
            <button
              key={button.id}
              onClick={button.onClick}
              disabled={isDisabled}
              title={`${button.label} (${button.shortcut})${isDisabled ? ' - Access Denied' : ''}`}
              className={`group relative w-8 h-8 flex items-center justify-center ${
                isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:text-gray-900'
              } transition-colors`}
              style={{
                background: isDisabled
                  ? 'linear-gradient(to bottom, #e0e0e0 0%, #d0d0d0 100%)'
                  : 'linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)',
                border: '1px outset #c0c0c0',
                borderRadius: '2px',
              }}
              onMouseDown={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.border = '1px inset #c0c0c0';
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #e0e0e0 0%, #f0f0f0 100%)';
                }
              }}
              onMouseUp={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.border = '1px outset #c0c0c0';
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDisabled) {
                  e.currentTarget.style.border = '1px outset #c0c0c0';
                  e.currentTarget.style.background = 'linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)';
                }
              }}
            >
              <IconComponent className="w-4 h-4" />
              <div
                className="absolute left-full ml-2 px-2 py-1 bg-yellow-100 border border-gray-400 rounded text-xs text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                style={{
                  background: 'linear-gradient(to bottom, #fffacd 0%, #f0e68c 100%)',
                  border: '1px solid #8b7355',
                  boxShadow: '1px 1px 2px rgba(0,0,0,0.3)',
                }}
              >
                <div className="font-medium">{button.label}</div>
                <div className="text-xs text-gray-600">{button.shortcut}</div>
                {isDisabled && (
                  <div className="text-xs text-red-600 mt-1">
                    Required: {button.requiredPermissions.join(', ')}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WindowsToolbar;
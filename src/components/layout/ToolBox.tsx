import React, { useEffect } from "react";
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
} from "lucide-react";

interface ToolbarProps {
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
  const buttons = [
    {
      id: "addNew",
      icon: Plus,
      label: "Add New",
      shortcut: "F1",
      onClick: onAddNew,
    },
    { id: "save", icon: Save, label: "Save", shortcut: "F2", onClick: onSave },
    { id: "clear", icon: X, label: "Clear", shortcut: "F3", onClick: onClear },
    {
      id: "exit",
      icon: LogOut,
      label: "Exit",
      shortcut: "F4",
      onClick: onExit,
    },
    { id: "up", icon: ChevronUp, label: "Up", shortcut: "F5", onClick: onUp },
    {
      id: "down",
      icon: ChevronDown,
      label: "Down",
      shortcut: "F6",
      onClick: onDown,
    },
    {
      id: "search",
      icon: Search,
      label: "Search",
      shortcut: "F7",
      onClick: onSearch,
    },
    {
      id: "implement",
      icon: Play,
      label: "Implement Query",
      shortcut: "F8",
      onClick: onImplementQuery,
    },
    { id: "edit", icon: Edit, label: "Edit", shortcut: "F9", onClick: onEdit },
    {
      id: "delete",
      icon: Trash2,
      label: "Delete",
      shortcut: "F10",
      onClick: onDelete,
    },
    {
      id: "audit",
      icon: History,
      label: "Audit",
      shortcut: "F11",
      onClick: onAudit,
    },
    {
      id: "print",
      icon: Printer,
      label: "Print",
      shortcut: "F12",
      onClick: onPrint,
    },
    {
      id: "help",
      icon: HelpCircle,
      label: "Help",
      shortcut: "Ctrl+H",
      onClick: onHelp,
    },
  ];

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for function keys F1-F12
      if (event.key >= "F1" && event.key <= "F12") {
        event.preventDefault();
        const buttonIndex = parseInt(event.key.substring(1)) - 1;
        if (buttons[buttonIndex] && buttons[buttonIndex].onClick) {
          buttons[buttonIndex].onClick!();
        }
      }

      // Check for Ctrl+H (Help)
      if (event.ctrlKey && event.key === "h") {
        event.preventDefault();
        if (onHelp) onHelp();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [buttons, onHelp]);

  return (
    <div
      className="fixed left-4 top-1/2 transform -translate-y-1/2 z-20"
      style={{
        background: "linear-gradient(to bottom, #f0f0f0 0%, #e0e0e0 100%)",
        border: "2px ridge #c0c0c0",
        borderRadius: "4px",
        padding: "4px",
        boxShadow: "2px 2px 4px rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex flex-col space-y-1">
        {buttons.map((button) => {
          const IconComponent = button.icon;
          return (
            <button
              key={button.id}
              onClick={button.onClick}
              title={`${button.label} (${button.shortcut})`}
              className="group relative w-8 h-8 flex items-center justify-center text-gray-700 hover:text-gray-900 transition-colors"
              style={{
                background:
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)",
                border: "1px outset #c0c0c0",
                borderRadius: "2px",
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.border = "1px inset #c0c0c0";
                e.currentTarget.style.background =
                  "linear-gradient(to bottom, #e0e0e0 0%, #f0f0f0 100%)";
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.border = "1px outset #c0c0c0";
                e.currentTarget.style.background =
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.border = "1px outset #c0c0c0";
                e.currentTarget.style.background =
                  "linear-gradient(to bottom, #fdfdfd 0%, #f0f0f0 100%)";
              }}
            >
              <IconComponent className="w-4 h-4" />

              {/* Tooltip */}
              <div
                className="absolute left-full ml-2 px-2 py-1 bg-yellow-100 border border-gray-400 rounded text-xs text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10"
                style={{
                  background:
                    "linear-gradient(to bottom, #fffacd 0%, #f0e68c 100%)",
                  border: "1px solid #8b7355",
                  boxShadow: "1px 1px 2px rgba(0,0,0,0.3)",
                }}
              >
                <div className="font-medium">{button.label}</div>
                <div className="text-xs text-gray-600">{button.shortcut}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WindowsToolbar;
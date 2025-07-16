import { ChevronRight } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import React, { useState, useRef, useEffect } from "react";

// Mock types for demonstration
interface NavItem {
  label: string;
  children?: NavItem[];
}

interface NavigationMenuProps {
  navData: NavItem[];
  onItemClick: (item: NavItem) => void;
}

interface SubMenuProps {
  items: NavItem[];
  onItemClick: (item: NavItem) => void;
  level?: number;
}

const SubMenu: React.FC<SubMenuProps> = ({ items, onItemClick, level = 0 }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (index: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpenIndex(index);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpenIndex(null), 200);
  };

  const handleContainerMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <div
      className={`absolute top-0 left-full min-w-48 z-50 ${
        level > 0 ? "-ml-1" : ""
      }`}
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background:
          "linear-gradient(180deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%)",
        border: "1px solid #adb5bd",
        borderTop: "1px solid #ffffff",
        borderLeft: "1px solid #ffffff",
        borderRight: "1px solid #6c757d",
        borderBottom: "1px solid #6c757d",
        boxShadow:
          "2px 2px 8px rgba(0, 0, 0, 0.25), inset 1px 1px 0px rgba(255, 255, 255, 0.8)",
        borderRadius: "3px",
      }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          onMouseEnter={() => handleMouseEnter(index)}
          className="relative px-4 py-2 text-sm text-black cursor-pointer whitespace-nowrap border-b border-gray-300 last:border-b-0 transition-all duration-150"
          onClick={() => onItemClick(item)}
          style={{
            background:
              openIndex === index
                ? "linear-gradient(180deg, #4a90e2 0%, #357abd 100%)"
                : "transparent",
            color: openIndex === index ? "white" : "#333333",
            textShadow:
              openIndex === index ? "0 1px 1px rgba(0, 0, 0, 0.3)" : "none",
          }}
        >
          <div className="flex justify-between items-center">
            <span>{item.label}</span>
            {item.children && (
              <span className="ml-3 text-xs font-bold size-5 flex justify-center items-center">
                <ChevronRight />
              </span>
            )}
          </div>
          {item.children && openIndex === index && (
            <SubMenu
              items={item.children}
              onItemClick={onItemClick}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  navData,
  onItemClick,
}) => {
  const { status } = useSession();
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Early return for loading state
  if (status === "loading") {
    return <div className="p-4">Loading...</div>;
  }

 

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveTab(null), 300);
  };

  const handleNavItemMouseEnter = (index: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveTab(index);
  };

  const handleNavItemMouseLeave = () => {
    // Only set timeout if we're not hovering over a submenu
    timeoutRef.current = setTimeout(() => setActiveTab(null), 300);
  };

  const handleSubMenuMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleSubMenuMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setActiveTab(null), 300);
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <div
      className="border-b"
      style={{
        background:
          "linear-gradient(180deg, #f0f6ff 0%, #d6ebff 30%, #bfdbff 70%, #a8ccff 100%)",
        borderBottom: "1px solid #6c757d",
        boxShadow:
          "inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 1px 3px rgba(0, 0, 0, 0.1)",
      }}
    >
      <div className="flex px-2 py-1 text-sm font-normal justify-between">
        <div className="flex items-center h-6 gap-2">
          {navData.map((item, index) => (
            <div
              key={index}
              className={`relative px-4 py-2 cursor-pointer transition-all duration-150 rounded-sm mx-1`}
              onMouseEnter={() => handleNavItemMouseEnter(index)}
              onMouseLeave={handleNavItemMouseLeave}
              onClick={() => onItemClick(item)}
              style={{
                background:
                  activeTab === index
                    ? "linear-gradient(180deg, #ffffff 0%, #f0f4f8 50%, #e1e8ed 100%)"
                    : "transparent",
                border:
                  activeTab === index
                    ? "1px solid #adb5bd"
                    : "1px solid transparent",
                borderTop:
                  activeTab === index
                    ? "1px solid #ffffff"
                    : "1px solid transparent",
                borderLeft:
                  activeTab === index
                    ? "1px solid #ffffff"
                    : "1px solid transparent",
                borderRight:
                  activeTab === index
                    ? "1px solid #6c757d"
                    : "1px solid transparent",
                borderBottom:
                  activeTab === index
                    ? "1px solid #6c757d"
                    : "1px solid transparent",
                boxShadow:
                  activeTab === index
                    ? "inset 1px 1px 0px rgba(255, 255, 255, 0.8), 1px 1px 3px rgba(0, 0, 0, 0.1)"
                    : "none",
                color: "#333333",
                textShadow: "0 1px 1px rgba(255, 255, 255, 0.8)",
              }}
            >
              {item.label}
              {activeTab === index && item.children && (
                <div
                  className="absolute left-0 top-full z-50"
                  onMouseEnter={handleSubMenuMouseEnter}
                  onMouseLeave={handleSubMenuMouseLeave}
                >
                  <SubMenu items={item.children} onItemClick={onItemClick} />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center h-6 gap-4">
          <button
            onClick={handleLogout}
            className="bg- cursor-pointer text-gray-800 px-2 py-1 rounded hover:bg-red-600 hover:text-white transition-colors duration-150"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
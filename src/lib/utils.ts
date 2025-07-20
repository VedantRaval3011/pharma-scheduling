// /lib/utils.ts (or wherever your utils are)

export interface NavItem {
  label: string;
  description?: string;
  children?: NavItem[];
  path?: string;
  roles?: ("super_admin" | "admin" | "employee")[];
}

export interface Module {
  moduleId: string;
  modulePath: string;
  moduleName: string;
}

export function flattenNavData(navData: NavItem[]): Module[] {
  const modules: Module[] = [];
  
  function traverse(items: NavItem[]) {
    items.forEach((item) => {
      // If the item has a path, it's a leaf node - add it as a module
      if (item.path) {
        modules.push({
          moduleId: item.path, // Use path as moduleId
          modulePath: item.path,
          moduleName: item.label
        });
      }
      
      // If the item has children, recursively traverse them
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    });
  }
  
  traverse(navData);
  return modules;
}

// Alternative version that also includes parent categories as modules
export function flattenNavDataWithParents(navData: NavItem[]): Module[] {
  const modules: Module[] = [];
  
  function traverse(items: NavItem[], parentPath = '') {
    items.forEach((item) => {
      const currentPath = item.path || `${parentPath}/${item.label.toLowerCase().replace(/\s+/g, '-')}`;
      
      // Add current item as a module if it has a path or if you want to include parent categories
      if (item.path) {
        modules.push({
          moduleId: item.path,
          modulePath: item.path,
          moduleName: item.label
        });
      }
      
      // Recursively traverse children
      if (item.children && item.children.length > 0) {
        traverse(item.children, currentPath);
      }
    });
  }
  
  traverse(navData);
  return modules;
}

// Debug version to see what's happening
export function debugFlattenNavData(navData: NavItem[]): Module[] {
  console.log('Input navData:', navData);
  const modules: Module[] = [];
  
  function traverse(items: NavItem[], depth = 0) {
    const indent = '  '.repeat(depth);
    console.log(`${indent}Traversing ${items.length} items at depth ${depth}`);
    
    items.forEach((item, index) => {
      console.log(`${indent}Item ${index}:`, {
        label: item.label,
        path: item.path,
        hasChildren: !!(item.children && item.children.length > 0),
        childrenCount: item.children?.length || 0
      });
      
      if (item.path) {
        const module = {
          moduleId: item.path,
          modulePath: item.path,
          moduleName: item.label
        };
        modules.push(module);
        console.log(`${indent}  -> Added module:`, module);
      }
      
      if (item.children && item.children.length > 0) {
        console.log(`${indent}  -> Traversing ${item.children.length} children`);
        traverse(item.children, depth + 1);
      }
    });
  }
  
  traverse(navData);
  console.log('Final modules:', modules);
  return modules;
}

// Test function to validate your navigation data
export function testNavigationData(navData: NavItem[]) {
  console.group('Navigation Data Analysis');
  
  let totalItems = 0;
  let itemsWithPaths = 0;
  let maxDepth = 0;
  
  function analyze(items: NavItem[], depth = 0) {
    maxDepth = Math.max(maxDepth, depth);
    
    items.forEach(item => {
      totalItems++;
      if (item.path) itemsWithPaths++;
      
      if (item.children) {
        analyze(item.children, depth + 1);
      }
    });
  }
  
  analyze(navData);
  
  console.log('Total items:', totalItems);
  console.log('Items with paths:', itemsWithPaths);
  console.log('Max depth:', maxDepth);
  console.log('Sample items with paths:');
  
  const sampleModules = flattenNavData(navData).slice(0, 5);
  sampleModules.forEach(module => {
    console.log(`  - ${module.moduleName}: ${module.modulePath}`);
  });
  
  console.groupEnd();
  
  return {
    totalItems,
    itemsWithPaths,
    maxDepth,
    modules: flattenNavData(navData)
  };
}
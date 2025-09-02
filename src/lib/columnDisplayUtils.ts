import React from "react";

interface ColumnDescription {
  prefixId?: { name: string } | null;
  carbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId?: { name: string } | null;
  makeId: { make: string; description?: string };
}

interface ColumnData {
  columnCode: string;
  descriptions: ColumnDescription[];
}

/**
 * Formats a column display text based on the column description
 * Pattern: ${prefix} ${carbonType} ${innerDiameter} x ${length} ${particleSize}μm ${suffix}-${make}
 * 
 * @param description - Column description object with populated references
 * @returns Formatted display text string
 */
export const formatColumnDisplayText = (description: ColumnDescription): string => {
  const parts: string[] = [];
  
  // Add prefix if exists
  if (description.prefixId?.name) {
    parts.push(description.prefixId.name);
  }
  
  // Add carbon type
  if (description.carbonType) {
    parts.push(description.carbonType);
  }
  
  // Add dimensions: innerDiameter x length
  if (description.innerDiameter && description.length) {
    parts.push(`${description.innerDiameter} x ${description.length}`);
  } else if (description.innerDiameter) {
    parts.push(`${description.innerDiameter}`);
  } else if (description.length) {
    parts.push(`${description.length}`);
  }
  
  // Add particle size with μm unit
  if (description.particleSize) {
    parts.push(`${description.particleSize}μm`);
  }
  
  // Add suffix if exists
  if (description.suffixId?.name) {
    parts.push(description.suffixId.name);
  }
  
  // Join the main parts with spaces
  let displayText = parts.join(' ');
  
  // Add make with dash separator
  if (description.makeId?.make) {
    displayText += `-${description.makeId.make}`;
  }
  
  return displayText.trim();
};

/**
 * Formats column display text for a complete column with multiple descriptions
 * Returns the first description's display text or column code as fallback
 * 
 * @param column - Column data with descriptions
 * @returns Formatted display text string
 */
export const formatColumnDisplayTextFromColumn = (column: ColumnData): string => {
  if (column.descriptions && column.descriptions.length > 0) {
    return formatColumnDisplayText(column.descriptions[0]);
  }
  return column.columnCode || 'Unknown Column';
};

/**
 * Formats column display text for API usage where we might have partial data
 * Handles cases where references might not be populated
 * 
 * @param description - Column description (might have IDs instead of populated objects)
 * @param prefixName - Optional prefix name if not populated in description
 * @param suffixName - Optional suffix name if not populated in description
 * @param makeName - Optional make name if not populated in description
 * @returns Formatted display text string
 */
export const formatColumnDisplayTextWithFallbacks = (
  description: any,
  prefixName?: string,
  suffixName?: string,
  makeName?: string
): string => {
  const parts: string[] = [];
  
  // Add prefix
  const prefix = description.prefixId?.name || prefixName;
  if (prefix) {
    parts.push(prefix);
  }
  
  // Add carbon type
  if (description.carbonType) {
    parts.push(description.carbonType);
  }
  
  // Add dimensions
  if (description.innerDiameter && description.length) {
    parts.push(`${description.innerDiameter} x ${description.length}`);
  } else if (description.innerDiameter) {
    parts.push(`${description.innerDiameter}`);
  } else if (description.length) {
    parts.push(`${description.length}`);
  }
  
  // Add particle size
  if (description.particleSize) {
    parts.push(`${description.particleSize}μm`);
  }
  
  // Add suffix
  const suffix = description.suffixId?.name || suffixName;
  if (suffix) {
    parts.push(suffix);
  }
  
  // Join main parts
  let displayText = parts.join(' ');
  
  // Add make
  const make = description.makeId?.make || makeName;
  if (make) {
    displayText += `-${make}`;
  }
  
  return displayText.trim();
};

/**
 * Async function to fetch column data and return formatted display text
 * Use this when you have a column ID and need to fetch the full data
 * Includes companyId and locationId from local storage as query parameters
 * 
 * @param columnId - The column ID to fetch
 * @param apiEndpoint - Optional custom API endpoint (defaults to /api/admin/column)
 * @returns Promise<string> - Formatted display text
 */
export const fetchColumnDisplayText = async (
  columnId: string,
  apiEndpoint: string = '/api/admin/column'
): Promise<string> => {
  try {
    // Retrieve companyId and locationId from local storage
    const companyId = localStorage.getItem('companyId') || '';
    const locationId = localStorage.getItem('locationId') || '';

    // Construct the URL with query parameters
    const queryParams = new URLSearchParams();
    if (companyId) queryParams.append('companyId', companyId);
    if (locationId) queryParams.append('locationId', locationId);

    const url = `${apiEndpoint}/${columnId}?${queryParams.toString()}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success && data.data) {
      // If the API returns a pre-formatted displayText, use it
      if (data.data.displayText) {
        return data.data.displayText;
      }
      
      // Otherwise, format it using our utility
      if (data.data.descriptions && data.data.descriptions.length > 0) {
        return formatColumnDisplayText(data.data.descriptions[0]);
      }
      
      // Fallback to column code or name
      return data.data.columnCode || data.data.columnName || data.data.description || columnId;
    }
  } catch (error) {
    console.error('Error fetching column details:', error);
  }
  
  return columnId; // Return the ID as fallback
};

/**
 * Hook for React components to manage column display texts
 * Use this in your React components to easily manage multiple column display texts
 */
export const useColumnDisplayTexts = () => {
  const [columnDisplayTexts, setColumnDisplayTexts] = React.useState<{
    [key: string]: string;
  }>({});
  
  const loadColumnDisplayText = async (columnId: string, key?: string) => {
    const displayKey = key || columnId;
    try {
      const displayText = await fetchColumnDisplayText(columnId);
      setColumnDisplayTexts(prev => ({
        ...prev,
        [displayKey]: displayText
      }));
      return displayText;
    } catch (error) {
      console.error('Error loading column display text:', error);
      setColumnDisplayTexts(prev => ({
        ...prev,
        [displayKey]: columnId
      }));
      return columnId;
    }
  };
  
  const getColumnDisplayText = (key: string) => {
    return columnDisplayTexts[key] || '';
  };
  
  const setColumnDisplayText = (key: string, displayText: string) => {
    setColumnDisplayTexts(prev => ({
      ...prev,
      [key]: displayText
    }));
  };
  
  return {
    columnDisplayTexts,
    loadColumnDisplayText,
    getColumnDisplayText,
    setColumnDisplayText,
    setColumnDisplayTexts
  };
};
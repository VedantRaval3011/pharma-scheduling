"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MasterDataItem {
  _id: string;
  name?: string;
  api?: string;
  department?: string;
  testType?: string;
  detectorType?: string;
  pharmacopeial?: string;
  columnCode?: string;
  companyId?: string;
  locationId?: string;
}

interface OptionType {
  value: string;
  label: string;
}

interface MasterDataState {
  apis: MasterDataItem[];
  departments: MasterDataItem[];
  testTypes: MasterDataItem[];
  detectorTypes: MasterDataItem[];
  pharmacopoeials: MasterDataItem[];
  columns: MasterDataItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

interface MasterDataContextType extends MasterDataState {
  getApiOptions: () => OptionType[];
  getDepartmentOptions: () => OptionType[];
  getTestTypeOptions: () => OptionType[];
  getDetectorTypeOptions: () => OptionType[];
  getPharmacopoeialOptions: () => OptionType[];
  getColumnOptions: () => OptionType[];
  refreshData: () => Promise<void>;
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MASTER_DATA: 'masterData',
  LAST_UPDATED: 'masterDataLastUpdated',
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface MasterDataProviderProps {
  children: ReactNode;
}

export const MasterDataProvider: React.FC<MasterDataProviderProps> = ({ children }) => {
  const [state, setState] = useState<MasterDataState>({
    apis: [],
    departments: [],
    testTypes: [],
    detectorTypes: [],
    pharmacopoeials: [],
    columns: [],
    isLoading: true,
    error: null,
    lastUpdated: null,
  });

  // Get company and location IDs from localStorage (client-side only)
  const getStorageIds = () => {
    if (typeof window === "undefined") return { companyId: null, locationId: null };
    
    try {
      const companyId = localStorage.getItem("companyId");
      const locationId = localStorage.getItem("locationId");
      return { companyId, locationId };
    } catch (error) {
      console.error('Error accessing localStorage:', error);
      return { companyId: null, locationId: null };
    }
  };

  // Load data from localStorage
  const loadFromCache = (): boolean => {
    if (typeof window === "undefined") return false;
    
    try {
      const cachedData = localStorage.getItem(STORAGE_KEYS.MASTER_DATA);
      const lastUpdated = localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
      
      
      if (!cachedData || !lastUpdated) return false;
      
      const cacheAge = Date.now() - parseInt(lastUpdated);
      if (cacheAge > CACHE_DURATION) {
        console.log('Cache is stale, removing...'); // Debug log
        localStorage.removeItem(STORAGE_KEYS.MASTER_DATA);
        localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED);
        return false;
      }

      const parsedData = JSON.parse(cachedData);
      console.log('Loaded from cache:', parsedData); // Debug log
      
      setState(prev => ({
        ...prev,
        ...parsedData,
        isLoading: false,
        lastUpdated: new Date(parseInt(lastUpdated)).toISOString(),
      }));
      
      return true;
    } catch (error) {
      console.error('Error loading master data from cache:', error);
      return false;
    }
  };

  // Save data to localStorage
  const saveToCache = (data: Partial<MasterDataState>) => {
    if (typeof window === "undefined") return;
    
    try {
      const dataToCache = {
        apis: data.apis || [],
        departments: data.departments || [],
        testTypes: data.testTypes || [],
        detectorTypes: data.detectorTypes || [],
        pharmacopoeials: data.pharmacopoeials || [],
        columns: data.columns || [],
      };
      
      localStorage.setItem(STORAGE_KEYS.MASTER_DATA, JSON.stringify(dataToCache));
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
    } catch (error) {
      console.error('Error saving master data to cache:', error);
    }
  };

  // Fetch master data from bulk API
  const fetchMasterData = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { companyId, locationId } = getStorageIds();
      
      if (!companyId || !locationId) {
        const errorMsg = 'Company ID and Location ID are required. Please ensure you are logged in.';
        console.error(errorMsg, { companyId, locationId }); // Debug log
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));
        return;
      }

      const params = new URLSearchParams({ companyId, locationId });
      const url = `/api/master-data/bulk?${params}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText); // Debug log
        throw new Error(`Failed to fetch master data: ${response.status} - ${errorText}`);
      }

      const apiResponse = await response.json();
      
      // ✅ FIXED: Correct data access pattern
      const responseData = apiResponse.data || apiResponse;
      
      const newState = {
        apis: responseData.apis || [],
        departments: responseData.departments || [],
        testTypes: responseData.testTypes || [],
        detectorTypes: responseData.detectorTypes || [],
        pharmacopoeials: responseData.pharmacopoeials || [],
        columns: responseData.columns || [], // This might be empty if not included in API
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };

      setState(prev => ({ ...prev, ...newState }));
      saveToCache(newState);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch master data';
      console.error('Error fetching master data:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  // Helper functions to get options for dropdowns
  const getApiOptions = (): OptionType[] => {
    const options = state.apis.map(item => ({
      value: item._id,
      label: item.api || item.name || 'Unknown API'
    }));
    return options;
  };

  const getDepartmentOptions = (): OptionType[] => {
    const options = state.departments.map(item => ({
      value: item._id,
      label: item.department || item.name || 'Unknown Department'
    }));
    return options;
  };

  const getTestTypeOptions = (): OptionType[] => {
    const options = state.testTypes.map(item => ({
      value: item._id,
      label: item.testType || item.name || 'Unknown Test Type'
    }));
    return options;
  };

  const getDetectorTypeOptions = (): OptionType[] => {
    const options = state.detectorTypes.map(item => ({
      value: item._id,
      label: item.detectorType || item.name || 'Unknown Detector Type'
    }));
    return options;
  };

  const getPharmacopoeialOptions = (): OptionType[] => {
    const options = state.pharmacopoeials.map(item => ({
      value: item._id,
      label: item.pharmacopeial || item.name || 'Unknown Pharmacopoeial'
    }));
    return options;
  };

  const getColumnOptions = (): OptionType[] => {
    const options = state.columns.map(item => ({
      value: item._id,
      label: item.columnCode || item.name || 'Unknown Column'
    }));
    return options;
  };

  // Initialize data loading
  useEffect(() => {
    const initializeData = async () => {
      
      // Only proceed if we're on the client side
      if (typeof window === "undefined") return;
      
      // Wait a bit for the component to mount and localStorage to be available
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // First, try to load from cache for instant display
      const cacheLoaded = loadFromCache();
      
      if (!cacheLoaded) {
        // No cache, fetch from API
        await fetchMasterData();
      } else {
        // Cache loaded, fetch in background to refresh
        setTimeout(() => {
          fetchMasterData();
        }, 1000);
      }
    };

    initializeData();
  }, []);

  const contextValue: MasterDataContextType = {
    ...state,
    getApiOptions,
    getDepartmentOptions,
    getTestTypeOptions,
    getDetectorTypeOptions,
    getPharmacopoeialOptions,
    getColumnOptions,
    refreshData: fetchMasterData,
  };

  return (
    <MasterDataContext.Provider value={contextValue}>
      {children}
    </MasterDataContext.Provider>
  );
};

// Custom hook to use master data context
export const useMasterDataContext = (): MasterDataContextType => {
  const context = useContext(MasterDataContext);
  
  if (context === undefined) {
    throw new Error('useMasterDataContext must be used within a MasterDataProvider');
  }
  
  return context;
};

export default MasterDataProvider;
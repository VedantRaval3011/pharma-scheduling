'use client';

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

interface MobilePhaseItem {
  _id: string;
  mobilePhaseId: string;
  mobilePhaseCode: string;
  isSolvent: boolean;
  isBuffer: boolean;
  bufferName?: string;
  solventName?: string;
  chemicals: string[];
  pHValue?: number;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
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
  mobilePhases: MobilePhaseItem[];
  isLoading: boolean;
  isMobilePhasesLoading: boolean; // Separate loading state for mobile phases
  error: string | null;
  lastUpdated: string | null;
  mobilePhasesLastUpdated: string | null; // Separate last updated for mobile phases
}

interface MasterDataContextType extends MasterDataState {
  getApiOptions: () => OptionType[];
  getDepartmentOptions: () => OptionType[];
  getTestTypeOptions: () => OptionType[];
  getDetectorTypeOptions: () => OptionType[];
  getPharmacopoeialOptions: () => OptionType[];
  getColumnOptions: () => OptionType[];
  getMobilePhaseOptions: () => OptionType[];
  refreshData: () => Promise<void>;
  refreshMobilePhases: () => Promise<void>; // New method for refreshing only mobile phases
  clearMobilePhaseCache: () => void; // Method to clear mobile phase cache
}

const MasterDataContext = createContext<MasterDataContextType | undefined>(undefined);

const STORAGE_KEYS = {
  MASTER_DATA: 'masterData',
  MOBILE_PHASES: 'mobilePhases',
  LAST_UPDATED: 'masterDataLastUpdated',
  MOBILE_PHASES_LAST_UPDATED: 'mobilePhasesLastUpdated',
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
    mobilePhases: [],
    isLoading: true,
    isMobilePhasesLoading: false,
    error: null,
    lastUpdated: null,
    mobilePhasesLastUpdated: null,
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

  // Load master data from localStorage
  const loadMasterDataFromCache = (): boolean => {
    if (typeof window === "undefined") return false;
    
    try {
      const cachedData = localStorage.getItem(STORAGE_KEYS.MASTER_DATA);
      const lastUpdated = localStorage.getItem(STORAGE_KEYS.LAST_UPDATED);
      
      if (!cachedData || !lastUpdated) return false;
      
      const cacheAge = Date.now() - parseInt(lastUpdated);
      if (cacheAge > CACHE_DURATION) {
        localStorage.removeItem(STORAGE_KEYS.MASTER_DATA);
        localStorage.removeItem(STORAGE_KEYS.LAST_UPDATED);
        return false;
      }

      const parsedData = JSON.parse(cachedData);
      
      setState(prev => ({
        ...prev,
        ...parsedData,
        lastUpdated: new Date(parseInt(lastUpdated)).toISOString(),
      }));
      
      return true;
    } catch (error) {
      console.error('Error loading master data from cache:', error);
      return false;
    }
  };

  // Load mobile phases from localStorage
  const loadMobilePhasesFromCache = (): boolean => {
    if (typeof window === "undefined") return false;
    
    try {
      const cachedData = localStorage.getItem(STORAGE_KEYS.MOBILE_PHASES);
      const lastUpdated = localStorage.getItem(STORAGE_KEYS.MOBILE_PHASES_LAST_UPDATED);
      
      if (!cachedData || !lastUpdated) return false;
      
      const cacheAge = Date.now() - parseInt(lastUpdated);
      if (cacheAge > CACHE_DURATION) {
        localStorage.removeItem(STORAGE_KEYS.MOBILE_PHASES);
        localStorage.removeItem(STORAGE_KEYS.MOBILE_PHASES_LAST_UPDATED);
        return false;
      }

      const mobilePhases = JSON.parse(cachedData);
      const mobilePhasesLastUpdated = new Date(parseInt(lastUpdated)).toISOString();
      
      setState(prev => ({
        ...prev,
        mobilePhases,
        mobilePhasesLastUpdated,
        isMobilePhasesLoading: false,
      }));
      
      return true;
    } catch (error) {
      console.error('Error loading mobile phases from cache:', error);
      return false;
    }
  };

  // Save master data to localStorage
  const saveMasterDataToCache = (data: Partial<MasterDataState>) => {
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

  // Save mobile phases to localStorage
  const saveMobilePhasesToCache = (mobilePhases: MobilePhaseItem[]) => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.setItem(STORAGE_KEYS.MOBILE_PHASES, JSON.stringify(mobilePhases));
      localStorage.setItem(STORAGE_KEYS.MOBILE_PHASES_LAST_UPDATED, Date.now().toString());
    } catch (error) {
      console.error('Error saving mobile phases to cache:', error);
    }
  };

  // Clear mobile phase cache
  const clearMobilePhaseCache = () => {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.removeItem(STORAGE_KEYS.MOBILE_PHASES);
      localStorage.removeItem(STORAGE_KEYS.MOBILE_PHASES_LAST_UPDATED);
      console.log('Mobile phase cache cleared');
    } catch (error) {
      console.error('Error clearing mobile phase cache:', error);
    }
  };

  // Fetch mobile phases from API
  const fetchMobilePhases = async (forceRefresh: boolean = false): Promise<void> => {
    try {
      if (forceRefresh) {
        setState(prev => ({ ...prev, isMobilePhasesLoading: true }));
      }

      const { companyId, locationId } = getStorageIds();
      
      if (!companyId || !locationId) {
        console.warn('Missing companyId or locationId for mobile phases');
        setState(prev => ({ ...prev, isMobilePhasesLoading: false }));
        return;
      }

      const response = await fetch(
        `/api/admin/mobile-phase?companyId=${companyId}&locationId=${locationId}&_t=${Date.now()}` // Add timestamp to prevent caching
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch mobile phases: ${response.status}`);
      }

      const apiResponse = await response.json();
      
      if (apiResponse.success && apiResponse.data) {
        const mobilePhases = apiResponse.data;
        const mobilePhasesLastUpdated = new Date().toISOString();
        
        setState(prev => ({
          ...prev,
          mobilePhases,
          mobilePhasesLastUpdated,
          isMobilePhasesLoading: false,
        }));
        
        saveMobilePhasesToCache(mobilePhases);
        
        if (forceRefresh) {
          console.log(`Refreshed ${mobilePhases.length} mobile phases`);
        }
      }
    } catch (error) {
      console.error('Error fetching mobile phases:', error);
      setState(prev => ({ ...prev, isMobilePhasesLoading: false }));
      // Don't set error state for mobile phases, just log it
    }
  };

  // New method to refresh only mobile phases
  const refreshMobilePhases = async (): Promise<void> => {
    console.log('Refreshing mobile phases...');
    clearMobilePhaseCache(); // Clear cache first to ensure fresh data
    await fetchMobilePhases(true); // Force refresh
  };

  // Fetch master data from bulk API
  const fetchMasterData = async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, error: null }));

      const { companyId, locationId } = getStorageIds();
      
      if (!companyId || !locationId) {
        const errorMsg = 'Company ID and Location ID are required. Please ensure you are logged in.';
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
        throw new Error(`Failed to fetch master data: ${response.status} - ${errorText}`);
      }

      const apiResponse = await response.json();
      const responseData = apiResponse.data || apiResponse;
      
      const newState = {
        apis: responseData.apis || [],
        departments: responseData.departments || [],
        testTypes: responseData.testTypes || [],
        detectorTypes: responseData.detectorTypes || [],
        pharmacopoeials: responseData.pharmacopoeials || [],
        columns: responseData.columns || [],
        isLoading: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      };

      setState(prev => ({ ...prev, ...newState }));
      saveMasterDataToCache(newState);
      
      // Fetch mobile phases in background
      fetchMobilePhases();
      
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
    return state.apis.map(item => ({
      value: item._id,
      label: item.api || item.name || 'Unknown API'
    }));
  };

  const getDepartmentOptions = (): OptionType[] => {
    return state.departments.map(item => ({
      value: item._id,
      label: item.department || item.name || 'Unknown Department'
    }));
  };

  const getTestTypeOptions = (): OptionType[] => {
    return state.testTypes.map(item => ({
      value: item._id,
      label: item.testType || item.name || 'Unknown Test Type'
    }));
  };

  const getDetectorTypeOptions = (): OptionType[] => {
    return state.detectorTypes.map(item => ({
      value: item._id,
      label: item.detectorType || item.name || 'Unknown Detector Type'
    }));
  };

  const getPharmacopoeialOptions = (): OptionType[] => {
    return state.pharmacopoeials.map(item => ({
      value: item._id,
      label: item.pharmacopeial || item.name || 'Unknown Pharmacopeial'
    }));
  };

  const getColumnOptions = (): OptionType[] => {
    return state.columns.map(item => ({
      value: item._id,
      label: item.columnCode || item.name || 'Unknown Column'
    }));
  };

  const getMobilePhaseOptions = (): OptionType[] => {
    return state.mobilePhases.map(item => ({
      value: item.mobilePhaseCode,
      label: `${item.mobilePhaseCode} - ${item.isBuffer ? item.bufferName : item.solventName}`
    }));
  };

  // Initialize data loading with instant cache loading
  useEffect(() => {
    const initializeData = async () => {
      if (typeof window === "undefined") return;
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Load master data from cache first for instant display
      const masterDataLoaded = loadMasterDataFromCache();
      
      // Load mobile phases from cache instantly
      const mobilePhasesLoaded = loadMobilePhasesFromCache();
      
      if (!masterDataLoaded) {
        // No master data cache, fetch from API
        await fetchMasterData();
      } else {
        // Cache loaded, set loading to false immediately
        setState(prev => ({ ...prev, isLoading: false }));
        
        // Fetch in background to refresh data
        setTimeout(() => {
          fetchMasterData();
        }, 1000);
      }
      
      // If mobile phases weren't in cache, fetch them
      if (!mobilePhasesLoaded) {
        fetchMobilePhases();
      } else {
        // Refresh mobile phases in background
        setTimeout(() => {
          fetchMobilePhases();
        }, 2000);
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
    getMobilePhaseOptions,
    refreshData: fetchMasterData,
    refreshMobilePhases, // New method
    clearMobilePhaseCache, // New method
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
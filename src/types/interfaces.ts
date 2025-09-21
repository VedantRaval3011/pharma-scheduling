// Enhanced interfaces with drag and drop support
export interface Test {
  testTypeId: string;
  testName: string;
  columnCode: string;
  mobilePhaseCodes: string[];
  detectorTypeId: string;
  pharmacopoeialId: string;
  blankInjection: number;
  standardInjection: number;
  sampleInjection: number;
  systemSuitability: number;
  sensitivity: number;
  placebo: number;
  reference1: number;
  reference2: number;
  bracketingFrequency: number;
  runTime: number;
  washTime: number;
  blankRunTime: number;
  standardRunTime: number;
  sampleRunTime: number;
  systemSuitabilityRunTime: number;
  sensitivityRunTime: number;
  placeboRunTime: number;
  reference1RunTime: number;
  reference2RunTime: number;
  outsourced: boolean;
  continueTests: boolean;
  testStatus: string;
  numberOfInjections?: number;
  numberOfInjectionsAMV?: number;
  numberOfInjectionsPV?: number;
  numberOfInjectionsCV?: number;
  uniqueRuntimes?: boolean;
}

export interface Generic {
  genericName: string;
  apis: {
    apiName: string;
    testTypes: Test[];
  }[];
}

export interface BatchItem {
  id: string;
  companyId: string;
  locationId: string;
  productCode: string;
  productName: string;
  genericName: string;
  priority: string;
  batchNumber: string;
  tests: Test[];
  batchStatus: string;
  typeOfSample: string;
  mfcNumber: string;
  pharmacopoeialName: string;
  generics: Generic[];
}

export interface CalculationBreakdown {
  injectionCounts: { [key: string]: number };
  runtimes: { [key: string]: number };
  totalCountedInjections: number;
  washCycles: number;
  runtimeMinutes: number;
  washMinutes: number;
  totalMinutes: number;
  hasUniqueRuntimes: boolean;
  washInterval: number;
  formula: string;
  steps: string[];
  bracketingInjections?: number;
}

export interface ScheduledTest {
  id: string;
  batchId: string;
  batchNumber: string;
  productCode: string;
  productName: string;
  testName: string;
  columnCode: string;
  detectorTypeId: string;
  mobilePhaseCodes: string[];
  priority: string;
  executionTime: number;
  originalExecutionTime: number;
  washTime: number;
  bracketingFrequency: number;
  groupId?: string;
  groupReason?: string;
  isGrouped: boolean;
  timeSaved?: number;
  originalTest?: Test;
  calculationBreakdown?: CalculationBreakdown;
  sortOrder?: number; // Add for explicit ordering
}

export interface GroupInfo {
  id: string;
  reason: string;
  detectorId: string;
  columnCode: string;
  mobilePhaseKey: string;
  tests: ScheduledTest[];
  totalTime: number;
  originalTotalTime: number;
  timeSaved: number;
}

export interface HPLCMaster {
  id: string;
  hplcName: string;
  hplcModel: string;
  status: string;
  internalCode?: string;
  isActive?: boolean;
}

export interface HPLCSchedule {
  hplcId: string;
  hplcName: string;
  tests: ScheduledTest[];
  groups: GroupInfo[];
  totalTime: number;
  isDraggedOver?: boolean; // For visual feedback
}

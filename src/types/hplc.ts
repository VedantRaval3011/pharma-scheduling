// types/hplc.ts
export interface MobilePhaseCodes extends Array<string> {
  0: string; // Master phase 1
  1: string; // Master phase 2
  2: string; // Master phase 3
  3: string; // Master phase 4
  4: string; // Wash phase 1
  5: string; // Wash phase 2
}

export interface TestType {
  testTypeId: string;
  testName: string;
  columnCode: string;
  mobilePhaseCodes: MobilePhaseCodes;
  detectorType?: string;
  detectorTypeId?: string;
  sampleInjection: number;
  standardInjection: number;
  blankInjection: number;
  runTime: number;
}

export interface API {
  apiName: string;
  _id: string;
  testTypes: TestType[];
}

export interface Generic {
  genericName: string;
  _id: string;
  apis: API[];
}

export interface MFCData {
  _id: string;
  mfcNumber: string;
  productIds: string[];
  generics: Generic[];
}

export interface PriorityInfo {
  label: string;
  color: string;
  order: number;
  icon: string;
}

export interface ExtractedPhases {
  masterPhases: string[];
  washPhases: string[];
}

export interface BatchMFC {
  mfcId: string;
  mfcNumber: string;
  genericName: string;
  priority: 'urgent' | 'high' | 'normal';
  testTypes: TestType[];
}

// Updated OptimizedGroup interface with complete test details
export interface OptimizedGroup {
  priority: 'urgent' | 'high' | 'normal';
  column: string;
  masterPhases: string[];
  washPhases: string[];
  tests: Array<{
    mfcNumber: string;
    testName: string;
    runTime: number;
    columnCode: string;
    testTypeId: string;
    detectorType?: string;
    detectorTypeId?: string;
    sampleInjection: number;
    standardInjection: number;
    blankInjection: number;
    mobilePhaseCodes: MobilePhaseCodes;
  }>;
  groupedRuntime: number;
  washTime: number;
  executionOrder: number;
}

export interface OptimizationResult {
  originalTime: number;
  optimizedTime: number;
  timeSaved: number;
  groups: OptimizedGroup[];
  totalWashTime: number;
}

export interface PlanningData {
  batchNumber: string;
  batchName: string;
  mfcs: BatchMFC[];
  optimization: OptimizationResult;
  createdAt: string;
}

export interface ScheduledBatch {
  id: string;
  name: string;
  number: string;
  planningData: PlanningData;
  status: 'pending' | 'running' | 'completed';
  createdAt: string;
}

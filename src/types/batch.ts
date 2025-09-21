// types/batch.ts
import { Document, ObjectId } from 'mongoose';

// ====== FRONTEND TYPES ======

// Base Test Interface for API Responses
export interface BatchTest {
  testId: string;
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
  outsourced: boolean;
  continueTests: boolean;
  testStatus: 'Not Started' | 'In Progress' | 'Closed';
  startedAt?: string;
  endedAt?: string;
}

// Product within a Batch
export interface BatchProduct {
  productId: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcId: string;
  mfcNumber: string;
  pharmacopeiaToUse?: string;
  pharmacopoeialName?: string;
  tests: BatchTest[];
  productStatus: 'Not Started' | 'In Progress' | 'Closed';
  startedAt?: string;
  endedAt?: string;
}

// Updated BatchData for Multi-Product Support
export interface BatchData {
  _id?: string;
  companyId: string;
  locationId: string;
  batchNumber: string;
  manufacturingDate: string;
  priority: 'Urgent' | 'High' | 'Normal';
  batchStatus: 'Not Started' | 'In Progress' | 'Closed';
  typeOfSample: string;
  departmentId: string;
  departmentName: string;
  daysForUrgency: number;
  products: BatchProduct[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  endedAt?: string;
}

// Form Data Interface for the Frontend
export interface BatchFormData {
  batchNumber?: string;
  manufacturingDate?: string;
  priority?: 'Urgent' | 'High' | 'Normal';
  typeOfSample?: string;
  departmentName?: string;
  daysForUrgency?: number;
  batchStatus?: 'Not Started' | 'In Progress' | 'Closed';
  
  // For backward compatibility - current single product form
  productCode?: string;
  productName?: string;
  genericName?: string;
  pharmacopeiaToUse?: string;
  pharmacopoeialName?: string;
  mfcNumber?: string;
  tests?: Array<{
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
    outsourced: boolean;
    continueTests: boolean;
  }>;
}

// API Request Types
export interface CreateBatchRequest {
  companyId: string;
  locationId: string;
  batchNumber: string;
  manufacturingDate: string;
  priority?: 'Urgent' | 'High' | 'Normal';
  typeOfSample: string;
  departmentId: string;
  departmentName: string;
  daysForUrgency?: number;
  products: Array<{
    productId: string;
    productCode: string;
    productName: string;
    genericName: string;
    mfcId: string;
    pharmacopeiaToUse?: string;
    pharmacopoeialName?: string;
    tests: Array<{
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
      outsourced: boolean;
      continueTests: boolean;
    }>;
  }>;
  createdBy?: string;
}

export interface UpdateBatchRequest {
  batchNumber?: string;
  manufacturingDate?: string;
  priority?: 'Urgent' | 'High' | 'Normal';
  typeOfSample?: string;
  departmentName?: string;
  daysForUrgency?: number;
  batchStatus?: 'Not Started' | 'In Progress' | 'Closed';
  products?: BatchProduct[];
  
  // For specific updates
  action?: 'addProduct' | 'removeProduct';
  productId?: string;
  newProduct?: {
    productId: string;
    productCode: string;
    productName: string;
    genericName: string;
    mfcId: string;
    pharmacopeiaToUse?: string;
    pharmacopoeialName?: string;
    tests: Array<{
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
      outsourced: boolean;
      continueTests: boolean;
    }>;
  };
  
  // For status updates
  testId?: string;
  testStatus?: 'Not Started' | 'In Progress' | 'Closed';
  productStatus?: 'Not Started' | 'In Progress' | 'Closed';
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface BatchListResponse extends ApiResponse<BatchData[]> {}
export interface BatchDetailResponse extends ApiResponse<BatchData> {}

// ====== BACKEND/DATABASE TYPES ======

// Document Interfaces for Mongoose
export interface BatchTestDocument {
  testId: string;
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
  outsourced: boolean;
  continueTests: boolean;
  testStatus: 'Not Started' | 'In Progress' | 'Closed';
  startedAt?: Date;
  endedAt?: Date;
}

export interface BatchProductDocument {
  productId: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcId: string;
  mfcNumber: string;
  pharmacopeiaToUse?: string;
  pharmacopoeialName?: string;
  tests: BatchTestDocument[];
  productStatus: 'Not Started' | 'In Progress' | 'Closed';
  startedAt?: Date;
  endedAt?: Date;
}

export interface BatchInputDocument extends Document {
  companyId: string;
  locationId: string;
  batchNumber: string;
  manufacturingDate: Date;
  priority: 'Urgent' | 'High' | 'Normal';
  batchStatus: 'Not Started' | 'In Progress' | 'Closed';
  typeOfSample: string;
  departmentId: string;
  departmentName: string;
  daysForUrgency: number;
  products: BatchProductDocument[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

// Existing Types (keeping for compatibility)
export interface Product {
  _id: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcs: string[];
  pharmacopeiaToUse?: string;
}

export interface MFC {
  _id: string;
  mfcNumber: string;
  departmentId: string;
  generics: Array<{
    genericName: string;
    apis: Array<{
      testTypes: TestType[];
    }>;
  }>;
}

export interface TestType {
  testTypeId: string;
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
  bulk: boolean;
  fp: boolean;
  stabilityPartial: boolean;
  stabilityFinal: boolean;
  amv: boolean;
  pv: boolean;
  cv: boolean;
  isOutsourcedTest?: boolean;
}

export interface EnhancedTestType extends TestType {
  testTypeName?: string;
  columnName?: string;
  columnDetails?: string;
  detectorName?: string;
  pharmacopoeialName?: string;
}

export interface Department {
  _id: string;
  department: string;
  description: string;
  daysOfUrgency?: number;
}

export interface Pharmacopeial {
  _id: string;
  pharmacopeial: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TestTypeData {
  _id: string;
  testType: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DetectorTypeData {
  _id: string;
  detectorType: string;
  description: string;
  companyId: string;
  locationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnMake {
  _id: string;
  make: string;
  description: string | null;
}

export interface ColumnDescription {
  descriptionId: string;
  prefixId: {
    _id: string;
    name: string;
  } | null;
  carbonType: string;
  linkedCarbonType: string;
  innerDiameter: number;
  length: number;
  particleSize: number;
  suffixId: {
    _id: string;
    name: string;
  } | null;
  makeId: ColumnMake;
  columnId: string;
  installationDate: string;
  usePrefix: boolean;
  useSuffix: boolean;
  usePrefixForNewCode: boolean;
  useSuffixForNewCode: boolean;
  isObsolete: boolean;
}

export interface ColumnData {
  _id: string;
  columnCode: string;
  descriptions: ColumnDescription[];
  companyId: string;
  locationId: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  id: string;
}

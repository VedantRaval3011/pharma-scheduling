// types/batch.ts
export interface Product {
  _id: string;
  productName: string;
  productCode: string;
  genericName: string;
  mfcId: string;
}

export interface MFC {
  _id: string;
  mfcNumber: string;
  departmentId: string;
  apis: API[];
  bulk?: boolean;
  fp?: boolean;
  stabilityPartial?: boolean;
  stabilityFinal?: boolean;
  amv?: boolean;
  pv?: boolean;
  cv?: boolean;
}

export interface API {
  apiName: string;
  testTypes: TestType[];
}

export interface TestType {
  _id: string;
  testName: string;
  columnId?: string;
  pharmacopoeialId?: string;
  detectorId?: string;
  bulk?: boolean;
  fp?: boolean;
  stabilityPartial?: boolean;
  stabilityFinal?: boolean;
  amv?: boolean;
  pv?: boolean;
  cv?: boolean;
  mp1?: string;
  mp2?: string;
  mp3?: string;
  mp4?: string;
  wash1?: string;
  wash2?: string;
  blankInj?: number;
  stdInj?: number;
  sampleInj?: number;
  bracketFreq?: number;
  runtime?: number;
  washTime?: number;
}

export interface Department {
  _id: string;
  departmentName: string;
}

export interface Column {
  _id: string;
  columnName: string;
}

export interface Pharmacopoeial {
  _id: string;
  pharmacopoeialName: string;
}

export interface BatchTest {
  testTypeId: string;
  testName: string;
  outsourced: boolean;
  continueBatch: boolean;
}

export interface BatchInput {
  companyId: string;
  locationId: string;
  batchNumber: string;
  manufacturingDate: string;
  productId: string;
  productCode: string;
  productName: string;
  genericName: string;
  mfcId: string;
  mfcNumber: string;
  departmentId: string;
  departmentName: string;
  typeOfSample: string[];
  priority: string;
  daysForUrgency: number;
  tests: BatchTest[];
}

export interface Batch extends BatchInput {
  _id: string;
  startedAt?: Date;
  endedAt?: Date;
  status: 'Not Started' | 'In Progress' | 'Closed';
}

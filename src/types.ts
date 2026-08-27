export type UserRole = 'ADMIN' | 'QC_TESTER' | 'SUPERVISOR';

export interface User {
  id: string;
  name: string;
  employeeId: string; // NIK
  username?: string;
  password?: string;
  role: UserRole;
  email: string;
  signature?: string; // base64 or svg data
  department: string;
  active: boolean;
}

export type SpecType = 'MINIMUM' | 'MAXIMUM' | 'MIN_MAX' | 'TARGET_TOLERANCE' | 'TEXT';
export type BankConfig = 'SINGLE' | 'RH_LH';
export type ParameterCategory =
  | 'PERFORMANCE'
  | 'PRESSURE'
  | 'TEMPERATURE'
  | 'FLOW_LEVEL'
  | 'ELECTRICAL'
  | 'EMISSION_GAS'
  | 'GENERAL';

export interface LibraryParameter {
  id: string; // Internal unique ID e.g. "lib-param-01" or "PARAM-0001"
  parameterCode: string; // Display Code e.g. "PARAM-0001"
  name: string; // e.g. "Power", "Torque", "Exhaust Temperature"
  description?: string;
  category: ParameterCategory;
  defaultUnit: string; // e.g. HP, kgm, °C, mmHg, kg/cm²
  defaultSpecType: SpecType;
  defaultSpecText?: string;
  defaultBankConfig: BankConfig;
  defaultMinValue?: number;
  defaultMaxValue?: number;
  defaultTargetValue?: number;
  defaultTolerance?: number;
  defaultRequired: boolean;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProductTestParameter {
  id: string;
  parameterId?: string; // Reference to LibraryParameter.parameterCode (e.g. "PARAM-0001")
  order: number;
  name: string;
  description?: string;
  category?: ParameterCategory | string;
  specType: SpecType;
  specText: string; // e.g. "1200 ± 40 HP at 1900 rpm", "Max. 650°C", "3.0 ~ 4.5 kg/cm²"
  unit: string; // HP, kgm, °C, mmHg, kg/cm², mmH2O, Volt, etc.
  bankConfig: BankConfig; // 'SINGLE' or 'RH_LH'
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number; // ± tolerance
  required: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  sourceType?: 'LIBRARY' | 'CUSTOM';
}

export interface Product {
  id: string;
  productType: string; // e.g. ENGINE ASSY, TORQUE CONVERTER ASSY, TRANSMISSION
  productName: string; // e.g. KOMATSU DIESEL ENGINE
  model: string; // e.g. SAA12V140E-3
  componentPartNumber: string; // e.g. 6219-B0-0041
  machineModel: string; // e.g. HD785-7
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  revision: number;
  effectiveDate: string;
  ratedPowerRpm?: number; // Target RPM for Rated Power (e.g. 1900 RPM)
  ratedTorqueRpm?: number; // Target RPM for Rated Torque (e.g. 1350 RPM)
  parameters: ProductTestParameter[];
}

export type SamplingCondition = 'LOW_IDLE' | 'LOAD' | 'HIGH_IDLE';

export interface PerformanceSamplingPoint {
  id: string;
  condition: SamplingCondition;
  conditionLabel?: string; // 'Low Idle', 'Load', 'High Idle'
  targetRpm: number;
  actualRpm?: number;
  rawPower?: number;
  correctedPower?: number;
  rawTorque?: number;
  correctedTorque?: number;
  available: boolean;
  differenceRpm?: number;
  lineNumber?: number;
  notes?: string;
}

export interface DynProDataPoint {
  lineNumber?: number; // Line number from DynPro logger (e.g. 1 to 41)
  rpm: number; // EngSpd (RPM)
  rawPower: number; // Eng_Power (Hp)
  rawTorque: number; // Eng_Torque (Kgm)
  operatingMode?: 'LOAD' | 'NO_LOAD'; // Classified mode: LOAD vs NO_LOAD (Idle/Unloaded)
  correctedPower?: number; // JIS Corrected Power (Hp) = Raw Power * JIS Factor
  correctedTorque?: number; // JIS Corrected Torque (Kgm) = Raw Torque * JIS Factor
}

export interface RatedPointResult {
  targetRpm: number;
  actualRpm: number;
  rawHp?: number;
  correctedHp?: number;
  rawTorque?: number;
  correctedTorque?: number;
  differenceRpm: number;
}

export interface DynProFileInfo {
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  fileData?: string; // base64 or dataUrl to retain original uploaded DynPro PDF
}

export interface TestBenchOption {
  code: string;
  name: string;
  location: string;
}

export type TestStatus = 'DRAFT' | 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED';
export type WorkflowStatus = TestStatus;
export type PassFailStatus = 'PASS' | 'FAIL' | 'PENDING';

export interface TestResultItem {
  parameterId: string;
  order: number;
  parameterName: string;
  specType: SpecType;
  specText: string;
  unit: string;
  bankConfig: BankConfig;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  tolerance?: number;
  
  // Actual values input
  actualValue?: number | string;
  actualRh?: number;
  actualLh?: number;
  
  // Status calculated automatically
  status: PassFailStatus;
  statusRh?: PassFailStatus;
  statusLh?: PassFailStatus;
  notes?: string;
}

export interface ApprovalRecord {
  id: string;
  type: 'QC_SUBMIT' | 'SUPERVISOR_APPROVE' | 'SUPERVISOR_REJECT';
  userId: string;
  userName: string;
  employeeId: string;
  userRole: UserRole;
  signature: string; // base64 or drawn svg
  timestamp: string;
  notes?: string;
  rejectionReason?: string;
}

export interface AuditEvent {
  id: string;
  testRecordId?: string;
  recordId?: string;
  action: string;
  details: string;
  performedBy: string;
  role: UserRole;
  timestamp: string;
  previousValue?: string;
  newValue?: string;
}

export interface TestRecord {
  id: string;
  certificateNumber: string; // e.g. KRA-DYNO-2026-000001
  workflowStatus: TestStatus;
  overallResult: PassFailStatus;
  
  // Product & Test Information
  productId?: string;
  productRevision?: number;
  productType?: string;
  productName: string;
  jobOrder: string;
  typeModel: string;
  serialNumber: string;
  componentPartNumber: string;
  machineModel: string;
  testBenchCode: string; // e.g. TB-01
  testBenchName: string; // e.g. Dyno Test Bench 01
  testDate: string;
  
  // Tester Information
  testerId: string;
  testerName: string;
  testerEmployeeId: string;
  testerSignature?: string;
  testedAt?: string;
  
  // Supervisor Information
  supervisorId?: string;
  supervisorName?: string;
  supervisorEmployeeId?: string;
  supervisorSignature?: string;
  approvedAt?: string;
  rejectionReason?: string;
  
  // Test Results
  results: TestResultItem[];
  totalParameters: number;
  passedParameters: number;
  failedParameters: number;
  
  // DynPro Performance Test Data & Traceability
  jisFactor?: number; // Mandatory JIS Correction Factor entered by QC Tester
  dynProFile?: DynProFileInfo; // Retained original uploaded DynPro PDF
  performanceData?: DynProDataPoint[]; // Extracted & JIS corrected performance curves (RPM, Power, Torque)
  samplingPoints?: PerformanceSamplingPoint[]; // 9 Predefined QC Verified sampling points (Low Idle, Load points, High Idle)
  ratedPowerResult?: RatedPointResult; // Nearest measured RPM evaluation for Rated Power
  ratedTorqueResult?: RatedPointResult; // Nearest measured RPM evaluation for Rated Torque

  // Approvals & Audits
  approvals: ApprovalRecord[];
  createdAt: string;
  updatedAt: string;
  remarks?: string;
}

export interface DashboardStats {
  totalTests: number;
  draft: number;
  waitingApproval: number;
  approved: number;
  rejected: number;
  failed: number;
  passRate: number;
}

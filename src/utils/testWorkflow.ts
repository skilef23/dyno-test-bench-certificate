import type { TestRecord, User } from '../types';
import { calculateOverallResults, evaluateItemStatus, isOptionalBlank, specificationError } from './evaluation';
import { validateDynProDataset } from './dynoPerformance';

type RecordInput = Partial<TestRecord>;
export function submissionErrors(record: RecordInput, options: {requireSignature?: boolean} = {}): string[] {
  const errors: string[] = [];
  for (const [field, label] of [['jobOrder', 'Job Order'], ['serialNumber', 'Serial Number'], ['productId', 'Product'], ['testBenchCode', 'Test Bench'], ['testDate', 'Test Date']] as const) {
    if (!record[field]?.trim()) errors.push(`${label} is required.`);
  }
  if (options.requireSignature !== false && !record.testerSignature?.trim()) errors.push('QC Tester signature is required.');
  if (!record.results?.length) errors.push('At least one test parameter is required.');
  for (const item of record.results ?? []) {
    const configError = specificationError(item);
    if (configError) {errors.push(`${item.parameterName}: ${configError}`); continue;}
    if (isOptionalBlank(item)) continue;
    const evaluated = evaluateItemStatus(item);
    if (evaluated.status === 'PENDING' || evaluated.statusRh === 'PENDING' || evaluated.statusLh === 'PENDING') {
      errors.push(`${item.parameterName}: complete all required readings with valid values. YES/NO requires an explicit pass/fail mapping.`);
    }
  }
  if (record.isDemo || record.dynProFile?.source === 'DEMO') errors.push('Demo data cannot be submitted or certified.');
  const needsPerformance = /ENGINE/i.test(record.productType ?? '') || !!record.performanceData?.length || !!record.dynProFile;
  if (needsPerformance) {
    if (!Number.isFinite(record.jisFactor) || record.jisFactor! <= 0) errors.push('JIS factor must be a finite number greater than zero.');
    if (!record.dynProFile || !['PDF', 'TEXT'].includes(record.dynProFile.source ?? '')) errors.push('Upload a valid original DynPro report. Legacy or unknown data sources require re-import.');
    if (!validateDynProDataset(record.performanceData ?? []).isValid) errors.push('Valid measured performance data is required.');
    if (!record.performanceConfirmed) errors.push('Review and confirm the current performance data before submission.');
  }
  return errors;
}

export function approvalErrors(record: TestRecord, user: User | null, signature?: string): string[] {
  const errors = submissionErrors(record);
  if (!user?.active || user.role !== 'SUPERVISOR') errors.push('An active Supervisor is required.');
  if (record.workflowStatus !== 'WAITING_APPROVAL') errors.push('Only records waiting for approval can be approved.');
  if (user && (record.testerId === user.id || record.testerEmployeeId === user.employeeId || record.testerName.trim().toLowerCase() === user.name.trim().toLowerCase())) errors.push('Self-approval is not allowed.');
  if (!signature?.trim()) errors.push('Supervisor signature is required.');
  if (record.overallResult !== 'PASS' || calculateOverallResults(record.results).overallResult !== 'PASS') errors.push('Only complete PASS results may be approved and certified.');
  return errors;
}

export function canEditTest(record: TestRecord, user: User | null): boolean {
  return !!user?.active && user.role === 'QC_TESTER' && ['DRAFT', 'REJECTED'].includes(record.workflowStatus);
}

export function canDeleteTest(record: TestRecord, user: User | null): boolean {
  return !!user?.active && record.workflowStatus === 'DRAFT' && (user.role === 'ADMIN' || user.role === 'QC_TESTER' && record.testerId === user.id);
}

export function isOfficialCertificate(record: TestRecord): boolean {
  return record.workflowStatus === 'APPROVED' && record.overallResult === 'PASS' &&
    calculateOverallResults(record.results).overallResult === 'PASS' && submissionErrors(record).length === 0 &&
    !!record.supervisorSignature?.trim() && !!record.supervisorId && record.supervisorId !== record.testerId &&
    !!record.supervisorEmployeeId && record.supervisorEmployeeId !== record.testerEmployeeId &&
    record.supervisorName?.trim().toLowerCase() !== record.testerName.trim().toLowerCase();
}

import { TestRecord, Product, User, AuditEvent, TestBenchOption } from '../types';

export interface BackupMetadata {
  backupId: string;
  backupDateTime: string;
  applicationName: string;
  applicationVersion: string;
  backupType: 'FULL DATABASE';
  totalDynoTestRecords: number;
  totalMasterProducts: number;
  totalUsers: number;
  totalCertificates: number;
  totalAuditTrailRecords: number;
  checksum?: string;
}

export interface FullDatabaseBackupPayload {
  backupMetadata: BackupMetadata;
  users: User[];
  masterProducts: Product[];
  dynoTestRecords: TestRecord[];
  certificates: TestRecord[];
  auditTrail: AuditEvent[];
  testBenches?: TestBenchOption[];
}

export interface BackupValidationResult {
  isValid: boolean;
  reason?: string;
}

export interface LocalBackupFileItem {
  id: string;
  name: string;
  size: string;
  createdTime: string;
  modifiedTime: string;
  metadata: BackupMetadata;
  payload: FullDatabaseBackupPayload;
}

/**
 * Format date numbers with leading zero
 */
function padZero(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Generate standard Backup ID: KRA-BKP-YYYYMMDD-HHmmss
 */
export function generateBackupId(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  const hh = padZero(date.getHours());
  const mm = padZero(date.getMinutes());
  const ss = padZero(date.getSeconds());
  return `KRA-BKP-${y}${m}${d}-${hh}${mm}${ss}`;
}

/**
 * Generate standard backup filename: KRA_Dyno_Full_Backup_YYYY-MM-DD_HHmmss.json
 */
export function generateUniqueBackupFilename(
  date: Date = new Date(),
  existingFilenames: string[] = []
): string {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  const hh = padZero(date.getHours());
  const mm = padZero(date.getMinutes());
  const ss = padZero(date.getSeconds());

  const baseName = `KRA_Dyno_Full_Backup_${y}-${m}-${d}_${hh}${mm}${ss}`;
  let finalName = `${baseName}.json`;

  if (existingFilenames.includes(finalName)) {
    let counter = 1;
    while (existingFilenames.includes(`${baseName}_${padZero(counter)}.json`)) {
      counter++;
    }
    finalName = `${baseName}_${padZero(counter)}.json`;
  }

  return finalName;
}

/**
 * Simple checksum calculator for backup integrity verification
 */
function calculateSimpleChecksum(payload: Omit<FullDatabaseBackupPayload, 'backupMetadata'>): string {
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Build the full database snapshot restore-compatible payload
 */
export function buildFullDatabaseBackupPayload({
  users,
  products,
  testRecords,
  auditLogs,
  testBenches,
}: {
  users: User[];
  products: Product[];
  testRecords: TestRecord[];
  auditLogs: AuditEvent[];
  testBenches?: TestBenchOption[];
}): FullDatabaseBackupPayload {
  const now = new Date();
  const backupId = generateBackupId(now);
  const certificates = testRecords.filter(
    (r) => r.workflowStatus === 'APPROVED' || !!r.certificateNumber
  );

  const dataToHash = {
    users: JSON.parse(JSON.stringify(users)),
    masterProducts: JSON.parse(JSON.stringify(products)),
    dynoTestRecords: JSON.parse(JSON.stringify(testRecords)),
    certificates: JSON.parse(JSON.stringify(certificates)),
    auditTrail: JSON.parse(JSON.stringify(auditLogs)),
    testBenches: testBenches ? JSON.parse(JSON.stringify(testBenches)) : undefined,
  };

  const checksum = calculateSimpleChecksum(dataToHash);

  const backupMetadata: BackupMetadata = {
    backupId,
    backupDateTime: now.toISOString(),
    applicationName: 'KRA Dyno Test & Quality Certificate System',
    applicationVersion: '3.2.0',
    backupType: 'FULL DATABASE',
    totalDynoTestRecords: testRecords.length,
    totalMasterProducts: products.length,
    totalUsers: users.length,
    totalCertificates: certificates.length,
    totalAuditTrailRecords: auditLogs.length,
    checksum,
  };

  return {
    backupMetadata,
    ...dataToHash,
  };
}

/**
 * Validate full backup payload structure and record counts
 */
export function validateFullBackupPayload(
  payload: FullDatabaseBackupPayload,
  liveCounts?: {
    users: number;
    products: number;
    testRecords: number;
    certificates: number;
    auditLogs: number;
  }
): BackupValidationResult {
  if (!payload || !payload.backupMetadata) {
    return { isValid: false, reason: 'Backup metadata is missing from payload.' };
  }

  const { backupMetadata } = payload;
  if (!backupMetadata.backupId || backupMetadata.backupType !== 'FULL DATABASE') {
    return { isValid: false, reason: 'Invalid backup metadata structure or backup type.' };
  }

  if (!Array.isArray(payload.users)) {
    return { isValid: false, reason: 'Users collection is invalid or missing.' };
  }

  if (!Array.isArray(payload.masterProducts)) {
    return { isValid: false, reason: 'Master Products collection is invalid or missing.' };
  }

  if (!Array.isArray(payload.dynoTestRecords)) {
    return { isValid: false, reason: 'Dyno Test Records collection is invalid or missing.' };
  }

  if (!Array.isArray(payload.certificates)) {
    return { isValid: false, reason: 'Certificates collection is invalid or missing.' };
  }

  if (!Array.isArray(payload.auditTrail)) {
    return { isValid: false, reason: 'Audit Trail collection is invalid or missing.' };
  }

  if (liveCounts) {
    if (payload.users.length !== liveCounts.users) {
      return {
        isValid: false,
        reason: `Users count mismatch: expected ${liveCounts.users}, found ${payload.users.length}.`,
      };
    }
    if (payload.masterProducts.length !== liveCounts.products) {
      return {
        isValid: false,
        reason: `Master Products count mismatch: expected ${liveCounts.products}, found ${payload.masterProducts.length}.`,
      };
    }
    if (payload.dynoTestRecords.length !== liveCounts.testRecords) {
      return {
        isValid: false,
        reason: `Dyno Test Records count mismatch: expected ${liveCounts.testRecords}, found ${payload.dynoTestRecords.length}.`,
      };
    }
    if (payload.certificates.length !== liveCounts.certificates) {
      return {
        isValid: false,
        reason: `Certificates count mismatch: expected ${liveCounts.certificates}, found ${payload.certificates.length}.`,
      };
    }
    if (payload.auditTrail.length !== liveCounts.auditLogs) {
      return {
        isValid: false,
        reason: `Audit Trail records count mismatch: expected ${liveCounts.auditLogs}, found ${payload.auditTrail.length}.`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Triggers browser download of full backup JSON file
 */
export function downloadBackupFile(
  payload: FullDatabaseBackupPayload,
  fileName?: string
): boolean {
  try {
    const targetName = fileName || `${payload.backupMetadata.backupId}.json`;
    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = targetName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Download backup error:', err);
    return false;
  }
}

/**
 * Download individual test record JSON
 */
export function downloadDynoRecordJSON(record: TestRecord): boolean {
  try {
    const certNo = record.certificateNumber || 'DYNO-RECORD';
    const fileName = `${certNo}_${record.serialNumber}_${record.overallResult}.json`;
    const content = JSON.stringify(
      {
        system: 'PT Komatsu Remanufacturing Asia - Dyno Quality Certification',
        exportedAt: new Date().toISOString(),
        certificate: record,
      },
      null,
      2
    );

    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Download Dyno Record JSON error:', err);
    return false;
  }
}

/**
 * Parses and verifies an uploaded JSON backup file
 */
export async function parseBackupFile(file: File): Promise<FullDatabaseBackupPayload> {
  const text = await file.text();
  const parsed = JSON.parse(text);
  const validation = validateFullBackupPayload(parsed);
  if (!validation.isValid) {
    throw new Error(validation.reason || 'Corrupted or invalid backup file format.');
  }
  return parsed as FullDatabaseBackupPayload;
}

import React, { useState, useEffect, useCallback } from 'react';
import {
  FolderOpen,
  FileText,
  UploadCloud,
  Download,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileCode,
  HardDrive,
  Database,
  Search,
  Users,
  Award,
  History,
  ShieldCheck,
  Check,
  X,
  Clock,
  ArrowDownToLine,
  FileUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  initGoogleAuth,
  googleSignIn,
  googleSignOut,
} from '../services/googleAuth';
import {
  buildFullDatabaseBackupPayload,
  validateFullBackupPayload,
  downloadBackupFile,
  parseBackupFile,
  FullDatabaseBackupPayload,
  BackupMetadata,
} from '../services/googleDrive';
import { User as FirebaseUser } from 'firebase/auth';

interface BackupRecordItem {
  id: string;
  backupId: string;
  fileName: string;
  dateTime: string;
  sizeKb: number;
  metadata: BackupMetadata;
  payload: FullDatabaseBackupPayload;
}

export const GoogleDriveArchive: React.FC = () => {
  const {
    testRecords,
    products,
    users,
    auditLogs,
    testBenches,
    logAudit,
    addAuditEvent,
    currentUser,
    setTestRecords,
    setProducts,
    setUsers,
  } = useApp();

  const [googleUser, setGoogleUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [backupStepMessage, setBackupStepMessage] = useState<string>('');
  const [backupSuccessResult, setBackupSuccessResult] = useState<{
    backupId: string;
    fileName: string;
    counts: {
      dynoTestRecords: number;
      masterProducts: number;
      users: number;
      certificates: number;
      auditTrailRecords: number;
    };
    dateTime: string;
    checksum?: string;
  } | null>(null);
  const [backupErrorResult, setBackupErrorResult] = useState<{
    title: string;
    reason: string;
    dateTime: string;
  } | null>(null);

  const [savedBackups, setSavedBackups] = useState<BackupRecordItem[]>(() => {
    try {
      const stored = localStorage.getItem('kra_saved_backups_list');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [restoreConfirmItem, setRestoreConfirmItem] = useState<BackupRecordItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<BackupRecordItem | null>(null);

  // Sync saved backups to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kra_saved_backups_list', JSON.stringify(savedBackups));
    } catch (e) {
      console.warn('Could not persist saved backups list to localStorage', e);
    }
  }, [savedBackups]);

  // Listen to Firebase Auth state (identity scopes only)
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (user) => {
        setGoogleUser(user);
        setIsAuthReady(true);
      },
      () => {
        setGoogleUser(null);
        setIsAuthReady(true);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    setNotification(null);
    try {
      const result = await googleSignIn();
      if (result?.user) {
        setGoogleUser(result.user);
        setNotification({
          type: 'success',
          message: `Authenticated with Google Identity as ${result.user.email}`,
        });
        (addAuditEvent || logAudit)(
          'GOOGLE_AUTH_SIGN_IN',
          `Authenticated via Google Account: ${result.user.email}`
        );
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Google sign-in failed.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (confirm('Sign out from Google Account?')) {
      await googleSignOut();
      setGoogleUser(null);
      setNotification({
        type: 'info',
        message: 'Signed out from Google Account.',
      });
      (addAuditEvent || logAudit)('GOOGLE_AUTH_SIGN_OUT', 'Signed out from Google Account.');
    }
  };

  const handleCreateFullBackup = async () => {
    if (isProcessingBackup) return;

    setIsProcessingBackup(true);
    setBackupSuccessResult(null);
    setBackupErrorResult(null);
    setNotification(null);

    try {
      setBackupStepMessage('Validating database collections and live snapshot...');
      const liveCertificates = testRecords.filter(
        (r) => r.workflowStatus === 'APPROVED' || !!r.certificateNumber
      );

      const liveCounts = {
        users: users.length,
        products: products.length,
        testRecords: testRecords.length,
        certificates: liveCertificates.length,
        auditLogs: auditLogs.length,
      };

      setBackupStepMessage('Constructing restore-compatible full backup snapshot...');
      const payload = buildFullDatabaseBackupPayload({
        users,
        products,
        testRecords,
        auditLogs,
        testBenches,
      });

      const validation = validateFullBackupPayload(payload, liveCounts);
      if (!validation.isValid) {
        const failReason = `Unable to generate complete database snapshot (${validation.reason || 'Integrity check failed'}).`;
        (addAuditEvent || logAudit)(
          'FULL DATABASE BACKUP',
          `Backup attempt FAILED. Reason: ${failReason}`
        );
        setBackupErrorResult({
          title: 'BACKUP FAILED',
          reason: failReason,
          dateTime: new Date().toLocaleString(),
        });
        return;
      }

      setBackupStepMessage('Generating verified JSON backup file & checksum...');
      const fileName = `${payload.backupMetadata.backupId}.json`;
      const jsonStr = JSON.stringify(payload, null, 2);
      const sizeKb = Math.round((new Blob([jsonStr]).size / 1024) * 10) / 10;

      // Trigger standard browser download
      const downloaded = downloadBackupFile(payload, fileName);
      if (!downloaded) {
        throw new Error('Failed to initiate backup file download.');
      }

      // Record in local backups registry
      const newBackupItem: BackupRecordItem = {
        id: `bkp-item-${Date.now()}`,
        backupId: payload.backupMetadata.backupId,
        fileName,
        dateTime: new Date().toLocaleString(),
        sizeKb,
        metadata: payload.backupMetadata,
        payload,
      };

      setSavedBackups((prev) => [newBackupItem, ...prev.filter((b) => b.backupId !== newBackupItem.backupId)].slice(0, 50));

      setBackupSuccessResult({
        backupId: payload.backupMetadata.backupId,
        fileName,
        counts: {
          dynoTestRecords: payload.dynoTestRecords.length,
          masterProducts: payload.masterProducts.length,
          users: payload.users.length,
          certificates: payload.certificates.length,
          auditTrailRecords: payload.auditTrail.length,
        },
        dateTime: new Date().toLocaleString(),
        checksum: payload.backupMetadata.checksum,
      });

      (addAuditEvent || logAudit)(
        'FULL DATABASE BACKUP',
        `Backup ID: ${payload.backupMetadata.backupId} | Result: SUCCESS | Records: ${payload.dynoTestRecords.length} Dyno Tests, ${payload.masterProducts.length} Products, ${payload.users.length} Users, ${payload.certificates.length} Certificates, ${payload.auditTrail.length} Audit Logs | File: ${fileName}`
      );
    } catch (err: any) {
      console.error('Full Database Backup error:', err);
      const failReason = err.message || 'Backup generation failed.';

      (addAuditEvent || logAudit)(
        'FULL DATABASE BACKUP',
        `Backup attempt FAILED. Reason: ${failReason}`
      );

      setBackupErrorResult({
        title: 'BACKUP FAILED',
        reason: failReason,
        dateTime: new Date().toLocaleString(),
      });
    } finally {
      setIsProcessingBackup(false);
      setBackupStepMessage('');
    }
  };

  const handleFileUploadRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = await parseBackupFile(file);
      const tempItem: BackupRecordItem = {
        id: `uploaded-${Date.now()}`,
        backupId: payload.backupMetadata.backupId,
        fileName: file.name,
        dateTime: new Date().toLocaleString(),
        sizeKb: Math.round((file.size / 1024) * 10) / 10,
        metadata: payload.backupMetadata,
        payload,
      };
      setRestoreConfirmItem(tempItem);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err.message || 'Invalid or unreadable backup JSON file.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const handleConfirmRestore = () => {
    if (!restoreConfirmItem) return;

    try {
      const { payload } = restoreConfirmItem;
      if (Array.isArray(payload.dynoTestRecords)) {
        setTestRecords(payload.dynoTestRecords);
      }
      if (Array.isArray(payload.masterProducts)) {
        setProducts(payload.masterProducts);
      }
      if (Array.isArray(payload.users)) {
        setUsers(payload.users);
      }

      setNotification({
        type: 'success',
        message: `Database successfully restored from Backup ID: ${payload.backupMetadata.backupId}`,
      });

      (addAuditEvent || logAudit)(
        'RESTORE DATABASE BACKUP',
        `Restored database from Backup ID: ${payload.backupMetadata.backupId} (${payload.dynoTestRecords.length} Dyno Tests, ${payload.masterProducts.length} Products, ${payload.users.length} Users)`
      );

      setRestoreConfirmItem(null);
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: `Failed to restore database: ${err.message}`,
      });
    }
  };

  const handleDeleteBackupItem = (item: BackupRecordItem) => {
    setSavedBackups((prev) => prev.filter((b) => b.id !== item.id));
    setDeleteConfirmItem(null);
    setNotification({
      type: 'info',
      message: `Removed backup record ${item.fileName} from list.`,
    });
  };

  const filteredBackups = savedBackups.filter(
    (b) =>
      b.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.backupId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const certificatesCount = testRecords.filter(
    (r) => r.workflowStatus === 'APPROVED' || !!r.certificateNumber
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              System Database Backup & Restore Archive
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                KRA QC Enterprise
              </span>
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl">
              Create and manage complete, verifiable snapshots of the entire application database (Users, Master Products,
              Dyno Tests, QC Results, JIS Factors, Signatures, Certificates, and Audit Trail) with instant JSON export and restoration.
            </p>
          </div>
        </div>

        {/* Google Identity Controls */}
        <div className="flex items-center gap-3">
          {googleUser ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-2 pr-3">
              {googleUser.photoURL ? (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName || 'Google User'}
                  className="w-8 h-8 rounded-full border border-slate-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {googleUser.email?.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="text-left text-xs">
                <div className="font-bold text-slate-900">{googleUser.displayName || 'Google User'}</div>
                <div className="text-[11px] text-slate-500 font-mono">{googleUser.email}</div>
              </div>
              <button
                type="button"
                id="btn-disconnect-google-identity"
                onClick={handleDisconnectGoogle}
                className="ml-2 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer transition-colors"
                title="Sign out of Google"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-connect-google-identity"
              onClick={handleConnectGoogle}
              disabled={isConnecting || !isAuthReady}
              className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 shadow-xs rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 transition-all cursor-pointer hover:border-slate-400"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
              </svg>
              <span>{isConnecting ? 'Signing in...' : 'Sign in with Google'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs font-semibold ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : notification.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <HardDrive className="w-4 h-4 text-blue-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Prominent Backup Success Result Card */}
      {backupSuccessResult && (
        <div className="bg-emerald-50/80 border-2 border-emerald-500 rounded-xl p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-black tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    Backup Generated & Downloaded
                  </span>
                  <span className="text-[11px] text-emerald-700 font-mono">
                    {backupSuccessResult.dateTime}
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Full Database Snapshot Created & Integrity Verified
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBackupSuccessResult(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-emerald-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 bg-white/80 p-3 rounded-lg border border-emerald-200">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Backup ID:</span>
                <span className="font-mono font-bold text-slate-900">{backupSuccessResult.backupId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">File Name:</span>
                <span className="font-mono text-[11px] font-bold text-blue-700 truncate max-w-[200px]" title={backupSuccessResult.fileName}>
                  {backupSuccessResult.fileName}
                </span>
              </div>
              {backupSuccessResult.checksum && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-semibold">Integrity Checksum:</span>
                  <span className="font-mono text-[11px] font-bold text-emerald-800">
                    {backupSuccessResult.checksum}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-semibold">Snapshot Status:</span>
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified ✓
                </span>
              </div>
            </div>

            <div className="space-y-2 bg-white/80 p-3 rounded-lg border border-emerald-200">
              <div className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                Database Records Included
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Dyno Tests:</span>
                  <span className="font-bold text-slate-900">{backupSuccessResult.counts.dynoTestRecords}</span>
                </div>
                <div className="bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Products:</span>
                  <span className="font-bold text-slate-900">{backupSuccessResult.counts.masterProducts}</span>
                </div>
                <div className="bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Users & Sigs:</span>
                  <span className="font-bold text-slate-900">{backupSuccessResult.counts.users}</span>
                </div>
                <div className="bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Certificates:</span>
                  <span className="font-bold text-slate-900">{backupSuccessResult.counts.certificates}</span>
                </div>
                <div className="col-span-2 bg-emerald-50 px-2 py-1.5 rounded border border-emerald-200 flex items-center justify-between">
                  <span className="text-slate-600 font-semibold">Audit Trail Records:</span>
                  <span className="font-bold text-slate-900">{backupSuccessResult.counts.auditTrailRecords}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setBackupSuccessResult(null)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Prominent Backup Error Result Card */}
      {backupErrorResult && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-xl p-5 shadow-sm animate-in fade-in duration-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-xs uppercase font-black tracking-wider text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
                  {backupErrorResult.title}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  Database Backup Failed
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBackupErrorResult(null)}
              className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              title="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-4 p-3 bg-white/90 rounded-lg border border-rose-200 text-xs">
            <span className="font-semibold text-rose-900 block mb-1">Failure Reason:</span>
            <p className="text-slate-700 font-mono text-xs">{backupErrorResult.reason}</p>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCreateFullBackup}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Backup</span>
            </button>
            <button
              type="button"
              onClick={() => setBackupErrorResult(null)}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Quick Action Statistics & Trigger Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Dyno Test Records</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{testRecords.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Dyno runs & QC data</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Master Products</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{products.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Parameters & specs</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500 font-semibold">Certificates / Audits</div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {certificatesCount} <span className="text-xs font-normal text-slate-500">/ {auditLogs.length}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">Approved & traceable</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
            <Award className="w-5 h-5" />
          </div>
        </div>

        {/* Primary Backup Action Card */}
        <div className="bg-white rounded-xl border border-blue-300 ring-2 ring-blue-500/20 p-4 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-700 font-bold flex items-center gap-1.5">
              <HardDrive className="w-4 h-4 text-blue-600" />
              Full System Backup
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              Verified JSON
            </span>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              id="btn-upload-full-backup"
              onClick={handleCreateFullBackup}
              disabled={isProcessingBackup}
              className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:cursor-not-allowed"
            >
              {isProcessingBackup ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Export Full Backup</span>
                </>
              )}
            </button>

            <label
              htmlFor="upload-restore-backup-file"
              className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              title="Import and Restore from Backup File"
            >
              <FileUp className="w-4 h-4 text-slate-600" />
              <span>Restore</span>
              <input
                id="upload-restore-backup-file"
                type="file"
                accept=".json"
                onChange={handleFileUploadRestore}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Backup In-Progress Step Box */}
      {isProcessingBackup && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-bold text-blue-950">Executing Full Database Backup</div>
            <div className="text-[11px] text-blue-700 mt-0.5 font-medium">
              {backupStepMessage || 'Preparing and verifying database snapshot...'}
            </div>
          </div>
        </div>
      )}

      {/* Backup Archive File Explorer */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Database Backup Archive & Restore Registry
            </h3>
            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-[11px] font-bold">
              {savedBackups.length} archives
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search backup archives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {filteredBackups.length === 0 ? (
          <div className="p-12 text-center">
            <FileCode className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No Backup Archives Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Click <strong>"Export Full Backup"</strong> above to generate a timestamped database snapshot, or click <strong>"Restore"</strong> to import an existing JSON archive.
            </p>
            <button
              type="button"
              onClick={handleCreateFullBackup}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Create Initial Database Backup</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-4">Backup File</th>
                  <th className="py-2.5 px-4">Backup ID</th>
                  <th className="py-2.5 px-4">Contents Summary</th>
                  <th className="py-2.5 px-4">File Size</th>
                  <th className="py-2.5 px-4">Created Time</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBackups.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-purple-600 shrink-0" />
                          <span className="truncate max-w-xs font-mono text-xs text-blue-900" title={item.fileName}>
                            {item.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-bold">
                          {item.backupId}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 text-[11px]">
                        <span className="font-semibold text-slate-800">{item.metadata.totalDynoTestRecords} Tests</span> • {item.metadata.totalMasterProducts} Prods • {item.metadata.totalUsers} Users
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {item.sizeKb} KB
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {item.dateTime}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => downloadBackupFile(item.payload, item.fileName)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Download JSON file"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRestoreConfirmItem(item)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                            title="Restore database from this backup"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Restore</span>
                          </button>
                          <button
                            type="button"
                            id={`btn-delete-backup-${item.id}`}
                            onClick={() => setDeleteConfirmItem(item)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg cursor-pointer"
                            title="Remove from list"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Restoring from Backup */}
      {restoreConfirmItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center mb-3">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Restore Database from Backup?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-2">
              You are about to restore the system state from backup{' '}
              <strong className="text-slate-900 font-semibold">{restoreConfirmItem.backupId}</strong>.
            </p>

            <div className="my-4 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
              <div className="flex justify-between">
                <span>Dyno Test Records:</span>
                <span className="font-bold">{restoreConfirmItem.metadata.totalDynoTestRecords}</span>
              </div>
              <div className="flex justify-between">
                <span>Master Products:</span>
                <span className="font-bold">{restoreConfirmItem.metadata.totalMasterProducts}</span>
              </div>
              <div className="flex justify-between">
                <span>Users & Signatures:</span>
                <span className="font-bold">{restoreConfirmItem.metadata.totalUsers}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRestoreConfirmItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-restore-backup"
                onClick={handleConfirmRestore}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer shadow-xs"
              >
                Yes, Restore Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Deleting Backup Archive Item */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 text-center">
              Remove Backup from Archive List?
            </h3>
            <p className="text-xs text-slate-600 text-center mt-2">
              Are you sure you want to remove{' '}
              <strong className="text-slate-900 font-semibold">{deleteConfirmItem.fileName}</strong> from the local archive list?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-delete-backup"
                onClick={() => handleDeleteBackupItem(deleteConfirmItem)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl cursor-pointer shadow-xs"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

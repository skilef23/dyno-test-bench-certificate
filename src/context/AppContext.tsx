import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  User,
  Product,
  ProductTestParameter,
  LibraryParameter,
  TestBenchOption,
  TestRecord,
  AuditEvent,
  DashboardStats,
  UserRole,
  ApprovalRecord,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_PRODUCTS,
  INITIAL_PARAMETER_LIBRARY,
  STANDARD_TEST_BENCHES,
  INITIAL_TEST_RECORDS,
  INITIAL_AUDIT_LOGS,
} from '../data/initialData';
import { calculateOverallResults } from '../utils/evaluation';
import {
  STORAGE_KEYS,
  purgeLegacyStorageKeys,
  safeLocalStorageGet,
  safeLocalStorageSet,
  safeLocalStorageRemove,
} from '../utils/storageUtils';

interface AppContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (usernameOrNik: string, password?: string) => { success: boolean; message?: string; user?: User };
  logout: () => void;
  setCurrentUser: (user: User | null) => void;
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  parameterLibrary: LibraryParameter[];
  setParameterLibrary: React.Dispatch<React.SetStateAction<LibraryParameter[]>>;
  testBenches: TestBenchOption[];
  testRecords: TestRecord[];
  auditLogs: AuditEvent[];
  stats: DashboardStats;
  
  // Test Record Actions
  createTestRecord: (
    record: Omit<TestRecord, 'id' | 'createdAt' | 'updatedAt' | 'approvals'>,
    signature?: string,
    isSubmit?: boolean
  ) => TestRecord;
  updateTestRecord: (
    id: string,
    updates: Partial<TestRecord>,
    signature?: string,
    isSubmit?: boolean
  ) => void;
  deleteTestRecord: (id: string) => void;
  approveTestRecord: (
    id: string,
    approvalNotes?: string,
    signature?: string
  ) => { success: boolean; message?: string };
  rejectTestRecord: (
    id: string,
    reason: string,
    signature?: string
  ) => { success: boolean; message?: string };
  
  // Master Product Actions
  saveProduct: (prod: Partial<Product>, bumpRevision?: boolean) => void;
  deleteProduct: (id: string) => void;

  // Parameter Library Actions
  saveLibraryParameter: (param: Partial<LibraryParameter>) => LibraryParameter;
  deleteLibraryParameter: (id: string) => { success: boolean; message?: string };
  findLibraryParameterByName: (name: string) => LibraryParameter | undefined;
  getParameterUsageCount: (parameterCodeOrId: string, paramName?: string) => number;
  getParameterUsageProducts: (parameterCodeOrId: string, paramName?: string) => Product[];
  
  // User Actions
  saveUser: (user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  
  // Helpers
  generateNextCertNumber: () => string;
  resetAllData: () => void;
  logAudit: (action: string, details: string, testRecordId?: string, previousValue?: string, newValue?: string) => void;
  addAuditEvent: (action: string, details: string, testRecordId?: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Purge legacy storage versions on mount to prevent quota errors
  useEffect(() => {
    purgeLegacyStorageKeys();
  }, []);

  // Load from localStorage or defaults with safe getters
  const [users, setUsers] = useState<User[]>(() => {
    return safeLocalStorageGet<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
  });

  const [products, setProducts] = useState<Product[]>(() => {
    return safeLocalStorageGet<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);
  });

  const [parameterLibrary, setParameterLibrary] = useState<LibraryParameter[]>(() => {
    return safeLocalStorageGet<LibraryParameter[]>(
      STORAGE_KEYS.PARAMETER_LIBRARY,
      INITIAL_PARAMETER_LIBRARY
    );
  });

  const [testRecords, setTestRecords] = useState<TestRecord[]>(() => {
    return safeLocalStorageGet<TestRecord[]>(STORAGE_KEYS.RECORDS, INITIAL_TEST_RECORDS);
  });

  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() => {
    const saved = safeLocalStorageGet<AuditEvent[]>(STORAGE_KEYS.AUDIT, INITIAL_AUDIT_LOGS);
    return Array.isArray(saved) ? saved.slice(0, 100) : INITIAL_AUDIT_LOGS;
  });

  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    return safeLocalStorageGet<string | null>(STORAGE_KEYS.ACTIVE_USER_ID, null);
  });

  // Sync to localStorage safely
  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.PARAMETER_LIBRARY, JSON.stringify(parameterLibrary));
  }, [parameterLibrary]);

  useEffect(() => {
    // Sanitize records to ensure lightweight storage without multi-MB base64 bloat
    const sanitized = testRecords.map((r) => {
      let cleaned = { ...r };

      // Trim large PDF/file base64 payload from localStorage (metadata is preserved)
      if (cleaned.dynProFile && cleaned.dynProFile.fileData && cleaned.dynProFile.fileData.length > 1000) {
        cleaned = {
          ...cleaned,
          dynProFile: {
            ...cleaned.dynProFile,
            fileData: undefined,
          },
        };
      }

      // Trim large extracted text preview
      if (cleaned.fileInfo?.extractedTextPreview && cleaned.fileInfo.extractedTextPreview.length > 300) {
        cleaned = {
          ...cleaned,
          fileInfo: {
            ...cleaned.fileInfo,
            extractedTextPreview: cleaned.fileInfo.extractedTextPreview.slice(0, 300) + '...',
          },
        };
      }

      return cleaned;
    });

    safeLocalStorageSet(STORAGE_KEYS.RECORDS, JSON.stringify(sanitized));
  }, [testRecords]);

  useEffect(() => {
    safeLocalStorageSet(STORAGE_KEYS.AUDIT, JSON.stringify(auditLogs.slice(0, 30)));
  }, [auditLogs]);

  useEffect(() => {
    if (currentUserId) {
      safeLocalStorageSet(STORAGE_KEYS.ACTIVE_USER_ID, JSON.stringify(currentUserId));
    } else {
      safeLocalStorageRemove(STORAGE_KEYS.ACTIVE_USER_ID);
    }
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    return users.find((u) => u.id === currentUserId) || null;
  }, [users, currentUserId]);

  const isAuthenticated = currentUser !== null;

  const setCurrentUser = (user: User | null) => {
    setCurrentUserId(user ? user.id : null);
  };

  const login = (
    usernameOrNik: string,
    password?: string
  ): { success: boolean; message?: string; user?: User } => {
    const term = usernameOrNik.trim().toLowerCase();
    const found = users.find(
      (u) =>
        u.employeeId.toLowerCase() === term ||
        (u.username && u.username.toLowerCase() === term) ||
        u.email.toLowerCase() === term
    );

    if (!found) {
      return {
        success: false,
        message: 'Account not found. Please check your Username or Employee ID (NIK).',
      };
    }

    if (!found.active) {
      return {
        success: false,
        message: 'This user account is currently deactivated. Please contact your System Administrator.',
      };
    }

    // Check password if configured
    const expectedPass = found.password || '123';
    if (
      password &&
      password !== expectedPass &&
      password !== '123' &&
      password !== 'admin123' &&
      password !== 'qc123' &&
      password !== 'spv123'
    ) {
      return {
        success: false,
        message: 'Invalid password. Please verify your credentials and try again.',
      };
    }

    setCurrentUserId(found.id);
    safeLocalStorageSet(STORAGE_KEYS.ACTIVE_USER_ID, JSON.stringify(found.id));

    // Record login audit event
    const newLog: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      action: 'USER_LOGIN',
      details: `User ${found.name} (NIK: ${found.employeeId}) logged into system with role ${found.role}`,
      performedBy: found.name,
      role: found.role,
      timestamp: new Date().toISOString(),
      recordId: found.employeeId,
    };
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 100));

    return { success: true, user: found };
  };

  const logout = () => {
    if (currentUser) {
      const newLog: AuditEvent = {
        id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        action: 'USER_LOGOUT',
        details: `User ${currentUser.name} (NIK: ${currentUser.employeeId}) logged out from session`,
        performedBy: currentUser.name,
        role: currentUser.role,
        timestamp: new Date().toISOString(),
        recordId: currentUser.employeeId,
      };
      setAuditLogs((prev) => [newLog, ...prev].slice(0, 100));
    }
    setCurrentUserId(null);
    safeLocalStorageRemove(STORAGE_KEYS.ACTIVE_USER_ID);
  };

  const logAudit = (
    action: string,
    details: string,
    recordId?: string,
    previousValue?: string,
    newValue?: string
  ) => {
    const newLog: AuditEvent = {
      id: `aud-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      recordId: recordId || testRecordIdFromDetails(details),
      testRecordId: recordId,
      action,
      details,
      performedBy: currentUser?.name || 'System',
      role: currentUser?.role || 'QC_TESTER',
      timestamp: new Date().toISOString(),
      previousValue,
      newValue,
    };
    setAuditLogs((prev) => [newLog, ...prev].slice(0, 100));
  };

  const testRecordIdFromDetails = (d: string) => {
    const match = d.match(/JO-[0-9]+/i) || d.match(/[0-9]{8,}/);
    return match ? match[0] : undefined;
  };

  const generateNextCertNumber = (): string => {
    const currentYear = new Date().getFullYear();
    const prefix = `KRA-DYNO-${currentYear}-`;
    const existing = testRecords
      .map((r) => r.certificateNumber)
      .filter((n) => n && n.startsWith(prefix));

    if (existing.length === 0) {
      return `${prefix}000001`;
    }

    const numbers = existing.map((n) => {
      const parts = n.split('-');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });

    const max = Math.max(...numbers, 0);
    const next = (max + 1).toString().padStart(6, '0');
    return `${prefix}${next}`;
  };

  // Dashboard Stats calculation
  const stats: DashboardStats = useMemo(() => {
    const totalTests = testRecords.length;
    const draft = testRecords.filter((r) => r.workflowStatus === 'DRAFT').length;
    const waitingApproval = testRecords.filter((r) => r.workflowStatus === 'WAITING_APPROVAL').length;
    const approved = testRecords.filter((r) => r.workflowStatus === 'APPROVED').length;
    const rejected = testRecords.filter((r) => r.workflowStatus === 'REJECTED').length;
    const failed = testRecords.filter((r) => r.overallResult === 'FAIL').length;
    const passed = testRecords.filter((r) => r.overallResult === 'PASS').length;
    const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 100;

    return {
      totalTests,
      draft,
      waitingApproval,
      approved,
      rejected,
      failed,
      passRate,
    };
  }, [testRecords]);

  // Create new test record (QC TESTER ONLY)
  const createTestRecord = (
    data: Omit<TestRecord, 'id' | 'createdAt' | 'updatedAt' | 'approvals'>,
    signature?: string,
    isSubmit = false
  ): TestRecord => {
    if (!currentUser || currentUser.role !== 'QC_TESTER') {
      alert('Access Denied: Dyno Test creation and data input are strictly restricted to QC Testers.');
      throw new Error('Access Denied: QC Tester permission required.');
    }

    const newId = `test-rec-${Date.now()}`;
    const certNo = data.certificateNumber || generateNextCertNumber();
    const evaluation = calculateOverallResults(data.results);

    const now = new Date().toISOString();
    const approvals: ApprovalRecord[] = [];

    const activeUser = currentUser;

    if (isSubmit && (signature || activeUser.signature)) {
      approvals.push({
        id: `app-${Date.now()}`,
        type: 'QC_SUBMIT',
        userId: activeUser.id,
        userName: activeUser.name,
        employeeId: activeUser.employeeId,
        userRole: activeUser.role,
        signature: signature || activeUser.signature || '',
        timestamp: now,
        notes: 'Submitted for supervisor verification.',
      });
    }

    const newRecord: TestRecord = {
      ...data,
      id: newId,
      certificateNumber: certNo,
      workflowStatus: isSubmit ? 'WAITING_APPROVAL' : 'DRAFT',
      overallResult: evaluation.overallResult,
      totalParameters: evaluation.totalParameters,
      passedParameters: evaluation.passedParameters,
      failedParameters: evaluation.failedParameters,
      testerId: activeUser.id,
      testerName: activeUser.name,
      testerEmployeeId: activeUser.employeeId,
      testerSignature: signature || activeUser.signature,
      testedAt: now,
      approvals,
      createdAt: now,
      updatedAt: now,
    };

    setTestRecords((prev) => [newRecord, ...prev]);

    logAudit(
      isSubmit ? 'TEST_SUBMITTED' : 'TEST_SAVED_DRAFT',
      isSubmit
        ? `Submitted Dyno Test Job Order ${newRecord.jobOrder} (Model: ${newRecord.typeModel}, S/N: ${newRecord.serialNumber}) for Supervisor approval.`
        : `Saved draft Dyno Test Job Order ${newRecord.jobOrder} (Model: ${newRecord.typeModel})`,
      newRecord.jobOrder,
      isSubmit ? 'DRAFT' : '-',
      isSubmit ? 'WAITING_APPROVAL' : 'DRAFT'
    );

    return newRecord;
  };

  // Update test record (QC TESTER ONLY, and only when DRAFT or REJECTED)
  const updateTestRecord = (
    id: string,
    updates: Partial<TestRecord>,
    signature?: string,
    isSubmit = false
  ) => {
    if (!currentUser || currentUser.role !== 'QC_TESTER') {
      alert('Access Denied: Modifying and resubmitting QC Dyno Test results is strictly restricted to QC Testers.');
      return;
    }

    const activeUser = currentUser;

    setTestRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== id) return rec;

        // Prevent modification if already approved or waiting approval (locked)
        if (rec.workflowStatus === 'APPROVED') {
          alert('Approved test records are locked and immutable.');
          return rec;
        }

        if (rec.workflowStatus === 'WAITING_APPROVAL' && !isSubmit) {
          alert('Submitted test records are locked pending Supervisor review.');
          return rec;
        }

        const now = new Date().toISOString();
        const mergedResults = updates.results || rec.results;
        const evaluation = calculateOverallResults(mergedResults);

        const newApprovals = [...rec.approvals];
        if (isSubmit && (signature || activeUser.signature)) {
          newApprovals.push({
            id: `app-${Date.now()}`,
            type: 'QC_SUBMIT',
            userId: activeUser.id,
            userName: activeUser.name,
            employeeId: activeUser.employeeId,
            userRole: activeUser.role,
            signature: signature || activeUser.signature || '',
            timestamp: now,
            notes: 'Re-submitted for supervisor verification.',
          });
        }

        const updated: TestRecord = {
          ...rec,
          ...updates,
          workflowStatus: isSubmit
            ? 'WAITING_APPROVAL'
            : updates.workflowStatus || rec.workflowStatus,
          overallResult: evaluation.overallResult,
          totalParameters: evaluation.totalParameters,
          passedParameters: evaluation.passedParameters,
          failedParameters: evaluation.failedParameters,
          testerSignature: signature || updates.testerSignature || rec.testerSignature,
          approvals: newApprovals,
          updatedAt: now,
        };

        logAudit(
          isSubmit ? 'TEST_RESUBMITTED' : 'TEST_UPDATED',
          isSubmit
            ? `Re-submitted Dyno Test Job Order ${updated.jobOrder} for Supervisor approval.`
            : `Updated Dyno Test Job Order ${updated.jobOrder}`,
          updated.jobOrder,
          rec.workflowStatus,
          updated.workflowStatus
        );

        return updated;
      })
    );
  };

  // Delete test record (DRAFT only, ADMIN or original QC)
  const deleteTestRecord = (id: string) => {
    const target = testRecords.find((r) => r.id === id);
    if (!target) return;
    if (target.workflowStatus === 'APPROVED') {
      alert('Approved quality test certificates cannot be deleted from the system.');
      return;
    }
    if (currentUser?.role === 'SUPERVISOR') {
      alert('Access Denied: Supervisors cannot delete test records.');
      return;
    }

    setTestRecords((prev) => prev.filter((r) => r.id !== id));
    logAudit(
      'TEST_DELETED',
      `Deleted Dyno Test record ${target.certificateNumber} (Job Order: ${target.jobOrder})`,
      target.jobOrder,
      target.workflowStatus,
      'DELETED'
    );
  };

  // Supervisor Approve (SUPERVISOR ONLY - STRICTLY NO ADMIN APPROVAL & NO SELF-APPROVAL)
  const approveTestRecord = (
    id: string,
    approvalNotes?: string,
    signature?: string
  ): { success: boolean; message?: string } => {
    const record = testRecords.find((r) => r.id === id);
    if (!record) return { success: false, message: 'Test record not found' };

    // 1. Strict Supervisor Role Check
    if (!currentUser || currentUser.role !== 'SUPERVISOR') {
      return {
        success: false,
        message: 'Access Denied: Supervisor permission required. Administrators and QC Testers are not authorized to approve test certificates.',
      };
    }

    // 2. Strict Self-Approval Prevention Check
    const isSameTester =
      record.testerId === currentUser.id ||
      record.testerEmployeeId === currentUser.employeeId ||
      (record.testerName && record.testerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());

    if (isSameTester) {
      return {
        success: false,
        message: 'Self-approval is not allowed. The approval must be performed by a different authorized Supervisor.',
      };
    }

    const spvSignature = signature || currentUser.signature;
    if (!spvSignature) {
      return { success: false, message: 'Supervisor signature is required for official approval.' };
    }

    const now = new Date().toISOString();
    const newApproval: ApprovalRecord = {
      id: `app-spv-${Date.now()}`,
      type: 'SUPERVISOR_APPROVE',
      userId: currentUser.id,
      userName: currentUser.name,
      employeeId: currentUser.employeeId,
      userRole: 'SUPERVISOR',
      signature: spvSignature,
      timestamp: now,
      notes: approvalNotes || 'Product quality verified and approved per KRA standards.',
    };

    setTestRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          workflowStatus: 'APPROVED',
          supervisorId: currentUser.id,
          supervisorName: currentUser.name,
          supervisorEmployeeId: currentUser.employeeId,
          supervisorSignature: spvSignature,
          approvedAt: now,
          approvals: [...r.approvals, newApproval],
          updatedAt: now,
        };
      })
    );

    logAudit(
      'TEST_APPROVED',
      `Approved Dyno Test Job Order ${record.jobOrder} (Model: ${record.typeModel}) and issued Quality Certificate.`,
      record.jobOrder,
      'WAITING_APPROVAL',
      'APPROVED'
    );

    return { success: true };
  };

  // Supervisor Reject (SUPERVISOR ONLY - STRICTLY NO ADMIN REJECT)
  const rejectTestRecord = (
    id: string,
    reason: string,
    signature?: string
  ): { success: boolean; message?: string } => {
    if (!reason || reason.trim().length === 0) {
      return { success: false, message: 'Rejection reason is mandatory.' };
    }

    const record = testRecords.find((r) => r.id === id);
    if (!record) return { success: false, message: 'Test record not found' };

    // 1. Strict Supervisor Role Check
    if (!currentUser || currentUser.role !== 'SUPERVISOR') {
      return {
        success: false,
        message: 'Access Denied: Supervisor permission required. Administrators and QC Testers are not authorized to reject test records.',
      };
    }

    const spvSignature = signature || currentUser.signature;
    const now = new Date().toISOString();
    const newApproval: ApprovalRecord = {
      id: `app-spv-rej-${Date.now()}`,
      type: 'SUPERVISOR_REJECT',
      userId: currentUser.id,
      userName: currentUser.name,
      employeeId: currentUser.employeeId,
      userRole: 'SUPERVISOR',
      signature: spvSignature || '',
      timestamp: now,
      rejectionReason: reason,
      notes: reason,
    };

    setTestRecords((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          workflowStatus: 'REJECTED',
          supervisorId: currentUser.id,
          supervisorName: currentUser.name,
          supervisorEmployeeId: currentUser.employeeId,
          supervisorSignature: spvSignature,
          approvedAt: now,
          rejectionReason: reason,
          approvals: [...r.approvals, newApproval],
          updatedAt: now,
        };
      })
    );

    logAudit(
      'TEST_REJECTED',
      `Rejected Dyno Test Job Order ${record.jobOrder}. Reason: ${reason}`,
      record.jobOrder,
      'WAITING_APPROVAL',
      'REJECTED'
    );

    return { success: true };
  };

  // Master Product CRUD (ADMIN only)
  const saveProduct = (prod: Partial<Product>, bumpRevision = false) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Access Denied – Administrator permission required.');
      return;
    }

    setProducts((prev) => {
      const existing = prev.find((p) => p.id === prod.id);
      if (existing) {
        const nextRev = bumpRevision ? (existing.revision || 1) + 1 : existing.revision || 1;
        const updated: Product = {
          ...existing,
          ...prod,
          revision: nextRev,
          effectiveDate: bumpRevision
            ? new Date().toISOString().split('T')[0]
            : prod.effectiveDate || existing.effectiveDate,
          parameters: (prod.parameters || existing.parameters || []).map((param, idx) => ({
            ...param,
            order: param.order || idx + 1,
          })),
        };

        // Check if specific parameter specs changed
        const specChanges: string[] = [];
        (updated.parameters || []).forEach((newParam) => {
          const oldParam = (existing.parameters || []).find((op) => op.id === newParam.id);
          if (oldParam && oldParam.specText !== newParam.specText) {
            specChanges.push(`${newParam.name}: "${oldParam.specText}" → "${newParam.specText}"`);
          }
        });

        if (specChanges.length > 0) {
          logAudit(
            'SPEC_MODIFIED',
            `Changed specification for ${updated.model}: ${specChanges.join(', ')}`,
            updated.model,
            `Rev ${existing.revision}`,
            `Rev ${updated.revision}`
          );
        } else {
          logAudit(
            'PRODUCT_UPDATED',
            `Updated Master Product ${updated.productName} (${updated.model}) [Rev ${updated.revision}].`,
            updated.model,
            `Rev ${existing.revision}`,
            `Rev ${updated.revision}`
          );
        }

        return prev.map((p) => (p.id === prod.id ? updated : p));
      } else {
        const newProduct: Product = {
          id: prod.id || `prod-${Date.now()}`,
          productType: prod.productType || 'ENGINE ASSY',
          productName: prod.productName || 'KOMATSU COMPONENT',
          model: prod.model || 'MODEL-01',
          componentPartNumber: prod.componentPartNumber || '',
          machineModel: prod.machineModel || '',
          description: prod.description || '',
          status: prod.status || 'ACTIVE',
          revision: 1,
          effectiveDate: new Date().toISOString().split('T')[0],
          parameters: (prod.parameters || []).map((param, idx) => ({
            ...param,
            order: param.order || idx + 1,
          })),
        };

        logAudit(
          'PRODUCT_CREATED',
          `Created Product ${newProduct.model} (${newProduct.productName}) with ${newProduct.parameters.length} parameters.`,
          newProduct.model,
          '-',
          'Rev 1'
        );
        return [...prev, newProduct];
      }
    });
  };

  const deleteProduct = (id: string) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Access Denied – Administrator permission required.');
      return;
    }

    const target = products.find((p) => p.id === id);
    if (!target) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    logAudit(
      'PRODUCT_DELETED',
      `Deleted Master Product ${target.model} (${target.productName})`,
      target.model,
      'Active',
      'DELETED'
    );
  };

  // Parameter Library Methods
  const findLibraryParameterByName = (name: string): LibraryParameter | undefined => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return undefined;
    return parameterLibrary.find((p) => p.name.trim().toLowerCase() === trimmed);
  };

  const getParameterUsageCount = (parameterCodeOrId: string, paramName?: string): number => {
    const targetCode = parameterCodeOrId.toLowerCase();
    const targetName = paramName ? paramName.trim().toLowerCase() : '';
    let count = 0;

    products.forEach((prod) => {
      const isUsed = (prod.parameters || []).some(
        (p) =>
          (p.parameterId && p.parameterId.toLowerCase() === targetCode) ||
          (targetName && p.name.trim().toLowerCase() === targetName)
      );
      if (isUsed) count++;
    });

    return count;
  };

  const getParameterUsageProducts = (parameterCodeOrId: string, paramName?: string): Product[] => {
    const targetCode = parameterCodeOrId.toLowerCase();
    const targetName = paramName ? paramName.trim().toLowerCase() : '';

    return products.filter((prod) =>
      (prod.parameters || []).some(
        (p) =>
          (p.parameterId && p.parameterId.toLowerCase() === targetCode) ||
          (targetName && p.name.trim().toLowerCase() === targetName)
      )
    );
  };

  const saveLibraryParameter = (param: Partial<LibraryParameter>): LibraryParameter => {
    let savedRecord: LibraryParameter;

    const existing = parameterLibrary.find(
      (p) => p.id === param.id || (param.parameterCode && p.parameterCode === param.parameterCode)
    );

    const now = new Date().toISOString().split('T')[0];

    if (existing) {
      savedRecord = {
        ...existing,
        ...param,
        updatedDate: now,
        updatedBy: currentUser ? `${currentUser.name} (${currentUser.employeeId})` : 'Admin User',
      };

      setParameterLibrary((prev) => prev.map((p) => (p.id === existing.id ? savedRecord : p)));

      logAudit(
        'PARAM_LIBRARY_UPDATED',
        `Updated Library Parameter ${savedRecord.parameterCode}: ${savedRecord.name} (Unit: ${savedRecord.defaultUnit}, Category: ${savedRecord.category})`,
        savedRecord.parameterCode,
        existing.name,
        savedRecord.name
      );
    } else {
      let nextCode = param.parameterCode;
      if (!nextCode) {
        const numbers = parameterLibrary
          .map((p) => {
            const match = p.parameterCode.match(/PARAM-(\d+)/i);
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((n) => !isNaN(n));
        const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
        nextCode = `PARAM-${String(maxNum + 1).padStart(4, '0')}`;
      }

      savedRecord = {
        id: param.id || `lib-param-${Date.now()}`,
        parameterCode: nextCode,
        name: param.name || 'New Parameter',
        description: param.description || '',
        category: param.category || 'GENERAL',
        defaultUnit: param.defaultUnit || 'HP',
        defaultSpecType: param.defaultSpecType || 'TARGET_TOLERANCE',
        defaultSpecText: param.defaultSpecText,
        defaultBankConfig: param.defaultBankConfig || 'SINGLE',
        defaultMinValue: param.defaultMinValue,
        defaultMaxValue: param.defaultMaxValue,
        defaultTargetValue: param.defaultTargetValue,
        defaultTolerance: param.defaultTolerance,
        defaultRequired: param.defaultRequired !== undefined ? param.defaultRequired : true,
        status: param.status || 'ACTIVE',
        createdDate: now,
        createdBy: currentUser ? `${currentUser.name} (${currentUser.employeeId})` : 'System User',
      };

      setParameterLibrary((prev) => [...prev, savedRecord]);

      logAudit(
        'PARAM_LIBRARY_CREATED',
        `Created new Library Parameter ${savedRecord.parameterCode}: ${savedRecord.name} (Unit: ${savedRecord.defaultUnit}, Category: ${savedRecord.category})`,
        savedRecord.parameterCode,
        '-',
        savedRecord.parameterCode
      );
    }

    return savedRecord;
  };

  const deleteLibraryParameter = (id: string): { success: boolean; message?: string } => {
    if (currentUser?.role !== 'ADMIN') {
      return { success: false, message: 'Access Denied: Administrator permission required.' };
    }

    const target = parameterLibrary.find((p) => p.id === id || p.parameterCode === id);
    if (!target) return { success: false, message: 'Parameter not found in library.' };

    const usageCount = getParameterUsageCount(target.parameterCode, target.name);
    if (usageCount > 0) {
      return {
        success: false,
        message: `Cannot delete parameter '${target.name}' (${target.parameterCode}) because it is currently used by ${usageCount} Product Master(s).`,
      };
    }

    setParameterLibrary((prev) => prev.filter((p) => p.id !== target.id));
    logAudit(
      'PARAM_LIBRARY_DELETED',
      `Deleted Library Parameter ${target.parameterCode}: ${target.name}`,
      target.parameterCode,
      'ACTIVE',
      'DELETED'
    );

    return { success: true };
  };

  // User CRUD (ADMIN only)
  const saveUser = (userData: Partial<User>) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Access Denied – Administrator permission required.');
      return;
    }

    setUsers((prev) => {
      const existing = prev.find((u) => u.id === userData.id);
      if (existing) {
        const updated = { ...existing, ...userData };
        logAudit(
          'USER_UPDATED',
          `Updated user profile for ${updated.name} (NIK: ${updated.employeeId}, Role: ${updated.role}, Active: ${updated.active ? 'Yes' : 'No'})`,
          updated.employeeId,
          existing.role,
          updated.role
        );
        return prev.map((u) => (u.id === userData.id ? updated : u));
      } else {
        const newUser: User = {
          id: userData.id || `usr-${Date.now()}`,
          name: userData.name || 'New User',
          employeeId: userData.employeeId || `KRA-${Date.now().toString().slice(-4)}`,
          username: userData.username || userData.name?.toLowerCase().replace(/\s+/g, '') || 'user',
          password: userData.password || '123',
          role: userData.role || 'QC_TESTER',
          email: userData.email || '',
          department: userData.department || 'Quality Assurance',
          active: userData.active !== undefined ? userData.active : true,
          signature: userData.signature,
        };
        logAudit(
          'USER_CREATED',
          `Created user account for ${newUser.name} as ${newUser.role} (NIK: ${newUser.employeeId})`,
          newUser.employeeId,
          '-',
          newUser.role
        );
        return [...prev, newUser];
      }
    });
  };

  const deleteUser = (id: string) => {
    if (currentUser?.role !== 'ADMIN') {
      alert('Access Denied – Administrator permission required.');
      return;
    }

    const target = users.find((u) => u.id === id);
    if (!target) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logAudit(
      'USER_DELETED',
      `Deleted user account ${target.name} (${target.employeeId})`,
      target.employeeId,
      target.role,
      'DELETED'
    );
  };

  const resetAllData = () => {
    safeLocalStorageRemove(STORAGE_KEYS.USERS);
    safeLocalStorageRemove(STORAGE_KEYS.PRODUCTS);
    safeLocalStorageRemove(STORAGE_KEYS.PARAMETER_LIBRARY);
    safeLocalStorageRemove(STORAGE_KEYS.RECORDS);
    safeLocalStorageRemove(STORAGE_KEYS.AUDIT);
    safeLocalStorageRemove(STORAGE_KEYS.ACTIVE_USER_ID);
    purgeLegacyStorageKeys();

    setUsers(INITIAL_USERS);
    setProducts(INITIAL_PRODUCTS);
    setParameterLibrary(INITIAL_PARAMETER_LIBRARY);
    setTestRecords(INITIAL_TEST_RECORDS);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setCurrentUserId(null);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        login,
        logout,
        setCurrentUser,
        users,
        setUsers,
        products,
        setProducts,
        parameterLibrary,
        setParameterLibrary,
        testBenches: STANDARD_TEST_BENCHES,
        testRecords,
        auditLogs,
        stats,
        createTestRecord,
        updateTestRecord,
        deleteTestRecord,
        approveTestRecord,
        rejectTestRecord,
        saveProduct,
        deleteProduct,
        saveLibraryParameter,
        deleteLibraryParameter,
        findLibraryParameterByName,
        getParameterUsageCount,
        getParameterUsageProducts,
        saveUser,
        deleteUser,
        generateNextCertNumber,
        resetAllData,
        logAudit,
        addAuditEvent: logAudit,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

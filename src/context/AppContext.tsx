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
import { calculateOverallResults, normalizeResults } from '../utils/evaluation';
import { approvalErrors, canEditTest, canDeleteTest, submissionErrors } from '../utils/testWorkflow';
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
  ) => TestRecord;
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
    return users.find((u) => u.id === currentUserId && u.active) || null;
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

  const ensureQc = () => {
    if (!currentUser?.active || currentUser.role !== 'QC_TESTER') throw new Error('An active QC Tester is required.');
    return currentUser;
  };

  const ensureSubmission = (record: Partial<TestRecord>) => {
    const errors = submissionErrors(record);
    const product = products.find(p => p.id === record.productId);
    if (!product || product.status !== 'ACTIVE') errors.push('Select an active master product.');
    if (!testBenchesForValidation(record.testBenchCode)) errors.push('Select a valid test bench.');
    if (errors.length) throw new Error(errors.join('\n'));
  };
  const testBenchesForValidation = (code?: string) => STANDARD_TEST_BENCHES.some(bench => bench.code === code);

  const createTestRecord = (
    data: Omit<TestRecord, 'id' | 'createdAt' | 'updatedAt' | 'approvals'>,
    signature?: string,
    isSubmit = false
  ): TestRecord => {
    const user = ensureQc();
    if (!data.jobOrder.trim() || !data.serialNumber.trim()) throw new Error('Job Order and Serial Number are required.');
    const results = normalizeResults(data.results);
    const evaluation = calculateOverallResults(results);
    const now = new Date().toISOString();
    const testerSignature = signature || user.signature || '';
    const certNo = data.certificateNumber && !testRecords.some(r => r.certificateNumber === data.certificateNumber) ? data.certificateNumber : generateNextCertNumber();
    const record: TestRecord = {
      ...data, ...evaluation, results,
      id: `test-rec-${crypto.randomUUID()}`, certificateNumber: certNo,
      workflowStatus: isSubmit ? 'WAITING_APPROVAL' : 'DRAFT',
      testerId: user.id, testerName: user.name, testerEmployeeId: user.employeeId,
      testerSignature, testedAt: now, createdAt: now, updatedAt: now,
      approvals: isSubmit ? [{id: crypto.randomUUID(), type: 'QC_SUBMIT', userId: user.id, userName: user.name, employeeId: user.employeeId, userRole: user.role, signature: testerSignature, timestamp: now}] : [],
    };
    if (isSubmit) ensureSubmission(record);
    setTestRecords(prev => [record, ...prev]);
    logAudit(isSubmit ? 'TEST_SUBMITTED' : 'TEST_SAVED_DRAFT', `Saved Dyno Test Job Order ${record.jobOrder}`, record.id, '-', record.workflowStatus);
    return record;
  };

  const updateTestRecord = (id: string, updates: Partial<TestRecord>, signature?: string, isSubmit = false): TestRecord => {
    const user = ensureQc();
    const previous = testRecords.find(record => record.id === id);
    if (!previous || !canEditTest(previous, user)) throw new Error('Only Draft or Rejected tests can be edited or resubmitted.');
    const results = normalizeResults(updates.results ?? previous.results);
    const now = new Date().toISOString();
    const testerSignature = signature || updates.testerSignature || previous.testerSignature || '';
    const record: TestRecord = {
      ...previous, ...updates, ...calculateOverallResults(results), results,
      id: previous.id, certificateNumber: previous.certificateNumber, createdAt: previous.createdAt,
      workflowStatus: isSubmit ? 'WAITING_APPROVAL' : 'DRAFT', updatedAt: now,
      testerId: user.id, testerName: user.name, testerEmployeeId: user.employeeId, testerSignature,
      supervisorId: undefined, supervisorName: undefined, supervisorEmployeeId: undefined, supervisorSignature: undefined, approvedAt: undefined,
      approvals: [...previous.approvals, ...(isSubmit ? [{id: crypto.randomUUID(), type: 'QC_SUBMIT' as const, userId: user.id, userName: user.name, employeeId: user.employeeId, userRole: user.role, signature: testerSignature, timestamp: now}] : [])],
    };
    if (isSubmit) ensureSubmission(record);
    setTestRecords(prev => prev.map(item => item.id === id && canEditTest(item, user) ? record : item));
    logAudit(isSubmit ? 'TEST_RESUBMITTED' : 'TEST_UPDATED', `Updated Dyno Test Job Order ${record.jobOrder}`, id, previous.workflowStatus, record.workflowStatus);
    return record;
  };

  const deleteTestRecord = (id: string) => {
    const record = testRecords.find(item => item.id === id);
    if (!record || !canDeleteTest(record, currentUser)) {
      alert('Only an Admin or the original QC Tester can delete a Draft. Submitted and approved records are locked.');
      return;
    }
    setTestRecords(prev => prev.filter(item => item.id !== id || !canDeleteTest(item, currentUser)));
    logAudit('TEST_DELETED', `Deleted Draft Job Order ${record.jobOrder}`, id, 'DRAFT', 'DELETED');
  };

  const approveTestRecord = (id: string, approvalNotes?: string, signature?: string): {success: boolean; message?: string} => {
    const record = testRecords.find(item => item.id === id);
    if (!record) return {success: false, message: 'Test record not found.'};
    const spvSignature = signature || currentUser?.signature;
    const errors = approvalErrors(record, currentUser, spvSignature);
    if (errors.length) return {success: false, message: errors.join('\n')};
    const user = currentUser!;
    const now = new Date().toISOString();
    const approval: ApprovalRecord = {id: crypto.randomUUID(), type: 'SUPERVISOR_APPROVE', userId: user.id, userName: user.name, employeeId: user.employeeId, userRole: user.role, signature: spvSignature!, timestamp: now, notes: approvalNotes};
    setTestRecords(prev => prev.map(item => {
      if (item.id !== id || approvalErrors(item, user, spvSignature).length) return item;
      const results = normalizeResults(item.results);
      return {...item, ...calculateOverallResults(results), results, workflowStatus: 'APPROVED', supervisorId: user.id, supervisorName: user.name, supervisorEmployeeId: user.employeeId, supervisorSignature: spvSignature, approvedAt: now, updatedAt: now, approvals: [...item.approvals, approval]};
    }));
    logAudit('TEST_APPROVED', `Approved Dyno Test Job Order ${record.jobOrder}`, id, 'WAITING_APPROVAL', 'APPROVED');
    return {success: true};
  };

  const rejectTestRecord = (id: string, reason: string, signature?: string): {success: boolean; message?: string} => {
    const record = testRecords.find(item => item.id === id);
    if (!currentUser?.active || currentUser.role !== 'SUPERVISOR') return {success: false, message: 'An active Supervisor is required.'};
    if (!record || record.workflowStatus !== 'WAITING_APPROVAL') return {success: false, message: 'Only records waiting for approval can be rejected.'};
    if (!reason.trim()) return {success: false, message: 'Rejection reason is mandatory.'};
    const user = currentUser;
    const now = new Date().toISOString();
    const approval: ApprovalRecord = {id: crypto.randomUUID(), type: 'SUPERVISOR_REJECT', userId: user.id, userName: user.name, employeeId: user.employeeId, userRole: user.role, signature: signature || user.signature || '', timestamp: now, rejectionReason: reason.trim(), notes: reason.trim()};
    setTestRecords(prev => prev.map(item => item.id === id && item.workflowStatus === 'WAITING_APPROVAL' ? {...item, workflowStatus: 'REJECTED', rejectionReason: reason.trim(), updatedAt: now, approvals: [...item.approvals, approval]} : item));
    logAudit('TEST_REJECTED', `Rejected Dyno Test Job Order ${record.jobOrder}: ${reason.trim()}`, id, 'WAITING_APPROVAL', 'REJECTED');
    return {success: true};
  };

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

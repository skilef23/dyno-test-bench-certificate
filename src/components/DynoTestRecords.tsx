import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  Edit2,
  Download,
  Plus,
  RotateCcw,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Building2,
  FileText,
  Printer,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TestRecord, WorkflowStatus, PassFailStatus } from '../types';

interface DynoTestRecordsProps {
  onNewTest: () => void;
  onEditTest: (record: TestRecord) => void;
  onViewRecord: (record: TestRecord) => void;
  onReviewApproval: (record: TestRecord) => void;
  onPreviewCertificate: (record: TestRecord) => void;
  onDownloadCertificate: (record: TestRecord) => void;
  initialStatusFilter?: string;
  isApprovalQueueOnly?: boolean;
}

export const DynoTestRecords: React.FC<DynoTestRecordsProps> = ({
  onNewTest,
  onEditTest,
  onViewRecord,
  onReviewApproval,
  onPreviewCertificate,
  onDownloadCertificate,
  initialStatusFilter = 'ALL',
  isApprovalQueueOnly = false,
}) => {
  const { testRecords, currentUser } = useApp();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(
    isApprovalQueueOnly ? 'WAITING_APPROVAL' : initialStatusFilter
  );
  const [resultFilter, setResultFilter] = useState<string>('ALL');
  const [testBenchFilter, setTestBenchFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Extract unique test benches from records
  const availableBenches = useMemo(() => {
    const benches = new Set<string>();
    testRecords.forEach((r) => {
      if (r.testBenchCode) benches.add(r.testBenchCode);
    });
    // Ensure default TB-01, TB-02, TB-03 are always available in options
    benches.add('TB-01');
    benches.add('TB-02');
    benches.add('TB-03');
    return Array.from(benches).sort();
  }, [testRecords]);

  // Composite multi-criteria filtering
  const filteredRecords = useMemo(() => {
    return testRecords.filter((rec) => {
      // 1. Search Query Filter
      const searchLower = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !searchLower ||
        rec.jobOrder.toLowerCase().includes(searchLower) ||
        rec.serialNumber.toLowerCase().includes(searchLower) ||
        rec.typeModel.toLowerCase().includes(searchLower) ||
        rec.productName.toLowerCase().includes(searchLower) ||
        rec.testerName.toLowerCase().includes(searchLower) ||
        (rec.testerEmployeeId && rec.testerEmployeeId.toLowerCase().includes(searchLower)) ||
        (rec.certificateNumber && rec.certificateNumber.toLowerCase().includes(searchLower)) ||
        (rec.componentPartNumber && rec.componentPartNumber.toLowerCase().includes(searchLower)) ||
        (rec.machineModel && rec.machineModel.toLowerCase().includes(searchLower));

      // 2. Workflow Status Filter
      const targetStatus = isApprovalQueueOnly ? 'WAITING_APPROVAL' : statusFilter;
      const matchesStatus = targetStatus === 'ALL' || rec.workflowStatus === targetStatus;

      // 3. Result Filter (PASS / FAIL)
      const matchesResult = resultFilter === 'ALL' || rec.overallResult === resultFilter;

      // 4. Test Bench Filter
      const benchCode = rec.testBenchCode || 'TB-01';
      const matchesBench = testBenchFilter === 'ALL' || benchCode === testBenchFilter;

      // 5. Date Filter (YYYY-MM-DD)
      const matchesDate = !dateFilter || rec.testDate === dateFilter;

      return matchesSearch && matchesStatus && matchesResult && matchesBench && matchesDate;
    });
  }, [testRecords, searchTerm, statusFilter, resultFilter, testBenchFilter, dateFilter, isApprovalQueueOnly]);

  const hasActiveFilters =
    searchTerm !== '' ||
    (!isApprovalQueueOnly && statusFilter !== 'ALL') ||
    resultFilter !== 'ALL' ||
    testBenchFilter !== 'ALL' ||
    dateFilter !== '';

  const handleResetFilters = () => {
    setSearchTerm('');
    if (!isApprovalQueueOnly) setStatusFilter('ALL');
    setResultFilter('ALL');
    setTestBenchFilter('ALL');
    setDateFilter('');
  };

  const isQc = currentUser.role === 'QC_TESTER';
  const isSupervisor = currentUser.role === 'SUPERVISOR';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <div className="space-y-5">
      {/* Page Title & Operational Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-black rounded bg-blue-950 text-amber-400 tracking-wider uppercase">
              KOMATSU REMAN
            </span>
            <span className="text-xs text-slate-500 font-medium">Quality Assurance & Dyno Testing</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-blue-950 tracking-tight mt-1">
            {isApprovalQueueOnly ? 'WAITING APPROVAL QUEUE' : 'DYNO TEST RECORDS'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isApprovalQueueOnly
              ? 'List of Dyno Test Bench records submitted by QC Testers pending Supervisor review, verification, and digital signing.'
              : 'All Dyno Test Bench records, test results, approval status, and certificates.'}
          </p>
        </div>

        {/* Action Button: QC Tester Only can create new test */}
        {isQc && !isApprovalQueueOnly && (
          <button
            id="btn-create-new-dyno-test"
            type="button"
            onClick={onNewTest}
            className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-all hover:shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ New Dyno Test</span>
          </button>
        )}
      </div>

      {/* Search and Composite Filter Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="input-search-dyno-records"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Job Order, Serial No, Model, Tester..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none bg-white text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Filter Status (Hidden in dedicated approval queue view) */}
            {!isApprovalQueueOnly && (
              <select
                id="select-filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none bg-white font-medium text-slate-700 cursor-pointer"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="WAITING_APPROVAL">Waiting Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            )}

            {/* Filter Result: PASS / FAIL */}
            <select
              id="select-filter-result"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none bg-white font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Results</option>
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
            </select>

            {/* Filter Test Bench: All Test Benches, TB-01, TB-02, TB-03 */}
            <select
              id="select-filter-test-bench"
              value={testBenchFilter}
              onChange={(e) => setTestBenchFilter(e.target.value)}
              className="py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-800 focus:outline-none bg-white font-medium text-slate-700 cursor-pointer"
            >
              <option value="ALL">All Test Benches</option>
              {availableBenches.map((tb) => (
                <option key={tb} value={tb}>
                  {tb}
                </option>
              ))}
            </select>

            {/* Filter Date: Date Picker */}
            <div className="flex items-center gap-1.5 border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                id="input-filter-date"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs text-slate-700 focus:outline-none bg-transparent cursor-pointer"
                title="Filter by Test Date"
              />
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              id="btn-reset-filters"
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-semibold px-2.5 py-1.5 rounded-md hover:bg-rose-50 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Record Table Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Header Bar */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {isApprovalQueueOnly ? 'Records Pending Review' : 'Dyno Test Records Table'}
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 bg-blue-100 text-blue-900 rounded-full">
              {filteredRecords.length} {filteredRecords.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>

          <div className="text-[11px] text-slate-500">
            Click action buttons to preview certificate, review, or edit test.
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[920px]">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3.5 w-28">Test Date</th>
                <th className="py-3 px-3.5 w-32">Job Order</th>
                <th className="py-3 px-3.5">Product / Model</th>
                <th className="py-3 px-3.5 w-32">Serial Number</th>
                <th className="py-3 px-2.5 w-20 text-center">Bench</th>
                <th className="py-3 px-3.5 w-36">QC Tester</th>
                <th className="py-3 px-2.5 w-20 text-center">Result</th>
                <th className="py-3 px-3.5 w-36 text-center">Workflow Status</th>
                <th className="py-3 px-4 w-44 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <p className="font-semibold text-sm text-slate-600">No Dyno Test records found.</p>
                    <p className="text-xs mt-1 text-slate-400">
                      {hasActiveFilters
                        ? 'Try clearing or adjusting your search filters above.'
                        : 'No test records have been recorded yet. Click "+ New Dyno Test" to begin.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isApproved = rec.workflowStatus === 'APPROVED';
                  const isWaiting = rec.workflowStatus === 'WAITING_APPROVAL';
                  const isDraft = rec.workflowStatus === 'DRAFT';
                  const isRejected = rec.workflowStatus === 'REJECTED';
                  const isPass = rec.overallResult === 'PASS';

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-slate-50/80 transition-colors"
                      id={`record-row-${rec.id}`}
                    >
                      {/* 1. Test Date */}
                      <td className="py-3.5 px-3.5 text-slate-700 whitespace-nowrap font-medium">
                        {rec.testDate}
                      </td>

                      {/* 2. Job Order */}
                      <td className="py-3.5 px-3.5 font-mono font-bold text-blue-950 whitespace-nowrap">
                        {rec.jobOrder}
                      </td>

                      {/* 3. Product / Model */}
                      <td className="py-3.5 px-3.5">
                        <strong className="text-slate-900 block font-bold text-xs">{rec.typeModel}</strong>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{rec.productName}</span>
                      </td>

                      {/* 4. Serial Number */}
                      <td className="py-3.5 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {rec.serialNumber}
                      </td>

                      {/* 5. Bench */}
                      <td className="py-3.5 px-2.5 font-mono font-semibold text-slate-700 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px]">
                          {rec.testBenchCode || 'TB-01'}
                        </span>
                      </td>

                      {/* 6. QC Tester */}
                      <td className="py-3.5 px-3.5 whitespace-nowrap">
                        <span className="text-slate-900 font-medium block leading-snug">{rec.testerName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          NIK: {rec.testerEmployeeId || '-'}
                        </span>
                      </td>

                      {/* 7. Result */}
                      <td className="py-3.5 px-2.5 text-center whitespace-nowrap">
                        {isPass ? (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-black rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            PASS
                          </span>
                        ) : rec.overallResult === 'FAIL' ? (
                          <span className="inline-block px-2.5 py-0.5 text-[10px] font-black rounded bg-rose-100 text-rose-800 border border-rose-300">
                            FAIL
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-500">
                            PENDING
                          </span>
                        )}
                      </td>

                      {/* 8. Workflow Status */}
                      <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {isWaiting && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Waiting Approval
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            Draft
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Rejected
                          </span>
                        )}
                      </td>

                      {/* 9. Actions Based On Workflow Status & Role */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* ======================= DRAFT STATUS ======================= */}
                          {isDraft && (
                            <>
                              {isQc ? (
                                <button
                                  id={`btn-continue-test-${rec.id}`}
                                  type="button"
                                  onClick={() => onEditTest(rec)}
                                  className="px-3 py-1.5 text-xs font-bold text-blue-950 bg-amber-400 hover:bg-amber-300 rounded shadow-xs flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Continue entering test data"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Continue Test</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onViewRecord(rec)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View test draft in read-only mode"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* ================= WAITING APPROVAL STATUS ================= */}
                          {isWaiting && (
                            <>
                              {isSupervisor ? (
                                <button
                                  id={`btn-review-approval-${rec.id}`}
                                  type="button"
                                  onClick={() => onReviewApproval(rec)}
                                  className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-blue-950 rounded flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                                  title="Review Dyno Test & Approve/Reject"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>Review</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onViewRecord(rec)}
                                  className="px-3 py-1.5 text-xs font-semibold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View submitted record"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* ===================== REJECTED STATUS ===================== */}
                          {isRejected && (
                            <>
                              {isQc ? (
                                <button
                                  id={`btn-edit-rejected-${rec.id}`}
                                  type="button"
                                  onClick={() => onEditTest(rec)}
                                  className="px-3 py-1.5 text-xs font-bold text-rose-900 bg-rose-100 hover:bg-rose-200 border border-rose-300 rounded flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Edit test parameters and resubmit for approval"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-rose-700" />
                                  <span>Edit / Resubmit</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onViewRecord(rec)}
                                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                                  title="View rejected record"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>View</span>
                                </button>
                              )}
                            </>
                          )}

                          {/* ===================== APPROVED STATUS ===================== */}
                          {isApproved && (
                            <div className="flex items-center gap-1">
                              {/* Preview Certificate */}
                              <button
                                id={`btn-preview-cert-${rec.id}`}
                                type="button"
                                onClick={() => onPreviewCertificate(rec)}
                                className="px-2.5 py-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                                title="Open Quality Certificate Preview"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 text-blue-800" />
                                <span>Preview</span>
                              </button>

                              {/* Download Certificate PDF Directly */}
                              <button
                                id={`btn-download-pdf-${rec.id}`}
                                type="button"
                                onClick={() => onDownloadCertificate(rec)}
                                className="px-2.5 py-1.5 text-xs font-bold text-white bg-blue-950 hover:bg-blue-900 rounded flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                                title="Download Official Certificate PDF"
                              >
                                <Download className="w-3.5 h-3.5 text-amber-400" />
                                <span>PDF</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

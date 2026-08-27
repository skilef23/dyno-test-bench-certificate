import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  X,
  UserCheck,
  ShieldCheck,
  Building2,
  MessageSquare,
  PenTool,
} from 'lucide-react';
import { TestRecord } from '../types';
import { useApp } from '../context/AppContext';
import { SignaturePad } from './SignaturePad';
import { PerformanceChart } from './PerformanceChart';
import confetti from 'canvas-confetti';

interface SupervisorApprovalModalProps {
  record: TestRecord;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupervisorApprovalModal: React.FC<SupervisorApprovalModalProps> = ({
  record,
  onClose,
  onSuccess,
}) => {
  const { currentUser, approveTestRecord, rejectTestRecord } = useApp();

  const isSupervisor = currentUser?.role === 'SUPERVISOR';
  const [activeTab, setActiveTab] = useState<'review' | 'sign'>('review');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [supervisorSignature, setSupervisorSignature] = useState(
    isSupervisor ? currentUser.signature || '' : ''
  );
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Strict guard: If currentUser is not a Supervisor, render Access Denied modal
  if (!isSupervisor) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex justify-center items-center p-3 sm:p-5">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center border border-slate-200">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1">Access Denied</h3>
          <p className="text-xs text-slate-600 mb-4">
            Supervisor permission required. Administrators and QC Testers are not authorized to review, approve, or reject Dyno Test records.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isPass = record.overallResult === 'PASS';
  const failedParams = record.results.filter((r) => r.status === 'FAIL');

  const isSelfApproval =
    record.testerId === currentUser.id ||
    record.testerEmployeeId === currentUser.employeeId ||
    (record.testerName &&
      record.testerName.trim().toLowerCase() === currentUser.name.trim().toLowerCase());

  const handleApprove = () => {
    if (isSelfApproval) {
      setErrorMessage(
        'Self-approval is not allowed. The approval must be performed by a different authorized Supervisor.'
      );
      return;
    }

    if (!supervisorSignature) {
      setErrorMessage('Digital signature is required to approve the test certificate.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const res = approveTestRecord(record.id, approvalNotes, supervisorSignature);
    if (res.success) {
      confetti({
        particleCount: 70,
        spread: 70,
        origin: { y: 0.6 },
      });
      onSuccess();
    } else {
      setErrorMessage(res.message || 'Approval failed.');
      setIsProcessing(false);
    }
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      setErrorMessage('Please provide a specific rejection reason for the QC operator.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    const res = rejectTestRecord(record.id, rejectionReason, supervisorSignature);
    if (res.success) {
      onSuccess();
    } else {
      setErrorMessage(res.message || 'Rejection failed.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/75 backdrop-blur-xs flex justify-center items-center p-3 sm:p-5">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-blue-950 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900 rounded-lg">
              <UserCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Supervisor Review & Approval</h3>
                <span className="text-xs font-mono bg-blue-800 text-amber-300 px-2 py-0.5 rounded">
                  {record.certificateNumber}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Job Order: {record.jobOrder} • Model: {record.typeModel} (S/N: {record.serialNumber})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-blue-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'review'
                ? 'border-blue-900 text-blue-950 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>1. Review Data & Parameters</span>
            {failedParams.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-600 text-white rounded-full">
                {failedParams.length} Fail
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sign')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'sign'
                ? 'border-blue-900 text-blue-950 bg-white rounded-t-lg'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>2. Digital Sign & Decision</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Self-Approval Warning Banner */}
          {isSelfApproval && (
            <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 flex items-start gap-3 shadow-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-900 text-sm">
                  ⚠️ Self-Approval Restriction Enforced
                </p>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  You are registered as the QC Tester (<strong>{record.testerName}</strong>) for this Dyno Test record.
                  Under Komatsu Reman Quality Control Standard Operating Procedures, <strong>testers cannot approve their own submissions</strong>.
                  Please have another authorized Quality Supervisor log in to review and approve this certificate.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'review' ? (
            <div className="space-y-4">
              {/* Product Info Card */}
              <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-2">
                  Product & Test Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Product:</span>
                    <strong className="text-slate-800">{record.productName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Job Order:</span>
                    <strong className="text-blue-900 font-mono">{record.jobOrder}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Model / Type:</span>
                    <strong className="text-slate-800">{record.typeModel}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Serial Number:</span>
                    <strong className="text-blue-900 font-mono">{record.serialNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Comp. Part No:</span>
                    <span className="text-slate-800 font-mono">{record.componentPartNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Machine Model:</span>
                    <span className="text-slate-800">{record.machineModel}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Dyno Bench:</span>
                    <span className="text-slate-800">{record.testBenchCode} ({record.testBenchName})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Test Date / Tester:</span>
                    <span className="text-slate-800">{record.testDate} • {record.testerName}</span>
                  </div>
                </div>
              </div>

              {/* Status Overview Banner */}
              <div
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  isPass
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isPass ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <div>
                    <h5 className="font-bold text-xs">
                      Automatic Result: {isPass ? 'ALL PARAMETERS PASSED' : 'PARAMETER NON-COMPLIANCE DETECTED'}
                    </h5>
                    <p className="text-[11px] opacity-90">
                      Total: {record.totalParameters} | Passed: {record.passedParameters} | Failed: {record.failedParameters}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 text-xs font-black rounded uppercase tracking-wider ${
                    isPass ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {record.overallResult}
                </span>
              </div>

              {/* Parameter Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-800">Dyno Test Bench Results Comparison</span>
                  <span className="text-[11px] text-slate-500">Auto-evaluated against Master Specification</span>
                </div>
                <div className="overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-[11px] text-slate-600">
                      <tr>
                        <th className="py-2 px-2.5 text-center w-8">#</th>
                        <th className="py-2 px-3">Parameter Name</th>
                        <th className="py-2 px-3">Master Specification</th>
                        <th className="py-2 px-3 text-center">Unit</th>
                        <th className="py-2 px-3">Actual Value</th>
                        <th className="py-2 px-3 text-center w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {record.results.map((item, idx) => (
                        <tr
                          key={item.parameterId || idx}
                          className={item.status === 'FAIL' ? 'bg-rose-50/60 font-semibold' : 'hover:bg-slate-50'}
                        >
                          <td className="py-2 px-2.5 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-3 text-slate-900">{item.parameterName}</td>
                          <td className="py-2 px-3 text-slate-700">{item.specText}</td>
                          <td className="py-2 px-3 text-center text-slate-600">{item.unit}</td>
                          <td className="py-2 px-3 font-mono">
                            {item.hasRhLh ? (
                              <span>
                                RH: <strong>{item.actualRh ?? '-'}</strong> | LH: <strong>{item.actualLh ?? '-'}</strong>
                              </span>
                            ) : (
                              <strong>{item.actualValue ?? '-'}</strong>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.status === 'PASS' ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">
                                PASS
                              </span>
                            ) : (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">
                                FAIL
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Performance Graph Preview */}
              <PerformanceChart
                results={record.results}
                performanceData={record.performanceData}
                samplingPoints={record.samplingPoints}
                jisFactor={record.jisFactor}
                ratedPowerResult={record.ratedPowerResult}
                ratedTorqueResult={record.ratedTorqueResult}
                modelName={record.typeModel}
              />

              {/* Tester Signature View */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 block">Submitted by QC Tester:</span>
                  <strong className="text-xs text-slate-900">{record.testerName}</strong>
                  <span className="text-xs text-slate-500 block">NIK: {record.testerEmployeeId}</span>
                </div>
                {record.testerSignature && (
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 block mb-1">QC Digital Signature</span>
                    <img
                      src={record.testerSignature}
                      alt="QC Signature"
                      className="h-10 max-w-[120px] object-contain border border-slate-200 bg-white rounded p-1"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Sign & Decision Step */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setActionType('approve')}
                  className={`p-3.5 rounded-lg border-2 text-left flex items-start gap-3 transition-all ${
                    actionType === 'approve'
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-full bg-emerald-100 text-emerald-800 mt-0.5">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-emerald-950">Approve Certificate</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Verify product compliance and issue official KRA Quality Certificate.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setActionType('reject')}
                  className={`p-3.5 rounded-lg border-2 text-left flex items-start gap-3 transition-all ${
                    actionType === 'reject'
                      ? 'border-rose-600 bg-rose-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="p-2 rounded-full bg-rose-100 text-rose-800 mt-0.5">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-rose-950">Reject Test Record</h5>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Return to QC operator for calibration check or re-testing.
                    </p>
                  </div>
                </button>
              </div>

              {actionType === 'approve' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Approval Remarks / Notes (Optional):
                    </label>
                    <textarea
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder="e.g., Verified all test curves and sensor logs. Product ready for delivery."
                      rows={2}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60">
                    <label className="block text-xs font-bold text-blue-950 mb-2">
                      Supervisor Digital Signature (Required for Certificate Issuance):
                    </label>
                    <SignaturePad
                      initialSignature={supervisorSignature}
                      userName={currentUser.name}
                      employeeId={currentUser.employeeId}
                      onSave={(sig) => setSupervisorSignature(sig)}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-rose-900 mb-1">
                      Alasan Penolakan / Rejection Reason (Mandatory)*:
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Contoh: Exhaust Temp LH melebihi batas toleransi (685°C > Max 650°C). Lakukan pengecekan nozzle injector bank kiri dan lakukan dyno re-test."
                      rows={3}
                      className="w-full text-xs p-2.5 border border-rose-300 rounded-md focus:ring-2 focus:ring-rose-600 focus:outline-none bg-rose-50/20"
                    />
                  </div>

                  <div className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/60">
                    <label className="block text-xs font-bold text-slate-800 mb-2">
                      Supervisor Verification Signature:
                    </label>
                    <SignaturePad
                      initialSignature={supervisorSignature}
                      userName={currentUser.name}
                      employeeId={currentUser.employeeId}
                      onSave={(sig) => setSupervisorSignature(sig)}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {activeTab === 'review' ? (
              <button
                type="button"
                onClick={() => setActiveTab('sign')}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-md shadow-xs flex items-center gap-1.5"
              >
                <span>Proceed to Sign & Decision</span>
                <span>→</span>
              </button>
            ) : actionType === 'approve' ? (
              <button
                id="btn-confirm-approve"
                type="button"
                onClick={handleApprove}
                disabled={isProcessing || isSelfApproval}
                title={
                  isSelfApproval
                    ? 'Self-approval is forbidden. Another supervisor must approve.'
                    : 'Approve & Issue Certificate'
                }
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-600 rounded-md shadow-sm flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isProcessing
                  ? 'Processing Approval...'
                  : isSelfApproval
                  ? 'Self-Approval Blocked'
                  : 'Approve & Issue Certificate'}
              </button>
            ) : (
              <button
                id="btn-confirm-reject"
                type="button"
                onClick={handleReject}
                disabled={isProcessing}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-md shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                {isProcessing ? 'Processing...' : 'Reject Test Record'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { History, Search, ShieldCheck, Filter, ArrowRight, UserCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

export const AuditTrailView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | string>('ALL');

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.performedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.recordId && log.recordId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.previousValue && log.previousValue.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.newValue && log.newValue.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || log.role === roleFilter;
    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;

    return matchesSearch && matchesRole && matchesAction;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="px-2 py-0.5 text-[10px] font-black rounded bg-purple-100 text-purple-800 border border-purple-200">
            ADMIN
          </span>
        );
      case 'SUPERVISOR':
        return (
          <span className="px-2 py-0.5 text-[10px] font-black rounded bg-sky-100 text-sky-800 border border-sky-200">
            SUPERVISOR
          </span>
        );
      case 'QC_TESTER':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-black rounded bg-amber-100 text-amber-900 border border-amber-200">
            QC TESTER
          </span>
        );
    }
  };

  const getActionBadge = (action: string) => {
    if (action.includes('APPROVED')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-300';
    }
    if (action.includes('REJECTED') || action.includes('DELETED')) {
      return 'bg-rose-50 text-rose-800 border-rose-300';
    }
    if (action.includes('SUBMITTED')) {
      return 'bg-blue-50 text-blue-800 border-blue-300';
    }
    if (action.includes('SPEC_MODIFIED')) {
      return 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
    }
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <div className="space-y-5">
      {/* Header card */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-amber-500" />
            System Audit Trail & Separation of Duties Log
          </h2>
          <p className="text-xs text-slate-500">
            Complete traceability of user actions, master specification modifications, dyno test submissions, and supervisor approval decisions.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="text-xs py-1.5 px-2.5 border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Admin</option>
            <option value="SUPERVISOR">Supervisor</option>
            <option value="QC_TESTER">QC Tester</option>
          </select>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs py-1.5 px-2.5 border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:ring-2 focus:ring-blue-800 focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="PRODUCT_CREATED">Product Created</option>
            <option value="SPEC_MODIFIED">Spec Modified</option>
            <option value="PRODUCT_UPDATED">Product Updated</option>
            <option value="TEST_SUBMITTED">Test Submitted</option>
            <option value="TEST_APPROVED">Test Approved</option>
            <option value="TEST_REJECTED">Test Rejected</option>
            <option value="USER_UPDATED">User Updated</option>
          </select>

          {/* Search */}
          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search audit records..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-800 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Audit Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
              <tr>
                <th className="py-3 px-3 w-36">Date / Time</th>
                <th className="py-3 px-3 w-40">User & Role</th>
                <th className="py-3 px-3 w-36">Action</th>
                <th className="py-3 px-3 w-32">Record ID</th>
                <th className="py-3 px-3 w-44">Previous Value</th>
                <th className="py-3 px-3 w-44">New Value</th>
                <th className="py-3 px-3">Details & Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">No audit records match your filters.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    {/* Timestamp */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* User & Role */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{log.performedBy}</div>
                      <div className="mt-0.5">{getRoleBadge(log.role)}</div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Record ID */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {log.recordId || log.testRecordId || '-'}
                    </td>

                    {/* Previous Value */}
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600 bg-slate-50/50">
                      {log.previousValue ? (
                        <span className="text-slate-600">{log.previousValue}</span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    {/* New Value */}
                    <td className="py-3 px-3 font-mono text-[11px] font-semibold text-blue-950 bg-blue-50/20">
                      {log.newValue ? (
                        <span className="text-slate-900 font-bold">{log.newValue}</span>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    {/* Details */}
                    <td className="py-3 px-3 text-slate-700 leading-snug">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

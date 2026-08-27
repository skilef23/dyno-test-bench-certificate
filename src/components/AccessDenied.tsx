import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UserRole } from '../types';

interface AccessDeniedProps {
  requiredRole?: UserRole | string;
  message?: string;
  onGoBack?: () => void;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({
  requiredRole = 'ADMIN',
  message = 'Access Denied – Administrator permission required.',
  onGoBack,
}) => {
  const { currentUser, logout } = useApp();

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'SUPERVISOR':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'QC_TESTER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-rose-200 shadow-xl overflow-hidden text-center">
        {/* Top Warning Banner */}
        <div className="bg-rose-600 px-6 py-8 text-white flex flex-col items-center justify-center relative">
          <div className="w-16 h-16 bg-white/15 backdrop-blur-xs rounded-2xl flex items-center justify-center mb-3 ring-4 ring-white/20">
            <ShieldAlert className="w-9 h-9 text-white" />
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest bg-rose-950/40 text-rose-100 mb-1 border border-white/20">
            Security Enforcement • RBAC
          </span>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {message}
          </h2>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Your Current Profile:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getRoleBadge(
                  currentUser?.role
                )}`}
              >
                {currentUser?.role ? currentUser.role.replace('_', ' ') : 'UNAUTHENTICATED'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Authenticated Name:</span>
              <span className="font-bold text-slate-900">{currentUser?.name || '-'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Employee ID (NIK):</span>
              <span className="font-mono font-bold text-slate-800">{currentUser?.employeeId || '-'}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-slate-500 font-semibold">Required Permission:</span>
              <span className="font-bold text-rose-700 uppercase tracking-wide">
                {requiredRole.replace('_', ' ')} ONLY
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            In compliance with ISO / KRA Quality Assurance Governance, direct access to this module
            is strictly restricted to authorized roles. All unauthorized access attempts are logged to the system audit trail.
          </p>

          {/* Explicit Navigation & User Switch / Logout */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Records</span>
              </button>
            )}
            <button
              type="button"
              id="btn-access-denied-logout"
              onClick={() => logout()}
              className="w-full sm:w-auto px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-600" />
              <span>Switch User (Logout)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

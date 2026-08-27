import React, { useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  CheckCircle2,
  XCircle,
  X,
  PenTool,
  Upload,
  Eye,
  Check,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';
import { SignaturePad } from './SignaturePad';

export const UserManagement: React.FC = () => {
  const { users, saveUser, deleteUser, currentUser } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [editingUser, setEditingUser] = useState<Partial<User>>({
    name: '',
    employeeId: '',
    role: 'QC_TESTER',
    email: '',
    department: 'QC Dyno Test Bench Division',
    active: true,
  });

  const handleOpenCreate = () => {
    setEditingUser({
      name: '',
      employeeId: `KRA-QC-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'QC_TESTER',
      email: '',
      department: 'QC Dyno Test Bench Division',
      active: true,
    });
    setIsEditing(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser({ ...u });
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser.name?.trim() || !editingUser.employeeId?.trim()) {
      alert('Name and Employee ID (NIK) are required.');
      return;
    }
    saveUser(editingUser);
    setIsEditing(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete user account "${name}"?`)) {
      deleteUser(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-blue-900 text-amber-400">
              Master Data
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Security & Digital Authentication
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">
            User & Signature Setup
          </h1>
          <p className="text-sm text-slate-600">
            Configure QC Testers, Approving Supervisors, Administrators, and registered digital signatures for official certificate sign-off.
          </p>
        </div>

        {currentUser.role === 'ADMIN' && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Add New User</span>
          </button>
        )}
      </div>

      {/* Users Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {users.map((u) => (
          <div
            key={u.id}
            className={`bg-white rounded-xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all ${
              u.id === currentUser.id
                ? 'border-blue-900 ring-2 ring-blue-900/10'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`px-2 py-0.5 font-bold text-[10px] rounded uppercase tracking-wider ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : u.role === 'SUPERVISOR'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {u.role.replace('_', ' ')}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1.5">{u.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-mono font-bold">
                    <span>NIK: {u.employeeId}</span>
                    {u.username && (
                      <>
                        <span>•</span>
                        <span className="text-slate-600">User: {u.username}</span>
                      </>
                    )}
                  </div>
                </div>

                {currentUser.role === 'ADMIN' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded"
                      title="Edit User Profile"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {users.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(u.id, u.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                        title="Delete User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <p>
                  <strong className="text-slate-700">Department:</strong> {u.department}
                </p>
                <p className="truncate">
                  <strong className="text-slate-700">Email:</strong> {u.email || '-'}
                </p>
              </div>

              {/* Signature Preview */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Registered Digital Signature
                </span>
                {u.signature ? (
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-center min-h-[55px]">
                    <img
                      src={u.signature}
                      alt="User Signature"
                      className="h-10 max-w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="p-2 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-[11px] text-slate-400 italic">
                    No signature registered yet
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-500 font-medium">Account Status</span>
              {u.active ? (
                <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active
                </span>
              ) : (
                <span className="text-slate-400 font-bold text-xs flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Suspended
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit / Create User Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-black text-slate-900">
                {editingUser.id ? `Edit User: ${editingUser.name}` : 'Create New User Account'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.name || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="e.g. Agus Setiawan"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">
                    Employee ID (NIK) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.employeeId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, employeeId: e.target.value })}
                    placeholder="e.g. KRA-QC-2045"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editingUser.username || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    placeholder="e.g. agus"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Account Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingUser.password || '123'}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    placeholder="e.g. 123"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">
                    Role & Permission <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editingUser.role || 'QC_TESTER'}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value as UserRole })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  >
                    <option value="QC_TESTER">QC TESTER (Test Bench Operator)</option>
                    <option value="SUPERVISOR">SUPERVISOR (Quality Approver)</option>
                    <option value="ADMIN">ADMINISTRATOR (Full Master Access)</option>
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block font-bold text-slate-700 mb-1">Account Status</label>
                  <select
                    value={editingUser.active ? 'ACTIVE' : 'SUSPENDED'}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, active: e.target.value === 'ACTIVE' })
                    }
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  >
                    <option value="ACTIVE">ACTIVE (Authorized to Sign In)</option>
                    <option value="SUSPENDED">SUSPENDED (Deactivated Account)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    value={editingUser.email || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="e.g. agus.setiawan@komatsureman.co.id"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Department / Division
                  </label>
                  <input
                    type="text"
                    value={editingUser.department || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                    placeholder="e.g. QC Dyno Test Bench Division"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              {/* Digital Signature Setup for User */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                <label className="block font-bold text-slate-800">
                  Registered Digital Signature (Used during Test Submission & Approval):
                </label>
                <SignaturePad
                  initialSignature={editingUser.signature}
                  userName={editingUser.name || 'User'}
                  employeeId={editingUser.employeeId}
                  onSave={(sig) => setEditingUser({ ...editingUser, signature: sig })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>Save User Setup</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

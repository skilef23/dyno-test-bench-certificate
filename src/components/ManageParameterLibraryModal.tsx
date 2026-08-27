import React, { useState, useMemo } from 'react';
import {
  LibraryParameter,
  ParameterCategory,
  BankConfig,
  SpecType,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  Search,
  SlidersHorizontal,
  Plus,
  Edit2,
  Trash2,
  Layers,
  Info,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Gauge,
  Thermometer,
  Zap,
  Droplets,
  Wind,
  Activity,
  Tag,
  BookOpen,
  Calendar,
  UserCheck,
  Sparkles,
} from 'lucide-react';

interface ManageParameterLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_LIST: { key: ParameterCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'PERFORMANCE', label: 'Performance', icon: Gauge },
  { key: 'PRESSURE', label: 'Pressure', icon: Wind },
  { key: 'TEMPERATURE', label: 'Temperature', icon: Thermometer },
  { key: 'ELECTRICAL', label: 'Electrical', icon: Zap },
  { key: 'FLOW_LEVEL', label: 'Flow & Level', icon: Droplets },
  { key: 'EMISSION_GAS', label: 'Emission & Gas', icon: Activity },
  { key: 'GENERAL', label: 'General / Other', icon: Tag },
];

export const ManageParameterLibraryModal: React.FC<ManageParameterLibraryModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    parameterLibrary,
    saveLibraryParameter,
    deleteLibraryParameter,
    getParameterUsageCount,
    getParameterUsageProducts,
    currentUser,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ParameterCategory>('ALL');

  // Form modal state for creating/editing a library parameter
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingParam, setEditingParam] = useState<LibraryParameter | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<ParameterCategory>('PERFORMANCE');
  const [formDesc, setFormDesc] = useState('');
  const [formUnit, setFormUnit] = useState('HP');
  const [formSpecType, setFormSpecType] = useState<SpecType>('TARGET_TOLERANCE');
  const [formSpecText, setFormSpecText] = useState('');
  const [formBankConfig, setFormBankConfig] = useState<BankConfig>('SINGLE');
  const [formTargetVal, setFormTargetVal] = useState('');
  const [formTolerance, setFormTolerance] = useState('');
  const [formMinVal, setFormMinVal] = useState('');
  const [formMaxVal, setFormMaxVal] = useState('');
  const [formRequired, setFormRequired] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [paramToDelete, setParamToDelete] = useState<LibraryParameter | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // View usage details modal
  const [viewUsageParam, setViewUsageParam] = useState<LibraryParameter | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const filteredList = useMemo(() => {
    return parameterLibrary.filter((param) => {
      const matchesSearch =
        param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        param.parameterCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (param.description && param.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        param.defaultUnit.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = categoryFilter === 'ALL' || param.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [parameterLibrary, searchTerm, categoryFilter]);

  if (!isOpen) return null;

  const handleOpenAdd = () => {
    setEditingParam(null);
    setFormName('');
    setFormCategory('PERFORMANCE');
    setFormDesc('');
    setFormUnit('HP');
    setFormSpecType('TARGET_TOLERANCE');
    setFormSpecText('');
    setFormBankConfig('SINGLE');
    setFormTargetVal('');
    setFormTolerance('');
    setFormMinVal('');
    setFormMaxVal('');
    setFormRequired(true);
    setFormErrors({});
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (param: LibraryParameter) => {
    setEditingParam(param);
    setFormName(param.name);
    setFormCategory(param.category || 'PERFORMANCE');
    setFormDesc(param.description || '');
    setFormUnit(param.defaultUnit);
    setFormSpecType(param.defaultSpecType);
    setFormSpecText(param.defaultSpecText || '');
    setFormBankConfig(param.defaultBankConfig || 'SINGLE');
    setFormTargetVal(param.defaultTargetValue !== undefined ? String(param.defaultTargetValue) : '');
    setFormTolerance(param.defaultTolerance !== undefined ? String(param.defaultTolerance) : '');
    setFormMinVal(param.defaultMinValue !== undefined ? String(param.defaultMinValue) : '');
    setFormMaxVal(param.defaultMaxValue !== undefined ? String(param.defaultMaxValue) : '');
    setFormRequired(param.defaultRequired !== undefined ? param.defaultRequired : true);
    setFormErrors({});
    setIsEditorOpen(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    const trimmedName = formName.trim();
    if (!trimmedName) {
      errors.name = 'Parameter Name is required.';
    } else {
      // Duplicate prevention in library
      const isDuplicate = parameterLibrary.some((p) => {
        if (editingParam && p.id === editingParam.id) return false;
        return p.name.trim().toLowerCase() === trimmedName.toLowerCase();
      });
      if (isDuplicate) {
        errors.name = `A parameter named '${trimmedName}' already exists in the library.`;
      }
    }

    const trimmedUnit = formUnit.trim();
    if (!trimmedUnit) {
      errors.unit = 'Unit is required.';
    }

    if (formSpecType === 'TARGET_TOLERANCE') {
      if (formTargetVal === '' || isNaN(parseFloat(formTargetVal))) {
        errors.targetVal = 'Target value is required.';
      }
      if (formTolerance === '' || isNaN(parseFloat(formTolerance))) {
        errors.tolerance = 'Tolerance value is required.';
      }
    } else if (formSpecType === 'MIN_MAX') {
      const minNum = parseFloat(formMinVal);
      const maxNum = parseFloat(formMaxVal);
      if (formMinVal === '' || isNaN(minNum)) errors.minVal = 'Min value is required.';
      if (formMaxVal === '' || isNaN(maxNum)) errors.maxVal = 'Max value is required.';
      if (formMinVal !== '' && formMaxVal !== '' && minNum > maxNum) {
        errors.maxVal = 'Max value must be greater than or equal to Min value.';
      }
    } else if (formSpecType === 'MINIMUM') {
      if (formMinVal === '' || isNaN(parseFloat(formMinVal))) errors.minVal = 'Min value is required.';
    } else if (formSpecType === 'MAXIMUM') {
      if (formMaxVal === '' || isNaN(parseFloat(formMaxVal))) errors.maxVal = 'Max value is required.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    let defaultSpec = formSpecText.trim();
    if (!defaultSpec) {
      if (formSpecType === 'TARGET_TOLERANCE' && formTargetVal && formTolerance) {
        defaultSpec = `${formTargetVal} ± ${formTolerance} ${trimmedUnit}`;
      } else if (formSpecType === 'MIN_MAX' && formMinVal && formMaxVal) {
        defaultSpec = `${formMinVal} ~ ${formMaxVal} ${trimmedUnit}`;
      } else if (formSpecType === 'MINIMUM' && formMinVal) {
        defaultSpec = `Min. ${formMinVal} ${trimmedUnit}`;
      } else if (formSpecType === 'MAXIMUM' && formMaxVal) {
        defaultSpec = `Max. ${formMaxVal} ${trimmedUnit}`;
      }
    }

    const saved = saveLibraryParameter({
      id: editingParam ? editingParam.id : undefined,
      parameterCode: editingParam ? editingParam.parameterCode : undefined,
      name: trimmedName,
      category: formCategory,
      description: formDesc.trim() || undefined,
      defaultUnit: trimmedUnit,
      defaultSpecType: formSpecType,
      defaultSpecText: defaultSpec || undefined,
      defaultBankConfig: formBankConfig,
      defaultTargetValue: formTargetVal !== '' ? parseFloat(formTargetVal) : undefined,
      defaultTolerance: formTolerance !== '' ? parseFloat(formTolerance) : undefined,
      defaultMinValue: formMinVal !== '' ? parseFloat(formMinVal) : undefined,
      defaultMaxValue: formMaxVal !== '' ? parseFloat(formMaxVal) : undefined,
      defaultRequired: formRequired,
      status: 'ACTIVE',
    });

    setIsEditorOpen(false);
    triggerToast(
      editingParam
        ? `Library Parameter ${saved.parameterCode} updated.`
        : `Created new Library Parameter ${saved.parameterCode}.`
    );
  };

  const handleConfirmDelete = () => {
    if (!paramToDelete) return;
    const result = deleteLibraryParameter(paramToDelete.id);
    if (!result.success) {
      setDeleteError(result.message || 'Failed to delete parameter.');
    } else {
      setParamToDelete(null);
      setDeleteError(null);
      triggerToast(`Parameter ${paramToDelete.name} deleted from library.`);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wide uppercase">
                  Parameter Library Master Data
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {parameterLibrary.length} Active Master Parameters
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Central catalog of reusable dyno test parameters with standardized engineering units, categories, and tolerances.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-xs transition-all"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>+ Add Master Parameter</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between animate-in fade-in">
            <span>{toast}</span>
            <button onClick={() => setToast(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code (PARAM-XXXX), parameter name, unit, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 shadow-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <button
              type="button"
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all ${
                categoryFilter === 'ALL'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              All ({parameterLibrary.length})
            </button>
            {CATEGORY_LIST.map((cat) => {
              const count = parameterLibrary.filter((p) => p.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategoryFilter(cat.key)}
                  className={`px-2.5 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1 transition-all ${
                    categoryFilter === cat.key
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span className="text-[10px] font-mono opacity-80">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Master Parameters Table */}
        <div className="overflow-y-auto flex-1 p-4">
          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-2.5 px-3 w-28">Parameter ID</th>
                  <th className="py-2.5 px-3">Name & Description</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Default Spec</th>
                  <th className="py-2.5 px-3">Unit</th>
                  <th className="py-2.5 px-3">Bank Config</th>
                  <th className="py-2.5 px-3 text-center">Product Usage</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredList.map((param) => {
                  const usageCount = getParameterUsageCount(param.parameterCode, param.name);

                  return (
                    <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3">
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                          {param.parameterCode}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-900 block text-xs">{param.name}</span>
                        {param.description && (
                          <span className="text-[11px] text-slate-400 block truncate max-w-sm">
                            {param.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {param.category || 'GENERAL'}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 text-[11px]">
                        {param.defaultSpecText ||
                          (param.defaultTargetValue !== undefined
                            ? `${param.defaultTargetValue} ± ${param.defaultTolerance || 0} ${param.defaultUnit}`
                            : param.defaultMinValue !== undefined && param.defaultMaxValue !== undefined
                            ? `${param.defaultMinValue} ~ ${param.defaultMaxValue} ${param.defaultUnit}`
                            : param.defaultMinValue !== undefined
                            ? `Min. ${param.defaultMinValue} ${param.defaultUnit}`
                            : param.defaultMaxValue !== undefined
                            ? `Max. ${param.defaultMaxValue} ${param.defaultUnit}`
                            : '-')}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-600">{param.defaultUnit}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            param.defaultBankConfig === 'RH_LH'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {param.defaultBankConfig === 'RH_LH' ? 'RH + LH' : 'Single'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => setViewUsageParam(param)}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all ${
                            usageCount > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                          title="Click to view Product Masters using this parameter"
                        >
                          <span>{usageCount} Product{usageCount === 1 ? '' : 's'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(param)}
                            className="p-1.5 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold transition-all text-xs flex items-center gap-1"
                            title="Edit Master Parameter"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setParamToDelete(param);
                              setDeleteError(null);
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Master Parameter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-400 italic">
                      No parameters found matching "{searchTerm}".
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{filteredList.length}</strong> of{' '}
            <strong className="text-slate-800">{parameterLibrary.length}</strong> master parameters.
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg text-xs transition-all"
          >
            Done
          </button>
        </div>
      </div>

      {/* SUB-MODAL: CREATE / EDIT MASTER PARAMETER */}
      {isEditorOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-xs font-black flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>
                  {editingParam
                    ? `Edit Master Parameter (${editingParam.parameterCode})`
                    : 'Create New Master Parameter'}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Parameter Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Power, Torque, Exhaust Temperature, Fuel Pressure"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg font-bold text-slate-800 ${
                    formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {formErrors.name && <p className="text-rose-600 text-[11px] mt-1">{formErrors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as ParameterCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                  >
                    {CATEGORY_LIST.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Standard Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HP, kgm, °C, kg/cm²"
                    value={formUnit}
                    onChange={(e) => {
                      setFormUnit(e.target.value);
                      if (formErrors.unit) setFormErrors((prev) => ({ ...prev, unit: '' }));
                    }}
                    className={`w-full px-3 py-2 bg-white border rounded-lg font-bold ${
                      formErrors.unit ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  />
                  {formErrors.unit && <p className="text-rose-600 text-[11px] mt-1">{formErrors.unit}</p>}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Description / Testing Method
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rated engine output at governed full load speed"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Default Spec Rule</label>
                  <select
                    value={formSpecType}
                    onChange={(e) => {
                      setFormSpecType(e.target.value as SpecType);
                      setFormErrors({});
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="TARGET_TOLERANCE">Target ± Tolerance</option>
                    <option value="MIN_MAX">Min ~ Max Range</option>
                    <option value="MINIMUM">Minimum Only</option>
                    <option value="MAXIMUM">Maximum Only</option>
                    <option value="VISUAL_CHECK">Visual Check / Pass-Fail</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Bank Configuration</label>
                  <select
                    value={formBankConfig}
                    onChange={(e) => setFormBankConfig(e.target.value as BankConfig)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="SINGLE">Single Reading</option>
                    <option value="RH_LH">RH Bank + LH Bank (V-Type Engine)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Default Values based on SpecType */}
              {formSpecType === 'TARGET_TOLERANCE' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Default Target</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 1200"
                      value={formTargetVal}
                      onChange={(e) => setFormTargetVal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Default Tolerance (±)</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 40"
                      value={formTolerance}
                      onChange={(e) => setFormTolerance(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
              )}

              {formSpecType === 'MIN_MAX' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Default Minimum</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 3.0"
                      value={formMinVal}
                      onChange={(e) => setFormMinVal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Default Maximum</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 4.5"
                      value={formMaxVal}
                      onChange={(e) => setFormMaxVal(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                    />
                  </div>
                </div>
              )}

              {formSpecType === 'MINIMUM' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                  <label className="font-bold text-slate-700 block mb-1">Default Minimum Value</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 0.8"
                    value={formMinVal}
                    onChange={(e) => setFormMinVal(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              )}

              {formSpecType === 'MAXIMUM' && (
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200">
                  <label className="font-bold text-slate-700 block mb-1">Default Maximum Value</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 650"
                    value={formMaxVal}
                    onChange={(e) => setFormMaxVal(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Default Spec Label / Text (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if left empty"
                  value={formSpecText}
                  onChange={(e) => setFormSpecText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-bold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold rounded-lg flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>{editingParam ? 'Save Changes' : 'Create Parameter'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {paramToDelete && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Delete Master Parameter?</h4>
                <p className="text-xs text-slate-500">
                  {paramToDelete.parameterCode}: {paramToDelete.name}
                </p>
              </div>
            </div>

            {deleteError ? (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {deleteError}
              </div>
            ) : (
              <p className="text-xs text-slate-600">
                Are you sure you want to remove this parameter from the Master Library? This action is permanent.
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setParamToDelete(null);
                  setDeleteError(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg"
              >
                Cancel
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-xs"
                >
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW USAGE DETAILS MODAL */}
      {viewUsageParam && (
        <div className="fixed inset-0 z-70 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 border border-slate-200 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-900 border border-blue-200">
                  {viewUsageParam.parameterCode}
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-1">
                  Product Masters Using "{viewUsageParam.name}"
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setViewUsageParam(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
              {getParameterUsageProducts(viewUsageParam.parameterCode, viewUsageParam.name).map(
                (prod) => (
                  <div
                    key={prod.id}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 block">{prod.model}</span>
                      <span className="text-[11px] text-slate-500">{prod.productName}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Rev {prod.revision || 1}
                    </span>
                  </div>
                )
              )}

              {getParameterUsageProducts(viewUsageParam.parameterCode, viewUsageParam.name).length ===
                0 && (
                <p className="text-center py-4 text-slate-400 italic">
                  This parameter is currently not used by any Product Master.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setViewUsageParam(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

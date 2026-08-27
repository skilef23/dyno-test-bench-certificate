import React, { useState, useMemo } from 'react';
import {
  LibraryParameter,
  ProductTestParameter,
  ParameterCategory,
  BankConfig,
  SpecType,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  Search,
  SlidersHorizontal,
  CheckCircle2,
  Plus,
  Layers,
  Filter,
  Info,
  Check,
  X,
  Gauge,
  Thermometer,
  Zap,
  Droplets,
  Wind,
  Activity,
  Tag,
  FileCheck,
} from 'lucide-react';

interface ParameterLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectParameters: (selectedParams: LibraryParameter[]) => void;
  onOpenCreateNew?: () => void;
  alreadyAddedParamNames?: string[];
  existingParameterNames?: string[];
}

const CATEGORY_TABS: { key: 'ALL' | ParameterCategory; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'ALL', label: 'All Categories', icon: Layers },
  { key: 'PERFORMANCE', label: 'Performance', icon: Gauge },
  { key: 'PRESSURE', label: 'Pressure', icon: Wind },
  { key: 'TEMPERATURE', label: 'Temperature', icon: Thermometer },
  { key: 'ELECTRICAL', label: 'Electrical', icon: Zap },
  { key: 'FLOW_LEVEL', label: 'Flow & Level', icon: Droplets },
  { key: 'EMISSION_GAS', label: 'Emission & Gas', icon: Activity },
  { key: 'GENERAL', label: 'General / Other', icon: Tag },
];

export const ParameterLibraryModal: React.FC<ParameterLibraryModalProps> = ({
  isOpen,
  onClose,
  onSelectParameters,
  onOpenCreateNew,
  alreadyAddedParamNames,
  existingParameterNames,
}) => {
  const { parameterLibrary, getParameterUsageCount } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ParameterCategory>('ALL');
  const [selectedParamIds, setSelectedParamIds] = useState<string[]>([]);

  // Lowercase list of already added names for duplicate prevention
  const addedNamesLower = useMemo(() => {
    const rawList = alreadyAddedParamNames || existingParameterNames || [];
    return rawList.map((n) => (n ? n.trim().toLowerCase() : '')).filter(Boolean);
  }, [alreadyAddedParamNames, existingParameterNames]);

  // Filter library parameters
  const filteredParameters = useMemo(() => {
    return parameterLibrary.filter((param) => {
      const matchesSearch =
        param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        param.parameterCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (param.description && param.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        param.defaultUnit.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat = selectedCategory === 'ALL' || param.category === selectedCategory;
      return matchesSearch && matchesCat && param.status === 'ACTIVE';
    });
  }, [parameterLibrary, searchTerm, selectedCategory]);

  if (!isOpen) return null;

  const toggleSelect = (param: LibraryParameter) => {
    const isAlreadyInProduct = addedNamesLower.includes(param.name.trim().toLowerCase());
    if (isAlreadyInProduct) return; // Prevent selecting already added items

    setSelectedParamIds((prev) =>
      prev.includes(param.id) ? prev.filter((id) => id !== param.id) : [...prev, param.id]
    );
  };

  const handleSelectAllAvailable = () => {
    const available = filteredParameters
      .filter((p) => !addedNamesLower.includes(p.name.trim().toLowerCase()))
      .map((p) => p.id);

    // If all available are selected, deselect; otherwise select all
    const allSelected = available.every((id) => selectedParamIds.includes(id));
    if (allSelected) {
      setSelectedParamIds((prev) => prev.filter((id) => !available.includes(id)));
    } else {
      setSelectedParamIds((prev) => Array.from(new Set([...prev, ...available])));
    }
  };

  const handleConfirmImport = () => {
    const selectedObjects = parameterLibrary.filter((p) => selectedParamIds.includes(p.id));
    if (selectedObjects.length === 0) return;
    onSelectParameters(selectedObjects);
    onClose();
  };

  const getCategoryBadgeClass = (category?: ParameterCategory) => {
    switch (category) {
      case 'PERFORMANCE':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'PRESSURE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'TEMPERATURE':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'ELECTRICAL':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'FLOW_LEVEL':
        return 'bg-cyan-50 text-cyan-800 border-cyan-200';
      case 'EMISSION_GAS':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black tracking-wide uppercase">
                  Select Existing Dyno Parameters
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-800 text-blue-200 border border-blue-700">
                  Library Catalog
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Select standardized parameters from the Master Library to reuse in this Product Master.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search + Category Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search parameter by name, code (PARAM-XXXX), unit, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 shadow-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Action: Create New If Not Found */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateNew?.();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-blue-900 border border-blue-300 text-xs font-bold rounded-lg shadow-xs transition-all whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-blue-700" />
              <span>Create New Parameter Instead</span>
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = selectedCategory === tab.key;
              const count =
                tab.key === 'ALL'
                  ? parameterLibrary.filter((p) => p.status === 'ACTIVE').length
                  : parameterLibrary.filter((p) => p.category === tab.key && p.status === 'ACTIVE').length;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setSelectedCategory(tab.key)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive ? 'bg-blue-800 text-blue-100' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection Status Banner */}
        <div className="px-6 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <span className="font-bold text-blue-950">
              {filteredParameters.length} parameters found
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-blue-900 font-bold">
              {selectedParamIds.length} selected for import
            </span>
          </div>

          <button
            type="button"
            onClick={handleSelectAllAvailable}
            className="text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline"
          >
            {filteredParameters.filter((p) => !addedNamesLower.includes(p.name.trim().toLowerCase()))
              .length ===
            selectedParamIds.filter((id) =>
              filteredParameters.some((fp) => fp.id === id)
            ).length
              ? 'Deselect All'
              : 'Select All Available'}
          </button>
        </div>

        {/* Parameter List */}
        <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-2">
          {filteredParameters.map((param) => {
            const isSelected = selectedParamIds.includes(param.id);
            const isAlreadyAdded = addedNamesLower.includes(param.name.trim().toLowerCase());
            const usageCount = getParameterUsageCount(param.parameterCode, param.name);

            return (
              <div
                key={param.id}
                onClick={() => toggleSelect(param)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-4 ${
                  isAlreadyAdded
                    ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                    : isSelected
                    ? 'bg-blue-50/80 border-blue-400 shadow-xs ring-1 ring-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                {/* Left checkbox & details */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Custom Checkbox */}
                  <div className="pt-0.5 shrink-0">
                    {isAlreadyAdded ? (
                      <div className="w-5 h-5 rounded bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-500" title="Already added to this product">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-blue-900 border-blue-900 text-white'
                            : 'bg-white border-slate-300 hover:border-blue-500'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    )}
                  </div>

                  {/* Parameter Info */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {param.parameterCode}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">
                        {param.name}
                      </h4>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getCategoryBadgeClass(
                          param.category
                        )}`}
                      >
                        {param.category || 'GENERAL'}
                      </span>
                      {isAlreadyAdded && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Already Added
                        </span>
                      )}
                    </div>

                    {param.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">
                        {param.description}
                      </p>
                    )}

                    {/* Spec Summary */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-0.5">
                      <span>
                        Default Spec:{' '}
                        <strong className="text-slate-800 font-mono font-semibold">
                          {param.defaultSpecText ||
                            (param.defaultTargetValue !== undefined
                              ? `${param.defaultTargetValue} ± ${param.defaultTolerance || 0} ${param.defaultUnit}`
                              : param.defaultMinValue !== undefined && param.defaultMaxValue !== undefined
                              ? `${param.defaultMinValue} ~ ${param.defaultMaxValue} ${param.defaultUnit}`
                              : param.defaultMinValue !== undefined
                              ? `Min. ${param.defaultMinValue} ${param.defaultUnit}`
                              : param.defaultMaxValue !== undefined
                              ? `Max. ${param.defaultMaxValue} ${param.defaultUnit}`
                              : 'Visual')}
                        </strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Unit: <strong className="text-slate-800">{param.defaultUnit}</strong>
                      </span>
                      <span className="text-slate-300">•</span>
                      <span>
                        Bank: <strong className="text-slate-800">{param.defaultBankConfig === 'RH_LH' ? 'RH + LH' : 'Single'}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right stats */}
                <div className="shrink-0 text-right space-y-1">
                  <span className="text-[10px] font-medium text-slate-400 block">
                    Used in {usageCount} product{usageCount === 1 ? '' : 's'}
                  </span>
                  <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                    {param.defaultSpecType.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}

          {filteredParameters.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <SlidersHorizontal className="w-6 h-6" />
              </div>
              <h4 className="text-xs font-bold text-slate-700">
                No matching parameters found in library
              </h4>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                You can adjust your search terms or create a brand new parameter to automatically save it in the library.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateNew?.();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-xs transition-all mt-2"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Create New Parameter</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {selectedParamIds.length > 0 ? (
              <span className="text-blue-900 font-bold">
                Ready to import {selectedParamIds.length} parameter{selectedParamIds.length === 1 ? '' : 's'}. You can fine-tune specs on the next screen.
              </span>
            ) : (
              <span>Select one or more parameters to add to this Product Master.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-white transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedParamIds.length === 0}
              onClick={handleConfirmImport}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-900 hover:bg-blue-800 disabled:opacity-40 disabled:hover:bg-blue-900 text-white font-bold text-xs rounded-lg shadow-xs transition-all"
            >
              <Check className="w-4 h-4 text-amber-400" />
              <span>Import Selected ({selectedParamIds.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

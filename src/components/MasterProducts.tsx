import React, { useState, useEffect } from 'react';
import {
  Product,
  ProductTestParameter,
  SpecType,
  BankConfig,
  LibraryParameter,
  ParameterCategory,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  Box,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Layers,
  ArrowUp,
  ArrowDown,
  Info,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Sparkles,
  History,
  Check,
  AlertCircle,
  AlertTriangle,
  FileSpreadsheet,
  X,
  BookOpen,
  Library,
  ListPlus,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { formatSpecificationDisplay } from '../utils/evaluation';
import { ParameterLibraryModal } from './ParameterLibraryModal';
import { ManageParameterLibraryModal } from './ManageParameterLibraryModal';

export const MasterProducts: React.FC = () => {
  const {
    products,
    saveProduct,
    deleteProduct,
    testRecords,
    currentUser,
    parameterLibrary,
    saveLibraryParameter,
    findLibraryParameterByName,
  } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Modal states for Product
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

  // Parameter Library Modals
  const [isLibrarySelectModalOpen, setIsLibrarySelectModalOpen] = useState(false);
  const [isManageLibraryModalOpen, setIsManageLibraryModalOpen] = useState(false);
  const [isAddParamMenuOpen, setIsAddParamMenuOpen] = useState(false);

  // Form states for Product
  const [productType, setProductType] = useState('ENGINE ASSY');
  const [productName, setProductName] = useState('');
  const [model, setModel] = useState('');
  const [componentPartNumber, setComponentPartNumber] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [bumpRevisionOnSave, setBumpRevisionOnSave] = useState(false);
  const [ratedPowerRpm, setRatedPowerRpm] = useState<string>('1900');
  const [ratedTorqueRpm, setRatedTorqueRpm] = useState<string>('1350');

  // Integrated Dyno Test Parameters in the Product Master Form
  const [formParameters, setFormParameters] = useState<ProductTestParameter[]>([]);

  // Sub-modal state for adding/editing a single parameter
  const [isParamModalOpen, setIsParamModalOpen] = useState(false);
  const [editingParamIndex, setEditingParamIndex] = useState<number | null>(null);

  // Single parameter form fields
  const [paramName, setParamName] = useState('');
  const [paramCategory, setParamCategory] = useState<ParameterCategory>('PERFORMANCE');
  const [paramDesc, setParamDesc] = useState('');
  const [paramSpecType, setParamSpecType] = useState<SpecType>('TARGET_TOLERANCE');
  const [paramSpecText, setParamSpecText] = useState('');
  const [paramUnit, setParamUnit] = useState('HP');
  const [paramBankConfig, setParamBankConfig] = useState<BankConfig>('SINGLE');
  const [paramMinVal, setParamMinVal] = useState<string>('');
  const [paramMaxVal, setParamMaxVal] = useState<string>('');
  const [paramTargetVal, setParamTargetVal] = useState<string>('');
  const [paramTolerance, setParamTolerance] = useState<string>('');
  const [paramRequired, setParamRequired] = useState(true);
  const [paramSaveToLibrary, setParamSaveToLibrary] = useState(true);
  const [paramParameterId, setParamParameterId] = useState<string | undefined>(undefined);
  const [paramSourceType, setParamSourceType] = useState<'LIBRARY' | 'CUSTOM'>('LIBRARY');

  // Snapshot for detecting dirty changes in parameter modal
  const [initialParamSnapshot, setInitialParamSnapshot] = useState<{
    name: string;
    description: string;
    specType: SpecType;
    specText: string;
    unit: string;
    bankConfig: BankConfig;
    minVal: string;
    maxVal: string;
    targetVal: string;
    tolerance: string;
    required: boolean;
  } | null>(null);

  // Validation errors for parameter modal
  const [paramValidationErrors, setParamValidationErrors] = useState<{
    name?: string;
    specType?: string;
    unit?: string;
    minValue?: string;
    maxValue?: string;
    targetValue?: string;
    tolerance?: string;
  }>({});

  // Confirmation dialog states
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [paramToDeleteIndex, setParamToDeleteIndex] = useState<number | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState<{
    payload: Partial<Product>;
    currentRev: number;
    nextRev: number;
  } | null>(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.componentPartNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.machineModel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || p.productType === filterType;
    return matchesSearch && matchesType;
  });

  const productTypes = Array.from(new Set(products.map((p) => p.productType)));

  // Check if parameter form has unsaved modifications
  const checkIsParamDirty = (): boolean => {
    if (!initialParamSnapshot) return false;
    return (
      paramName !== initialParamSnapshot.name ||
      paramDesc !== initialParamSnapshot.description ||
      paramSpecType !== initialParamSnapshot.specType ||
      paramSpecText !== initialParamSnapshot.specText ||
      paramUnit !== initialParamSnapshot.unit ||
      paramBankConfig !== initialParamSnapshot.bankConfig ||
      paramMinVal !== initialParamSnapshot.minVal ||
      paramMaxVal !== initialParamSnapshot.maxVal ||
      paramTargetVal !== initialParamSnapshot.targetVal ||
      paramTolerance !== initialParamSnapshot.tolerance ||
      paramRequired !== initialParamSnapshot.required
    );
  };

  // Close parameter modal safely (with unsaved changes check)
  const handleAttemptCloseParamModal = () => {
    if (checkIsParamDirty()) {
      setShowDiscardConfirm(true);
    } else {
      closeParamModalDirectly();
    }
  };

  const closeParamModalDirectly = () => {
    setIsParamModalOpen(false);
    setEditingParamIndex(null);
    setInitialParamSnapshot(null);
    setParamValidationErrors({});
    setShowDiscardConfirm(false);
  };

  // Global ESC Key Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
        } else if (isParamModalOpen) {
          handleAttemptCloseParamModal();
        } else if (paramToDeleteIndex !== null) {
          setParamToDeleteIndex(null);
        } else if (revisionPrompt !== null) {
          setRevisionPrompt(null);
        } else if (viewingProduct !== null) {
          setViewingProduct(null);
        } else if (isFormOpen && !isParamModalOpen) {
          setIsFormOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showDiscardConfirm,
    isParamModalOpen,
    paramToDeleteIndex,
    revisionPrompt,
    viewingProduct,
    isFormOpen,
    paramName,
    paramDesc,
    paramSpecType,
    paramSpecText,
    paramUnit,
    paramBankConfig,
    paramMinVal,
    paramMaxVal,
    paramTargetVal,
    paramTolerance,
    paramRequired,
    initialParamSnapshot,
  ]);

  // Open Create Product Modal
  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setProductType('ENGINE ASSY');
    setProductName('KOMATSU DIESEL ENGINE');
    setModel('');
    setComponentPartNumber('');
    setMachineModel('');
    setDescription('');
    setStatus('ACTIVE');
    setBumpRevisionOnSave(false);
    setRatedPowerRpm('1900');
    setRatedTorqueRpm('1350');
    setFormParameters([]);
    setIsFormOpen(true);
  };

  // Open Edit Product Modal
  const handleEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProductType(prod.productType);
    setProductName(prod.productName);
    setModel(prod.model);
    setComponentPartNumber(prod.componentPartNumber);
    setMachineModel(prod.machineModel);
    setDescription(prod.description || '');
    setStatus(prod.status);
    setBumpRevisionOnSave(false);
    setRatedPowerRpm(prod.ratedPowerRpm !== undefined ? String(prod.ratedPowerRpm) : '1900');
    setRatedTorqueRpm(prod.ratedTorqueRpm !== undefined ? String(prod.ratedTorqueRpm) : '1350');
    setFormParameters(prod.parameters || []);
    setIsFormOpen(true);
  };

  // Parameter sub-modal: Open ADD NEW Parameter
  const handleOpenAddParam = () => {
    setEditingParamIndex(null);
    setParamName('');
    setParamCategory('PERFORMANCE');
    setParamDesc('');
    setParamSpecType('TARGET_TOLERANCE');
    setParamSpecText('');
    setParamUnit('HP');
    setParamBankConfig('SINGLE');
    setParamMinVal('');
    setParamMaxVal('');
    setParamTargetVal('');
    setParamTolerance('');
    setParamRequired(true);
    setParamSaveToLibrary(true);
    setParamParameterId(undefined);
    setParamSourceType('LIBRARY');
    setParamValidationErrors({});

    setInitialParamSnapshot({
      name: '',
      description: '',
      specType: 'TARGET_TOLERANCE',
      specText: '',
      unit: 'HP',
      bankConfig: 'SINGLE',
      minVal: '',
      maxVal: '',
      targetVal: '',
      tolerance: '',
      required: true,
    });

    setIsParamModalOpen(true);
  };

  // Parameter sub-modal: Open EDIT EXISTING Parameter
  const handleOpenEditParam = (index: number) => {
    const param = formParameters[index];
    setEditingParamIndex(index);
    setParamName(param.name);
    setParamCategory(param.category || 'PERFORMANCE');
    setParamDesc(param.description || '');
    setParamSpecType(param.specType);
    setParamSpecText(param.specText);
    setParamUnit(param.unit);
    setParamBankConfig(param.bankConfig);
    setParamParameterId(param.parameterId);
    setParamSourceType(param.sourceType || (param.parameterId ? 'LIBRARY' : 'CUSTOM'));
    setParamSaveToLibrary(true);

    const minValStr = param.minValue !== undefined ? String(param.minValue) : '';
    const maxValStr = param.maxValue !== undefined ? String(param.maxValue) : '';
    const targetValStr = param.targetValue !== undefined ? String(param.targetValue) : '';
    const tolStr = param.tolerance !== undefined ? String(param.tolerance) : '';

    setParamMinVal(minValStr);
    setParamMaxVal(maxValStr);
    setParamTargetVal(targetValStr);
    setParamTolerance(tolStr);
    setParamRequired(param.required);
    setParamValidationErrors({});

    setInitialParamSnapshot({
      name: param.name,
      description: param.description || '',
      specType: param.specType,
      specText: param.specText,
      unit: param.unit,
      bankConfig: param.bankConfig,
      minVal: minValStr,
      maxVal: maxValStr,
      targetVal: targetValStr,
      tolerance: tolStr,
      required: param.required,
    });

    setIsParamModalOpen(true);
  };

  // Import Selected Parameters from Parameter Library
  const handleSelectParametersFromLibrary = (selectedList: LibraryParameter[]) => {
    if (!selectedList || selectedList.length === 0) return;

    const existingNamesLower = formParameters.map((p) => p.name.trim().toLowerCase());
    const newItems: ProductTestParameter[] = [];

    selectedList.forEach((libParam, index) => {
      // Check if already in the product
      if (existingNamesLower.includes(libParam.name.trim().toLowerCase())) {
        return;
      }

      // Generate default spec text if missing
      let specText = libParam.defaultSpecText;
      if (!specText) {
        if (
          libParam.defaultSpecType === 'TARGET_TOLERANCE' &&
          libParam.defaultTargetValue !== undefined
        ) {
          specText = `${libParam.defaultTargetValue} ± ${
            libParam.defaultTolerance || 0
          } ${libParam.defaultUnit}`;
        } else if (
          libParam.defaultSpecType === 'MIN_MAX' &&
          libParam.defaultMinValue !== undefined &&
          libParam.defaultMaxValue !== undefined
        ) {
          specText = `${libParam.defaultMinValue} ~ ${libParam.defaultMaxValue} ${libParam.defaultUnit}`;
        } else if (
          libParam.defaultSpecType === 'MINIMUM' &&
          libParam.defaultMinValue !== undefined
        ) {
          specText = `Min. ${libParam.defaultMinValue} ${libParam.defaultUnit}`;
        } else if (
          libParam.defaultSpecType === 'MAXIMUM' &&
          libParam.defaultMaxValue !== undefined
        ) {
          specText = `Max. ${libParam.defaultMaxValue} ${libParam.defaultUnit}`;
        } else {
          specText = 'Visual / Function Inspection';
        }
      }

      const newParam: ProductTestParameter = {
        id: `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        parameterId: libParam.parameterCode,
        sourceType: 'LIBRARY',
        category: libParam.category,
        order: formParameters.length + newItems.length + 1,
        name: libParam.name,
        description: libParam.description,
        specType: libParam.defaultSpecType,
        specText: specText || '',
        unit: libParam.defaultUnit,
        bankConfig: libParam.defaultBankConfig,
        minValue: libParam.defaultMinValue,
        maxValue: libParam.defaultMaxValue,
        targetValue: libParam.defaultTargetValue,
        tolerance: libParam.defaultTolerance,
        required: libParam.defaultRequired !== undefined ? libParam.defaultRequired : true,
        status: 'ACTIVE',
      };

      newItems.push(newParam);
    });

    if (newItems.length > 0) {
      setFormParameters((prev) => [...prev, ...newItems]);
      showToast(
        `Imported ${newItems.length} parameter${
          newItems.length === 1 ? '' : 's'
        } from Master Library.`
      );
    } else {
      showToast('All selected parameters are already present in this product.', 'info');
    }
  };

  // Save/Update Single Parameter with Full Validation & Library Sync
  const handleSaveParam = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: {
      name?: string;
      specType?: string;
      unit?: string;
      minValue?: string;
      maxValue?: string;
      targetValue?: string;
      tolerance?: string;
    } = {};

    // 1. Validate Parameter Name
    const trimmedName = paramName.trim();
    if (!trimmedName) {
      errors.name = 'Parameter Name is required.';
    } else {
      // Duplicate prevention: check against other parameters in the same product
      const isDuplicate = formParameters.some((p, idx) => {
        if (editingParamIndex !== null && idx === editingParamIndex) return false;
        return p.name.trim().toLowerCase() === trimmedName.toLowerCase();
      });

      if (isDuplicate) {
        errors.name = `Parameter '${trimmedName}' already exists in this Product Master.`;
      }
    }

    // 2. Validate Unit
    const trimmedUnit = paramUnit.trim();
    if (!trimmedUnit) {
      errors.unit = 'Unit is required (e.g. HP, kgm, °C, kg/cm²).';
    }

    // 3. Validate based on Specification Type
    if (paramSpecType === 'TARGET_TOLERANCE') {
      if (paramTargetVal === '' || isNaN(parseFloat(paramTargetVal))) {
        errors.targetValue = 'Target Value is required for Target ± Tolerance.';
      }
      if (paramTolerance === '' || isNaN(parseFloat(paramTolerance))) {
        errors.tolerance = 'Tolerance (±) is required.';
      }
    } else if (paramSpecType === 'MIN_MAX') {
      const minNum = parseFloat(paramMinVal);
      const maxNum = parseFloat(paramMaxVal);
      if (paramMinVal === '' || isNaN(minNum)) {
        errors.minValue = 'Minimum Value is required for Min ~ Max Range.';
      }
      if (paramMaxVal === '' || isNaN(maxNum)) {
        errors.maxValue = 'Maximum Value is required for Min ~ Max Range.';
      }
      if (paramMinVal !== '' && paramMaxVal !== '' && !isNaN(minNum) && !isNaN(maxNum) && minNum > maxNum) {
        errors.maxValue = 'Maximum Value must be greater than or equal to Minimum Value.';
      }
    } else if (paramSpecType === 'MINIMUM') {
      if (paramMinVal === '' || isNaN(parseFloat(paramMinVal))) {
        errors.minValue = 'Minimum Value is required for Minimum rule.';
      }
    } else if (paramSpecType === 'MAXIMUM') {
      if (paramMaxVal === '' || isNaN(parseFloat(paramMaxVal))) {
        errors.maxValue = 'Maximum Value is required for Maximum rule.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setParamValidationErrors(errors);
      return;
    }

    // Auto generate spec text if empty
    let specText = paramSpecText.trim();
    if (!specText) {
      if (paramSpecType === 'TARGET_TOLERANCE' && paramTargetVal && paramTolerance) {
        specText = `${paramTargetVal} ± ${paramTolerance} ${trimmedUnit}`;
      } else if (paramSpecType === 'MIN_MAX' && paramMinVal && paramMaxVal) {
        specText = `${paramMinVal} ~ ${paramMaxVal} ${trimmedUnit}`;
      } else if (paramSpecType === 'MINIMUM' && paramMinVal) {
        specText = `Min. ${paramMinVal} ${trimmedUnit}`;
      } else if (paramSpecType === 'MAXIMUM' && paramMaxVal) {
        specText = `Max. ${paramMaxVal} ${trimmedUnit}`;
      } else {
        specText = 'Visual / Function Inspection';
      }
    }

    // Library Synchronization: If save to library is true, register or update library
    let finalParamId = paramParameterId;
    let finalSourceType: 'LIBRARY' | 'CUSTOM' = paramSourceType;

    if (paramSaveToLibrary) {
      const savedLib = saveLibraryParameter({
        parameterCode: paramParameterId,
        name: trimmedName,
        category: paramCategory,
        description: paramDesc.trim() || undefined,
        defaultUnit: trimmedUnit,
        defaultSpecType: paramSpecType,
        defaultSpecText: specText,
        defaultBankConfig: paramBankConfig,
        defaultTargetValue: paramTargetVal !== '' ? parseFloat(paramTargetVal) : undefined,
        defaultTolerance: paramTolerance !== '' ? parseFloat(paramTolerance) : undefined,
        defaultMinValue: paramMinVal !== '' ? parseFloat(paramMinVal) : undefined,
        defaultMaxValue: paramMaxVal !== '' ? parseFloat(paramMaxVal) : undefined,
        defaultRequired: paramRequired,
        status: 'ACTIVE',
      });
      finalParamId = savedLib.parameterCode;
      finalSourceType = 'LIBRARY';
    } else if (!finalParamId) {
      // If matches existing library item by name, link it
      const match = findLibraryParameterByName(trimmedName);
      if (match) {
        finalParamId = match.parameterCode;
        finalSourceType = 'LIBRARY';
      } else {
        finalSourceType = 'CUSTOM';
      }
    }

    const newParam: ProductTestParameter = {
      id:
        editingParamIndex !== null
          ? formParameters[editingParamIndex].id
          : `param-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      parameterId: finalParamId,
      sourceType: finalSourceType,
      category: paramCategory,
      order:
        editingParamIndex !== null
          ? formParameters[editingParamIndex].order
          : formParameters.length + 1,
      name: trimmedName,
      description: paramDesc.trim() || undefined,
      specType: paramSpecType,
      specText,
      unit: trimmedUnit,
      bankConfig: paramBankConfig,
      minValue: paramMinVal !== '' ? parseFloat(paramMinVal) : undefined,
      maxValue: paramMaxVal !== '' ? parseFloat(paramMaxVal) : undefined,
      targetValue: paramTargetVal !== '' ? parseFloat(paramTargetVal) : undefined,
      tolerance: paramTolerance !== '' ? parseFloat(paramTolerance) : undefined,
      required: paramRequired,
      status: 'ACTIVE',
    };

    if (editingParamIndex !== null) {
      const updated = [...formParameters];
      updated[editingParamIndex] = newParam;
      setFormParameters(updated);
      showToast('Parameter updated successfully.');
    } else {
      setFormParameters([...formParameters, newParam]);
      showToast('Parameter added to product.');
    }

    closeParamModalDirectly();
  };

  // Remove parameter action
  const confirmDeleteParam = () => {
    if (paramToDeleteIndex === null) return;
    const paramNameDeleted = formParameters[paramToDeleteIndex]?.name || 'Parameter';
    const filtered = formParameters.filter((_, idx) => idx !== paramToDeleteIndex);
    const reindexed = filtered.map((p, idx) => ({ ...p, order: idx + 1 }));
    setFormParameters(reindexed);
    setParamToDeleteIndex(null);
    showToast(`Removed parameter "${paramNameDeleted}".`);
  };

  // Re-order parameters up/down
  const handleMoveParam = (index: number, direction: 'UP' | 'DOWN') => {
    if (
      (direction === 'UP' && index === 0) ||
      (direction === 'DOWN' && index === formParameters.length - 1)
    ) {
      return;
    }
    const targetIdx = direction === 'UP' ? index - 1 : index + 1;
    const items = [...formParameters];
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;

    // Update order values
    const reindexed = items.map((p, idx) => ({ ...p, order: idx + 1 }));
    setFormParameters(reindexed);
  };

  // Save the entire Product Master (Product Info + Parameters + Revision Protection)
  const handleSaveProductMaster = (e: React.FormEvent) => {
    e.preventDefault();

    if (!model.trim() || !productName.trim() || !componentPartNumber.trim()) {
      alert('Please fill in Model, Product Name, and Component Part Number.');
      return;
    }

    if (formParameters.length === 0) {
      if (!confirm('This product currently has 0 Dyno Test Parameters. Are you sure you want to save?')) {
        return;
      }
    }

    const payload: Partial<Product> = {
      id: editingProduct?.id,
      productType,
      productName: productName.trim(),
      model: model.trim(),
      componentPartNumber: componentPartNumber.trim(),
      machineModel: machineModel.trim(),
      description: description.trim() || undefined,
      status,
      ratedPowerRpm: ratedPowerRpm ? parseInt(ratedPowerRpm, 10) : undefined,
      ratedTorqueRpm: ratedTorqueRpm ? parseInt(ratedTorqueRpm, 10) : undefined,
      parameters: formParameters.map((p, idx) => ({ ...p, order: idx + 1 })),
    };

    // Revision Control Logic:
    // Check if editing an existing product that has already been used in an APPROVED test for the current revision
    if (editingProduct && !bumpRevisionOnSave) {
      const currentRev = editingProduct.revision || 1;
      const hasHistoricalApprovedTests = testRecords.some(
        (r) =>
          (r.productId === editingProduct.id ||
            r.typeModel.trim().toLowerCase() === editingProduct.model.trim().toLowerCase()) &&
          r.workflowStatus === 'APPROVED' &&
          (r.productRevision === currentRev || !r.productRevision)
      );

      if (hasHistoricalApprovedTests) {
        // CASE B: Historical approved test records exist for current revision -> Show revision prompt
        setRevisionPrompt({
          payload,
          currentRev,
          nextRev: currentRev + 1,
        });
        return;
      }
    }

    // CASE A: No approved historical tests exist for current revision, or bumpRevisionOnSave is already true, or new product
    saveProduct(payload, bumpRevisionOnSave);
    setIsFormOpen(false);
    showToast(
      editingProduct
        ? bumpRevisionOnSave
          ? `Product Master updated to Rev ${(editingProduct.revision || 1) + 1}.`
          : `Product Master updated (Rev ${editingProduct.revision || 1}).`
        : 'Product Master created successfully.'
    );
  };

  // Execute revision bump from protection prompt
  const handleConfirmRevisionBump = () => {
    if (!revisionPrompt) return;
    saveProduct(revisionPrompt.payload, true);
    setRevisionPrompt(null);
    setIsFormOpen(false);
    showToast(`Product Master saved as Rev ${revisionPrompt.nextRev}. Historical tests preserved.`);
  };

  // Execute direct save keeping current revision from protection prompt
  const handleDirectSaveCurrentRev = () => {
    if (!revisionPrompt) return;
    saveProduct(revisionPrompt.payload, false);
    setRevisionPrompt(null);
    setIsFormOpen(false);
    showToast(`Product Master saved directly under Rev ${revisionPrompt.currentRev}.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-80 max-w-md animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl border flex items-center gap-3 ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500/50'
                : toastMessage.type === 'error'
                ? 'bg-rose-950 text-rose-100 border-rose-700'
                : 'bg-slate-900 text-white border-blue-500/50'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            ) : (
              <Info className="w-5 h-5 text-blue-400 shrink-0" />
            )}
            <span className="text-xs font-bold">{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase tracking-wider bg-blue-900 text-amber-400">
              Master Data
            </span>
            <span className="text-xs text-slate-500 font-semibold">
              Specification & Dyno Configuration
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Master Products</h1>
          <p className="text-sm text-slate-600">
            Manage Komatsu reman product specifications, tolerances, and dyno test parameters with revision control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsManageLibraryModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-all"
            title="Manage Company Parameter Library Master Data"
          >
            <BookOpen className="w-4 h-4 text-blue-900" />
            <span>Parameter Library Master</span>
          </button>
          <button
            type="button"
            onClick={handleAddNewProduct}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:shadow"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Model (e.g. SAA12V140E-3), Part Number, Machine, or Name..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
        >
          <option value="ALL">All Product Types ({products.length})</option>
          {productTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredProducts.map((prod) => (
          <div
            key={prod.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex flex-col overflow-hidden group"
          >
            {/* Card Header */}
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                    {prod.productType}
                  </span>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-blue-900 transition-colors">
                    {prod.model}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    Rev {prod.revision || 1}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      prod.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}
                  >
                    {prod.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-600 mt-1 line-clamp-1 font-medium">
                {prod.productName}
              </p>
            </div>

            {/* Card Body - Key specs */}
            <div className="p-5 flex-1 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Comp. Part No.</span>
                  <span className="font-mono font-bold text-slate-800">{prod.componentPartNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Machine Model</span>
                  <span className="font-bold text-slate-800">{prod.machineModel}</span>
                </div>
              </div>

              {prod.description && (
                <p className="text-[11px] text-slate-500 italic line-clamp-2 leading-relaxed">
                  {prod.description}
                </p>
              )}

              {/* Dyno Test Parameters Count & Preview */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-slate-700 flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-800" />
                    Dyno Test Parameters:
                  </span>
                  <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                    {prod.parameters?.length || 0} items
                  </span>
                </div>

                <div className="space-y-1">
                  {(prod.parameters || []).slice(0, 3).map((param) => (
                    <div
                      key={param.id}
                      className="flex items-center justify-between text-[11px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-100"
                    >
                      <span className="font-medium truncate max-w-[160px]">
                        {param.order}. {param.name}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500 truncate max-w-[130px]">
                        {param.specText}
                      </span>
                    </div>
                  ))}
                  {(prod.parameters?.length || 0) > 3 && (
                    <span className="text-[10px] text-slate-400 block text-right">
                      + {(prod.parameters?.length || 0) - 3} more parameters configured
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Actions */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setViewingProduct(prod)}
                className="text-xs font-semibold text-slate-600 hover:text-blue-900 flex items-center gap-1"
              >
                <span>View Details</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleEditProduct(prod)}
                  className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-950 border border-slate-200 hover:border-blue-300 rounded text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-700" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete Master Product "${prod.model}"?`)) {
                      deleteProduct(prod.id);
                      showToast(`Product "${prod.model}" deleted.`);
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                  title="Delete Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Box className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No Master Products Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Try adjusting your search filters or click "+ Add New Product" to create a new specification master.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT PRODUCT MASTER WITH INTEGRATED DYNO PARAMETERS */}
      {/* ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-800 rounded-lg">
                  <Box className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-black">
                    {editingProduct ? `Edit Product Master: ${editingProduct.model}` : 'New Master Product'}
                  </h2>
                  <p className="text-xs text-slate-300">
                    Configure Product Information and Dyno Test Parameters
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {editingProduct && (
                  <span className="px-2.5 py-1 rounded bg-slate-800 text-amber-400 text-xs font-mono font-bold border border-slate-700">
                    Current: Rev {editingProduct.revision || 1}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Close (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveProductMaster} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* SECTION 1: PRODUCT INFORMATION */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">
                      1
                    </span>
                    SECTION 1 – PRODUCT INFORMATION
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">Basic Unit Specifications</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Product Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={productType}
                      onChange={(e) => setProductType(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    >
                      <option value="ENGINE ASSY">ENGINE ASSY</option>
                      <option value="TORQUE CONVERTER ASSY">TORQUE CONVERTER ASSY</option>
                      <option value="TRANSMISSION ASSY">TRANSMISSION ASSY</option>
                      <option value="HYDRAULIC PUMP">HYDRAULIC PUMP</option>
                      <option value="FINAL DRIVE ASSY">FINAL DRIVE ASSY</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Type / Model <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SAA12V140E-3"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Component Part Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 6219-B0-0041"
                      value={componentPartNumber}
                      onChange={(e) => setComponentPartNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Product Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. KOMATSU DIESEL ENGINE"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Machine Model (Applicable Equipment)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HD785-7, PC2000-8"
                      value={machineModel}
                      onChange={(e) => setMachineModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Description / Application Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12-Cylinder V-Type Turbocharged Aftercooled Dump Truck Engine"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                    </select>
                  </div>

                  {/* DynPro Performance Test Calibration Target RPMs */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Rated Power RPM (Target RPM)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="500"
                        max="5000"
                        placeholder="e.g. 1900"
                        value={ratedPowerRpm}
                        onChange={(e) => setRatedPowerRpm(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 pr-12"
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-semibold text-slate-400">
                        RPM
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Target RPM for DynPro JIS power measurement
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      Rated Torque RPM (Target RPM)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="500"
                        max="5000"
                        placeholder="e.g. 1350"
                        value={ratedTorqueRpm}
                        onChange={(e) => setRatedTorqueRpm(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 pr-12"
                      />
                      <span className="absolute right-3 top-2 text-[11px] font-semibold text-slate-400">
                        RPM
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Target RPM for DynPro JIS torque measurement
                    </span>
                  </div>
                </div>

                {/* Revision Control Toggle for Edit mode */}
                {editingProduct && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <span className="text-xs font-bold text-amber-900 block">
                          Revision Control (Historical Integrity)
                        </span>
                        <span className="text-[11px] text-amber-800">
                          {bumpRevisionOnSave
                            ? `Will save as Rev ${(editingProduct.revision || 1) + 1}. Previous test records remain locked to Rev ${editingProduct.revision || 1}.`
                            : `Current: Rev ${editingProduct.revision || 1}. Toggle below to create a new revision.`}
                        </span>
                      </div>
                    </div>

                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bumpRevisionOnSave}
                        onChange={(e) => setBumpRevisionOnSave(e.target.checked)}
                        className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
                      />
                      <span className="ml-2 text-xs font-bold text-slate-700">
                        Bump to Rev {(editingProduct.revision || 1) + 1}
                      </span>
                    </label>
                  </div>
                )}
              </div>

              {/* SECTION 2: DYNO TEST PARAMETERS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">
                        2
                      </span>
                      SECTION 2 – DYNO TEST PARAMETERS ({formParameters.length} items)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure the exact parameters, order, tolerances, and bank rules required for this model.
                    </p>
                  </div>

                  {/* Add Parameter Button Dropdown & Library Action */}
                  <div className="flex items-center gap-2 relative">
                    <button
                      type="button"
                      onClick={() => setIsManageLibraryModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all"
                      title="Manage Library Parameters"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-900" />
                      <span>Library Master</span>
                    </button>

                    <div className="relative inline-block text-left">
                      <div className="inline-flex rounded-lg shadow-xs">
                        <button
                          type="button"
                          onClick={() => setIsLibrarySelectModalOpen(true)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-l-lg border-r border-blue-800 transition-all"
                          title="Select from Existing Parameter Library"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-400" />
                          <span>+ Add Parameter</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddParamMenuOpen((prev) => !prev)}
                          className="px-2 py-1.5 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-r-lg transition-all flex items-center justify-center"
                          title="Choose add method"
                        >
                          <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>

                      {/* Dropdown Menu */}
                      {isAddParamMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setIsAddParamMenuOpen(false)}
                          />
                          <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 text-left">
                            <div className="px-3 py-1.5 border-b border-slate-100">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Choose Add Method
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddParamMenuOpen(false);
                                setIsLibrarySelectModalOpen(true);
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/80 flex items-start gap-2.5 group transition-colors"
                            >
                              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                                <Library className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-900">
                                  Select Existing Parameter
                                </span>
                                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                                  Pick standard parameters from Master Library
                                </span>
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsAddParamMenuOpen(false);
                                handleOpenAddParam();
                              }}
                              className="w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 group transition-colors"
                            >
                              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <Plus className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">
                                  Create New Parameter
                                </span>
                                <span className="text-[10px] text-slate-500 block leading-tight mt-0.5">
                                  Define custom parameter & optionally save to library
                                </span>
                              </div>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Parameters Table */}
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="py-2.5 px-3 w-12 text-center">Order</th>
                        <th className="py-2.5 px-3 w-28">Param ID</th>
                        <th className="py-2.5 px-3">Parameter Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Specification</th>
                        <th className="py-2.5 px-3">Spec Type</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3">Bank Config</th>
                        <th className="py-2.5 px-3 text-center">Required</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {formParameters.map((param, idx) => (
                        <tr key={param.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                param.parameterId
                                  ? 'bg-blue-50 text-blue-900 border-blue-200'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                            >
                              {param.parameterId || 'CUSTOM'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">{param.name}</span>
                            {param.description && (
                              <span className="text-[10px] text-slate-400 block truncate max-w-xs">
                                {param.description}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                              {param.category || 'GENERAL'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {param.specText}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                              {param.specType.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-600">
                            {param.unit}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                                param.bankConfig === 'RH_LH'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {param.bankConfig === 'RH_LH' ? 'RH + LH' : 'Single'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {param.required ? (
                              <span className="text-emerald-600 font-bold">Yes</span>
                            ) : (
                              <span className="text-slate-400">Optional</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Move Up */}
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => handleMoveParam(idx, 'UP')}
                                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                                title="Move Up"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              {/* Move Down */}
                              <button
                                type="button"
                                disabled={idx === formParameters.length - 1}
                                onClick={() => handleMoveParam(idx, 'DOWN')}
                                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded hover:bg-slate-200 transition-colors"
                                title="Move Down"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit Parameter Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditParam(idx)}
                                className="inline-flex items-center gap-1 px-2 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold transition-all text-[11px]"
                                title="Edit Parameter"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>

                              {/* Delete Parameter Button */}
                              <button
                                type="button"
                                onClick={() => setParamToDeleteIndex(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                                title="Remove Parameter"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {formParameters.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400 italic">
                            No parameters added yet. Click "+ Add Parameter" above to select from Parameter Library or create new parameters for this product.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4 text-amber-400" />
                  <span>Save Product Master</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-MODAL: ADD / EDIT SINGLE PARAMETER */}
      {/* ========================================================================= */}
      {isParamModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] my-auto">
            {/* Sub-modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <h3 className="text-xs font-black flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>{editingParamIndex !== null ? 'Edit Parameter' : 'Add Parameter to Product'}</span>
              </h3>
              <button
                type="button"
                onClick={handleAttemptCloseParamModal}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                title="Close (ESC)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-modal Form Body */}
            <form onSubmit={handleSaveParam} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Linked Library Parameter Info Banner */}
              {paramParameterId && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Library className="w-4 h-4 text-blue-900 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-blue-900 block">
                        Linked to Master Library ({paramParameterId})
                      </span>
                      <span className="text-[10px] text-blue-700">
                        Changes to specification below apply to this product's dyno test criteria.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-black bg-blue-900 text-amber-400">
                    LIBRARY
                  </span>
                </div>
              )}

              {/* Parameter Name */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Parameter Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Power, Torque, Exhaust Temperature, Boost Pressure"
                  value={paramName}
                  onChange={(e) => {
                    setParamName(e.target.value);
                    if (paramValidationErrors.name) {
                      setParamValidationErrors((prev) => ({ ...prev, name: undefined }));
                    }
                  }}
                  className={`w-full px-3 py-2 bg-white border rounded-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                    paramValidationErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                  }`}
                />
                {paramValidationErrors.name && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{paramValidationErrors.name}</span>
                  </p>
                )}
              </div>

              {/* Category & Description */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Category <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paramCategory}
                    onChange={(e) => setParamCategory(e.target.value as ParameterCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  >
                    <option value="PERFORMANCE">Performance (Power, Torque, RPM)</option>
                    <option value="PRESSURE">Pressure (Oil, Boost, Fuel, Blowby)</option>
                    <option value="TEMPERATURE">Temperature (Exhaust, Water, Oil)</option>
                    <option value="ELECTRICAL">Electrical (Alternator, Battery)</option>
                    <option value="FLOW_RATE">Flow Rate (Fuel, Coolant)</option>
                    <option value="INSPECTION">Visual / Inspection / Noise</option>
                    <option value="OTHER">Other Parameters</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Description / Method
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rated engine output at governed speed"
                    value={paramDesc}
                    onChange={(e) => setParamDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  />
                </div>
              </div>

              {/* Specification Type & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Specification Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paramSpecType}
                    onChange={(e) => {
                      setParamSpecType(e.target.value as SpecType);
                      setParamValidationErrors({});
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  >
                    <option value="TARGET_TOLERANCE">Target ± Tolerance</option>
                    <option value="MIN_MAX">Min ~ Max Range</option>
                    <option value="MINIMUM">Minimum (Min. X)</option>
                    <option value="MAXIMUM">Maximum (Max. X)</option>
                    <option value="TEXT">Qualitative / Text</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Unit <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. HP, kgm, °C, mmHg, kg/cm², Volt"
                    value={paramUnit}
                    onChange={(e) => {
                      setParamUnit(e.target.value);
                      if (paramValidationErrors.unit) {
                        setParamValidationErrors((prev) => ({ ...prev, unit: undefined }));
                      }
                    }}
                    className={`w-full px-3 py-2 bg-white border rounded-lg font-mono focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 ${
                      paramValidationErrors.unit ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                  />
                  {paramValidationErrors.unit && (
                    <p className="text-[11px] text-rose-600 font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{paramValidationErrors.unit}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Numeric Limits according to Spec Type */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-700 block">
                  PASS / FAIL Evaluation Rule Values:
                </span>

                {paramSpecType === 'TARGET_TOLERANCE' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Target Value <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 1200"
                        value={paramTargetVal}
                        onChange={(e) => {
                          setParamTargetVal(e.target.value);
                          if (paramValidationErrors.targetValue) {
                            setParamValidationErrors((prev) => ({ ...prev, targetValue: undefined }));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-mono font-bold ${
                          paramValidationErrors.targetValue ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      {paramValidationErrors.targetValue && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1">
                          {paramValidationErrors.targetValue}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Tolerance (±) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 40"
                        value={paramTolerance}
                        onChange={(e) => {
                          setParamTolerance(e.target.value);
                          if (paramValidationErrors.tolerance) {
                            setParamValidationErrors((prev) => ({ ...prev, tolerance: undefined }));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-mono font-bold ${
                          paramValidationErrors.tolerance ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      {paramValidationErrors.tolerance && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1">
                          {paramValidationErrors.tolerance}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {paramSpecType === 'MIN_MAX' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Min Value <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 3.0"
                        value={paramMinVal}
                        onChange={(e) => {
                          setParamMinVal(e.target.value);
                          if (paramValidationErrors.minValue) {
                            setParamValidationErrors((prev) => ({ ...prev, minValue: undefined }));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-mono font-bold ${
                          paramValidationErrors.minValue ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      {paramValidationErrors.minValue && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1">
                          {paramValidationErrors.minValue}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">
                        Max Value <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="e.g. 4.5"
                        value={paramMaxVal}
                        onChange={(e) => {
                          setParamMaxVal(e.target.value);
                          if (paramValidationErrors.maxValue) {
                            setParamValidationErrors((prev) => ({ ...prev, maxValue: undefined }));
                          }
                        }}
                        className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-mono font-bold ${
                          paramValidationErrors.maxValue ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                        }`}
                      />
                      {paramValidationErrors.maxValue && (
                        <p className="text-[10px] text-rose-600 font-bold mt-1">
                          {paramValidationErrors.maxValue}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {paramSpecType === 'MINIMUM' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Minimum Value <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 0.8"
                      value={paramMinVal}
                      onChange={(e) => {
                        setParamMinVal(e.target.value);
                        if (paramValidationErrors.minValue) {
                          setParamValidationErrors((prev) => ({ ...prev, minValue: undefined }));
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-mono font-bold ${
                        paramValidationErrors.minValue ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      }`}
                    />
                    {paramValidationErrors.minValue && (
                      <p className="text-[10px] text-rose-600 font-bold mt-1">
                        {paramValidationErrors.minValue}
                      </p>
                    )}
                  </div>
                )}

                {paramSpecType === 'MAXIMUM' && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      Maximum Value <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      placeholder="e.g. 650"
                      value={paramMaxVal}
                      onChange={(e) => {
                        setParamMaxVal(e.target.value);
                        if (paramValidationErrors.maxValue) {
                          setParamValidationErrors((prev) => ({ ...prev, maxValue: undefined }));
                        }
                      }}
                      className={`w-full px-2.5 py-1.5 bg-white border rounded text-xs font-mono font-bold ${
                        paramValidationErrors.maxValue ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      }`}
                    />
                    {paramValidationErrors.maxValue && (
                      <p className="text-[10px] text-rose-600 font-bold mt-1">
                        {paramValidationErrors.maxValue}
                      </p>
                    )}
                  </div>
                )}

                {paramSpecType === 'TEXT' && (
                  <p className="text-[11px] text-slate-500 italic">
                    Qualitative / visual observation parameter. Pass/Fail is determined by inspector evaluation.
                  </p>
                )}
              </div>

              {/* Specification Text */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Specification Text (Displayed on Certificate)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1200 ± 40 HP at 1900 rpm, Max. 650°C"
                  value={paramSpecText}
                  onChange={(e) => setParamSpecText(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-xs focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Leave blank to auto-generate from rule values.
                </span>
              </div>

              {/* Bank Configuration & Mandatory */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Bank Configuration <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={paramBankConfig}
                    onChange={(e) => setParamBankConfig(e.target.value as BankConfig)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
                  >
                    <option value="SINGLE">Single Reading</option>
                    <option value="RH_LH">RH + LH (Dual Bank)</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={paramRequired}
                      onChange={(e) => setParamRequired(e.target.checked)}
                      className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
                    />
                    <span className="ml-2 text-xs font-bold text-slate-700">
                      Mandatory Parameter
                    </span>
                  </label>
                </div>
              </div>

              {/* Save to Parameter Library Checkbox */}
              <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paramSaveToLibrary}
                    onChange={(e) => setParamSaveToLibrary(e.target.checked)}
                    className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Library className="w-3.5 h-3.5 text-blue-900" />
                      Save / Sync to Master Parameter Library
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Makes this parameter definition reusable when configuring other Product Masters.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={handleAttemptCloseParamModal}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5 transition-all"
                >
                  <Check className="w-3.5 h-3.5 text-amber-400" />
                  <span>{editingParamIndex !== null ? 'Save Changes' : 'Add to List'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG: DISCARD UNSAVED PARAMETER CHANGES */}
      {/* ========================================================================= */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 rounded-full text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Discard unsaved changes?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  You have made changes to this parameter. If you discard now, your changes will not be saved.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={closeParamModalDirectly}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CONFIRMATION DIALOG: REMOVE PARAMETER */}
      {/* ========================================================================= */}
      {paramToDeleteIndex !== null && formParameters[paramToDeleteIndex] && (
        <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-rose-100 rounded-full text-rose-700 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Remove Parameter?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Remove parameter <strong className="text-slate-900 font-bold">"{formParameters[paramToDeleteIndex].name}"</strong> from this Product Master?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setParamToDeleteIndex(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteParam}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVISION PROTECTION DIALOG (CASE B) */}
      {/* ========================================================================= */}
      {revisionPrompt && (
        <div className="fixed inset-0 z-70 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-amber-100 rounded-full text-amber-800 shrink-0">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Historical Test Records Exist for Rev. {revisionPrompt.currentRev}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Approved Quality Certificates currently depend on the specification of Rev.{' '}
                  {revisionPrompt.currentRev}. To protect historical certificate integrity, create a new revision for upcoming tests.
                </p>
              </div>
            </div>

            <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-900">
              <div className="flex justify-between font-bold mb-1">
                <span>Historical Tests:</span>
                <span className="font-mono">Locked to Rev {revisionPrompt.currentRev}</span>
              </div>
              <div className="flex justify-between font-bold text-blue-900">
                <span>New Dyno Tests:</span>
                <span className="font-mono">Will use Rev {revisionPrompt.nextRev}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevisionPrompt(null)}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDirectSaveCurrentRev}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="Override directly in current revision"
              >
                Save as Rev.{revisionPrompt.currentRev}
              </button>
              <button
                type="button"
                onClick={handleConfirmRevisionBump}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Create Rev. {revisionPrompt.nextRev}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW PRODUCT DETAILS & FULL PARAMETERS */}
      {/* ========================================================================= */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-amber-400 tracking-wider">
                  Product Quality Specification Details
                </span>
                <h2 className="text-xl font-black">{viewingProduct.model}</h2>
                <p className="text-xs text-slate-300 mt-0.5">{viewingProduct.productName}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-slate-800 text-amber-400 text-xs font-mono font-bold rounded-lg border border-slate-700">
                  Revision {viewingProduct.revision || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingProduct(null)}
                  className="p-1 text-slate-400 hover:text-white text-lg ml-2"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Product Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Product Type</span>
                  <span className="font-bold text-slate-800">{viewingProduct.productType}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Comp. Part Number</span>
                  <span className="font-mono font-bold text-slate-800">{viewingProduct.componentPartNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Machine Model</span>
                  <span className="font-bold text-slate-800">{viewingProduct.machineModel || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Rated Power RPM</span>
                  <span className="font-mono font-bold text-blue-900">{viewingProduct.ratedPowerRpm ? `${viewingProduct.ratedPowerRpm} RPM` : '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-500 block">Rated Torque RPM</span>
                  <span className="font-mono font-bold text-amber-900">{viewingProduct.ratedTorqueRpm ? `${viewingProduct.ratedTorqueRpm} RPM` : '-'}</span>
                </div>
              </div>

              {/* Parameters List */}
              <div>
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Dyno Test Parameters ({viewingProduct.parameters?.length || 0})</span>
                  <span className="text-[11px] text-slate-500 font-normal">
                    Effective Date: {viewingProduct.effectiveDate || 'Active'}
                  </span>
                </h3>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center">#</th>
                        <th className="py-2 px-3">Parameter</th>
                        <th className="py-2 px-3">Standard Specification</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Bank</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {(viewingProduct.parameters || []).map((param, idx) => (
                        <tr key={param.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">{param.name}</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-800">{param.specText}</td>
                          <td className="py-2 px-3 text-[10px] uppercase font-bold text-slate-500">
                            {param.specType.replace('_', ' ')}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                param.bankConfig === 'RH_LH'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {param.bankConfig === 'RH_LH' ? 'RH + LH' : 'Single'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingProduct(null)}
                className="px-5 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PARAMETER LIBRARY: SELECT / IMPORT EXISTING PARAMETERS MODAL */}
      {/* ========================================================================= */}
      <ParameterLibraryModal
        isOpen={isLibrarySelectModalOpen}
        onClose={() => setIsLibrarySelectModalOpen(false)}
        onSelectParameters={handleSelectParametersFromLibrary}
        onOpenCreateNew={handleOpenAddParam}
        alreadyAddedParamNames={formParameters.map((p) => p.name)}
      />

      {/* ========================================================================= */}
      {/* PARAMETER LIBRARY: MANAGE / CRUD MASTER PARAMETERS MODAL */}
      {/* ========================================================================= */}
      <ManageParameterLibraryModal
        isOpen={isManageLibraryModalOpen}
        onClose={() => setIsManageLibraryModalOpen(false)}
      />
    </div>
  );
};

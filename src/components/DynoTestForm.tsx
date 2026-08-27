import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  TestRecord,
  TestResultItem,
  Product,
  PassFailStatus,
  DynProDataPoint,
  DynProFileInfo,
  RatedPointResult,
  PerformanceSamplingPoint,
} from '../types';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  Save,
  Send,
  Sliders,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Info,
  PenTool,
  UploadCloud,
  FileText,
  Trash2,
  TrendingUp,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  evaluateItemStatus,
  calculateOverallResults,
  formatSpecificationDisplay,
} from '../utils/evaluation';
import { SignaturePad } from './SignaturePad';
import { PerformanceChart } from './PerformanceChart';
import {
  calculateJISCorrection,
  findNearestRatedPoint,
  applyJISFactorToDataset,
  parseDynProFile,
  extractSamplingPoints,
  generateSampleDynProData,
  STANDARD_SAMPLING_TARGETS,
} from '../utils/dynoPerformance';

interface DynoTestFormProps {
  initialRecord?: TestRecord | null;
  onCancel: () => void;
  onSuccess: (record: TestRecord) => void;
}

export const DynoTestForm: React.FC<DynoTestFormProps> = ({
  initialRecord,
  onCancel,
  onSuccess,
}) => {
  const {
    products,
    testBenches,
    currentUser,
    createTestRecord,
    updateTestRecord,
    generateNextCertNumber,
  } = useApp();

  const isEditing = Boolean(initialRecord);

  // Step wizard: 1 = Product Info, 2 = Performance Test, 3 = Review & Sign
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Product Information
  const [selectedProductId, setSelectedProductId] = useState<string>(() => {
    if (initialRecord?.productId) return initialRecord.productId;
    return products[0]?.id || '';
  });

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  const [jobOrder, setJobOrder] = useState(initialRecord?.jobOrder || '');
  const [serialNumber, setSerialNumber] = useState(initialRecord?.serialNumber || '');
  const [selectedBenchCode, setSelectedBenchCode] = useState<string>(
    initialRecord?.testBenchCode || testBenches[0]?.code || 'TB-01'
  );
  const [testDate, setTestDate] = useState(
    initialRecord?.testDate || new Date().toISOString().split('T')[0]
  );
  const [certificateNumber] = useState<string>(
    initialRecord?.certificateNumber || generateNextCertNumber()
  );

  // JIS Factor (QC Tester enters manually; system does NOT calculate it)
  const [jisFactor, setJisFactor] = useState<number>(() => {
    if (initialRecord?.jisFactor !== undefined) return initialRecord.jisFactor;
    return 1.015;
  });

  // DynPro Upload & Performance Data
  const [dynProFile, setDynProFile] = useState<DynProFileInfo | undefined>(
    initialRecord?.dynProFile
  );
  const [rawPerformanceData, setRawPerformanceData] = useState<
    Array<{ rpm: number; rawPower: number; rawTorque: number }>
  >(() => {
    if (initialRecord?.performanceData && initialRecord.performanceData.length > 0) {
      return initialRecord.performanceData.map((p) => ({
        rpm: p.rpm,
        rawPower: p.rawPower,
        rawTorque: p.rawTorque,
      }));
    }
    return [];
  });

  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showAuditCalculations, setShowAuditCalculations] = useState(false);
  const [performanceConfirmed, setPerformanceConfirmed] = useState(false);

  // Calculate corrected performance data using JIS Factor
  const correctedPerformanceData = useMemo<DynProDataPoint[]>(() => {
    if (!rawPerformanceData || rawPerformanceData.length === 0) return [];
    return applyJISFactorToDataset(rawPerformanceData, jisFactor);
  }, [rawPerformanceData, jisFactor]);

  // Predefined 9 Sampling Points closest to predefined RPM targets
  const samplingPoints = useMemo<PerformanceSamplingPoint[]>(() => {
    return extractSamplingPoints(rawPerformanceData, jisFactor);
  }, [rawPerformanceData, jisFactor]);

  // Reset confirmation state when dataset or factor changes
  useEffect(() => {
    setPerformanceConfirmed(false);
  }, [rawPerformanceData, jisFactor]);

  // Rated Power & Torque calculations based on closest measured RPM
  const ratedPowerResult = useMemo<RatedPointResult | undefined>(() => {
    if (!correctedPerformanceData.length || !selectedProduct?.ratedPowerRpm) return undefined;
    const res = findNearestRatedPoint(correctedPerformanceData, selectedProduct.ratedPowerRpm, 'power', jisFactor);
    return res || undefined;
  }, [correctedPerformanceData, selectedProduct?.ratedPowerRpm, jisFactor]);

  const ratedTorqueResult = useMemo<RatedPointResult | undefined>(() => {
    if (!correctedPerformanceData.length || !selectedProduct?.ratedTorqueRpm) return undefined;
    const res = findNearestRatedPoint(correctedPerformanceData, selectedProduct.ratedTorqueRpm, 'torque', jisFactor);
    return res || undefined;
  }, [correctedPerformanceData, selectedProduct?.ratedTorqueRpm, jisFactor]);

  // Step 2: Dynamic Test Results
  const [testResults, setTestResults] = useState<TestResultItem[]>(() => {
    if (initialRecord && initialRecord.results && initialRecord.results.length > 0) {
      return initialRecord.results;
    }
    // Generate initial result items from selected product's configured parameters
    const prod = products.find((p) => p.id === selectedProductId) || products[0];
    if (prod && prod.parameters) {
      return prod.parameters.map((param) => ({
        parameterId: param.id,
        order: param.order,
        parameterName: param.name,
        specType: param.specType,
        specText: param.specText,
        unit: param.unit,
        bankConfig: param.bankConfig,
        minValue: param.minValue,
        maxValue: param.maxValue,
        targetValue: param.targetValue,
        tolerance: param.tolerance,
        actualValue: undefined,
        actualRh: undefined,
        actualLh: undefined,
        status: 'PENDING',
        statusRh: 'PENDING',
        statusLh: 'PENDING',
      }));
    }
    return [];
  });

  // When selected product changes on a fresh form (step 1), reload test parameters
  useEffect(() => {
    if (!initialRecord && selectedProduct && selectedProduct.parameters) {
      const generated: TestResultItem[] = selectedProduct.parameters.map((param) => ({
        parameterId: param.id,
        order: param.order,
        parameterName: param.name,
        specType: param.specType,
        specText: param.specText,
        unit: param.unit,
        bankConfig: param.bankConfig,
        minValue: param.minValue,
        maxValue: param.maxValue,
        targetValue: param.targetValue,
        tolerance: param.tolerance,
        actualValue: undefined,
        actualRh: undefined,
        actualLh: undefined,
        status: 'PENDING',
        statusRh: 'PENDING',
        statusLh: 'PENDING',
      }));
      setTestResults(generated);
    }
  }, [selectedProductId, selectedProduct, initialRecord]);

  // Step 3: Signature
  const [testerSignature, setTesterSignature] = useState<string>(
    initialRecord?.testerSignature || currentUser.signature || ''
  );
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState(initialRecord?.remarks || '');

  // Calculate live results & stats
  const overallCalc = useMemo(() => {
    return calculateOverallResults(testResults);
  }, [testResults]);

  // Handle single actual value change
  const handleActualChange = (index: number, valStr: string) => {
    const items = [...testResults];
    const target = { ...items[index] };

    if (valStr.trim() === '') {
      target.actualValue = undefined;
    } else {
      target.actualValue = isNaN(Number(valStr)) ? valStr : parseFloat(valStr);
    }

    const evaluated = evaluateItemStatus(target);
    target.status = evaluated.status;
    items[index] = target;
    setTestResults(items);
  };

  // Handle RH value change
  const handleRhChange = (index: number, valStr: string) => {
    const items = [...testResults];
    const target = { ...items[index] };

    if (valStr.trim() === '') {
      target.actualRh = undefined;
    } else {
      target.actualRh = parseFloat(valStr);
    }

    const evaluated = evaluateItemStatus(target);
    target.status = evaluated.status;
    target.statusRh = evaluated.statusRh;
    target.statusLh = evaluated.statusLh;
    items[index] = target;
    setTestResults(items);
  };

  // Handle LH value change
  const handleLhChange = (index: number, valStr: string) => {
    const items = [...testResults];
    const target = { ...items[index] };

    if (valStr.trim() === '') {
      target.actualLh = undefined;
    } else {
      target.actualLh = parseFloat(valStr);
    }

    const evaluated = evaluateItemStatus(target);
    target.status = evaluated.status;
    target.statusRh = evaluated.statusRh;
    target.statusLh = evaluated.statusLh;
    items[index] = target;
    setTestResults(items);
  };

  // Upload DynPro File Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingFile(true);
    setParseError(null);

    try {
      const parsed = await parseDynProFile(file, selectedProduct?.model);
      setDynProFile(parsed.fileInfo);
      setRawPerformanceData(
        parsed.data.map((dp) => ({
          rpm: dp.rpm,
          rawPower: dp.rawPower,
          rawTorque: dp.rawTorque,
        }))
      );
    } catch (err: any) {
      setParseError(err?.message || 'Failed to extract performance data from file.');
    } finally {
      setIsParsingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Quick Sample DynPro Loader
  const handleLoadSampleDynPro = () => {
    const samplePoints = generateSampleDynProData(selectedProduct?.model);

    setRawPerformanceData(samplePoints);
    setDynProFile({
      fileName: `DynPro_${(selectedProduct?.model || 'KOMATSU').replace(/[^a-zA-Z0-9]/g, '_')}_TEST_REPORT.pdf`,
      fileSize: 245800,
      fileType: 'application/pdf',
      uploadedAt: new Date().toISOString(),
    });
    setParseError(null);
  };

  // Remove DynPro file
  const handleRemoveDynPro = () => {
    setDynProFile(undefined);
    setRawPerformanceData([]);
  };

  // Apply Rated Power & Torque to Table
  const handleApplyRatedPointsToTable = () => {
    const updated = testResults.map((item) => {
      const name = item.parameterName.toLowerCase();
      if (name.includes('power') && ratedPowerResult) {
        const copy = { ...item, actualValue: ratedPowerResult.correctedHp };
        const evaluated = evaluateItemStatus(copy);
        return { ...copy, status: evaluated.status };
      }
      if (name.includes('torque') && ratedTorqueResult) {
        const copy = { ...item, actualValue: ratedTorqueResult.correctedTorque };
        const evaluated = evaluateItemStatus(copy);
        return { ...copy, status: evaluated.status };
      }
      return item;
    });

    setTestResults(updated);
  };

  // Confirm Performance Data Action
  const handleConfirmPerformanceData = () => {
    handleApplyRatedPointsToTable();
    setPerformanceConfirmed(true);
  };

  // Quick preset loader for demonstration / nominal readings
  const handleFillStandardReadings = () => {
    if (!selectedProduct || !selectedProduct.parameters) return;

    // First load sample DynPro curve if empty
    if (!rawPerformanceData.length) {
      handleLoadSampleDynPro();
    }

    const simulated = selectedProduct.parameters.map((param) => {
      let actualVal: number | string | undefined;
      let actualRh: number | undefined;
      let actualLh: number | undefined;

      const pName = param.name.toLowerCase();

      if (param.bankConfig === 'RH_LH') {
        if (param.specType === 'MAXIMUM' && param.maxValue !== undefined) {
          actualRh = Math.round(param.maxValue * 0.94);
          actualLh = Math.round(param.maxValue * 0.96);
        } else if (param.specType === 'MINIMUM' && param.minValue !== undefined) {
          actualRh = Math.round(param.minValue * 1.05);
          actualLh = Math.round(param.minValue * 1.03);
        } else {
          actualRh = 100;
          actualLh = 100;
        }
      } else {
        if (pName.includes('power')) {
          actualVal = 1263.7; // JIS corrected
        } else if (pName.includes('torque')) {
          actualVal = 543.2; // JIS corrected
        } else if (param.specType === 'TARGET_TOLERANCE' && param.targetValue !== undefined) {
          actualVal = param.targetValue + (Math.random() > 0.5 ? 5 : -5);
        } else if (param.specType === 'MIN_MAX' && param.minValue !== undefined && param.maxValue !== undefined) {
          actualVal = Number(((param.minValue + param.maxValue) / 2).toFixed(1));
        } else if (param.specType === 'MINIMUM' && param.minValue !== undefined) {
          actualVal = Number((param.minValue * 1.15).toFixed(2));
        } else if (param.specType === 'MAXIMUM' && param.maxValue !== undefined) {
          actualVal = Number((param.maxValue * 0.6).toFixed(1));
        } else {
          actualVal = 'PASS / NORMAL';
        }
      }

      const item: TestResultItem = {
        parameterId: param.id,
        order: param.order,
        parameterName: param.name,
        specType: param.specType,
        specText: param.specText,
        unit: param.unit,
        bankConfig: param.bankConfig,
        minValue: param.minValue,
        maxValue: param.maxValue,
        targetValue: param.targetValue,
        tolerance: param.tolerance,
        actualValue: actualVal,
        actualRh,
        actualLh,
        status: 'PENDING',
      };

      const evaluated = evaluateItemStatus(item);
      return {
        ...item,
        status: evaluated.status,
        statusRh: evaluated.statusRh,
        statusLh: evaluated.statusLh,
      };
    });

    setTestResults(simulated);
  };

  // Validation before proceeding to step 2
  const handleProceedToStep2 = () => {
    if (!jobOrder.trim()) {
      alert('Please enter Job Order number.');
      return;
    }
    if (!serialNumber.trim()) {
      alert('Please enter Unit Serial Number.');
      return;
    }
    setCurrentStep(2);
  };

  // Validation before proceeding to step 3
  const handleProceedToStep3 = () => {
    if (overallCalc.pendingParameters > 0) {
      if (
        !confirm(
          `There are ${overallCalc.pendingParameters} parameters without readings. Proceed to review?`
        )
      ) {
        return;
      }
    }
    setCurrentStep(3);
  };

  // Save Draft
  const handleSaveDraft = () => {
    if (!jobOrder.trim() || !serialNumber.trim()) {
      alert('Please enter Job Order and Serial Number to save a draft.');
      return;
    }

    const benchObj = testBenches.find((b) => b.code === selectedBenchCode) || testBenches[0];

    const recordData = {
      certificateNumber,
      workflowStatus: 'DRAFT' as const,
      overallResult: overallCalc.overallResult,
      productId: selectedProduct?.id,
      productRevision: selectedProduct?.revision || 1,
      productType: selectedProduct?.productType,
      productName: selectedProduct?.productName || 'KOMATSU DIESEL ENGINE',
      jobOrder: jobOrder.trim(),
      typeModel: selectedProduct?.model || 'SAA12V140E-3',
      serialNumber: serialNumber.trim(),
      componentPartNumber: selectedProduct?.componentPartNumber || '',
      machineModel: selectedProduct?.machineModel || '',
      testBenchCode: selectedBenchCode,
      testBenchName: benchObj?.name || 'Dyno Test Bench',
      testDate,
      testerId: currentUser.id,
      testerName: currentUser.name,
      testerEmployeeId: currentUser.employeeId,
      testerSignature: testerSignature || currentUser.signature,
      results: testResults,
      totalParameters: overallCalc.totalParameters,
      passedParameters: overallCalc.passedParameters,
      failedParameters: overallCalc.failedParameters,
      remarks: submissionNotes,
      jisFactor,
      dynProFile,
      performanceData: correctedPerformanceData,
      samplingPoints,
      ratedPowerResult,
      ratedTorqueResult,
    };

    if (isEditing && initialRecord) {
      updateTestRecord(initialRecord.id, recordData, testerSignature, false);
      onSuccess({
        ...initialRecord,
        ...recordData,
        id: initialRecord.id,
        createdAt: initialRecord.createdAt,
        updatedAt: new Date().toISOString(),
        approvals: initialRecord.approvals,
      });
    } else {
      const created = createTestRecord(recordData, testerSignature, false);
      onSuccess(created);
    }
  };

  // Submit for Approval
  const handleSubmitForApproval = () => {
    if (!testerSignature) {
      alert('QC Tester digital signature is mandatory to submit for Supervisor verification.');
      setShowSignaturePad(true);
      return;
    }

    const benchObj = testBenches.find((b) => b.code === selectedBenchCode) || testBenches[0];

    const recordData = {
      certificateNumber,
      workflowStatus: 'WAITING_APPROVAL' as const,
      overallResult: overallCalc.overallResult,
      productId: selectedProduct?.id,
      productRevision: selectedProduct?.revision || 1,
      productType: selectedProduct?.productType,
      productName: selectedProduct?.productName || 'KOMATSU DIESEL ENGINE',
      jobOrder: jobOrder.trim(),
      typeModel: selectedProduct?.model || 'SAA12V140E-3',
      serialNumber: serialNumber.trim(),
      componentPartNumber: selectedProduct?.componentPartNumber || '',
      machineModel: selectedProduct?.machineModel || '',
      testBenchCode: selectedBenchCode,
      testBenchName: benchObj?.name || 'Dyno Test Bench',
      testDate,
      testerId: currentUser.id,
      testerName: currentUser.name,
      testerEmployeeId: currentUser.employeeId,
      testerSignature,
      results: testResults,
      totalParameters: overallCalc.totalParameters,
      passedParameters: overallCalc.passedParameters,
      failedParameters: overallCalc.failedParameters,
      remarks: submissionNotes,
      jisFactor,
      dynProFile,
      performanceData: correctedPerformanceData,
      samplingPoints,
      ratedPowerResult,
      ratedTorqueResult,
    };

    if (isEditing && initialRecord) {
      updateTestRecord(initialRecord.id, recordData, testerSignature, true);
      onSuccess({
        ...initialRecord,
        ...recordData,
        id: initialRecord.id,
        createdAt: initialRecord.createdAt,
        updatedAt: new Date().toISOString(),
        approvals: initialRecord.approvals,
      });
    } else {
      const created = createTestRecord(recordData, testerSignature, true);
      onSuccess(created);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Wizard Header */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-blue-950">
              {isEditing ? 'Edit Test' : 'New Dyno Test'}
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {certificateNumber}
            </span>
          </div>
          <h1 className="text-xl font-black mt-1">
            Dyno Test Bench & Performance Input
          </h1>
          <p className="text-xs text-slate-300">
            PT Komatsu Remanufacturing Asia – Quality Verification Workflow
          </p>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800 text-xs">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentStep === 1
                ? 'bg-amber-500 text-blue-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
              1
            </span>
            <span>Product Info</span>
          </button>

          <span className="text-slate-600">→</span>

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => handleProceedToStep2()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentStep === 2
                ? 'bg-amber-500 text-blue-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
              2
            </span>
            <span>Performance Test</span>
          </button>

          <span className="text-slate-600">→</span>

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => handleProceedToStep3()}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold transition-all ${
              currentStep === 3
                ? 'bg-amber-500 text-blue-950 font-black'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px]">
              3
            </span>
            <span>Review & Sign</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: PRODUCT & TEST BENCH INFORMATION */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-slate-900">
              Step 1: Product Identification & Test Details
            </h2>
            <p className="text-xs text-slate-500">
              Select product model to automatically load standard test specifications and rated RPMs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            {/* Product Selection */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Select Master Product <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                disabled={isEditing}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 disabled:opacity-60"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.model} — {p.productName} ({p.componentPartNumber})
                  </option>
                ))}
              </select>
            </div>

            {/* Test Bench */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Dyno Test Bench Station <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedBenchCode}
                onChange={(e) => setSelectedBenchCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              >
                {testBenches.map((b) => (
                  <option key={b.code} value={b.code}>
                    {b.code} — {b.name} ({b.capacityHp} HP Capacity)
                  </option>
                ))}
              </select>
            </div>

            {/* Job Order */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Job Order (JO) Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. JO-2025-08991"
                value={jobOrder}
                onChange={(e) => setJobOrder(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs font-bold uppercase focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            {/* Unit Serial Number */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Engine / Unit Serial Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 520448"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl font-mono text-xs font-bold uppercase focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            {/* Test Date */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Date of Test Execution <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
              />
            </div>

            {/* QC Tester Name */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Assigned QC Tester
              </label>
              <div className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>{currentUser.name}</span>
                <span className="font-mono text-slate-400 font-normal">
                  ID: {currentUser.employeeId}
                </span>
              </div>
            </div>
          </div>

          {/* Product Specifications Overview Card */}
          {selectedProduct && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-900" />
                  Loaded Master Specification Details
                </span>
                <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded">
                  {selectedProduct.parameters?.length || 0} QC Parameters Configured
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs border-t border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 block">Product Type</span>
                  <span className="font-bold text-slate-800">{selectedProduct.productType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Comp. Part Number</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedProduct.componentPartNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Machine Model</span>
                  <span className="font-bold text-slate-800">{selectedProduct.machineModel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Rated Power RPM</span>
                  <span className="font-bold text-blue-900 font-mono">
                    {selectedProduct.ratedPowerRpm ? `${selectedProduct.ratedPowerRpm} RPM` : '1900 RPM'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Rated Torque RPM</span>
                  <span className="font-bold text-amber-900 font-mono">
                    {selectedProduct.ratedTorqueRpm ? `${selectedProduct.ratedTorqueRpm} RPM` : '1350 RPM'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Wizard Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleProceedToStep2}
              className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Continue to Performance Test</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: PERFORMANCE TEST READINGS & DYNPRO REPORT */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Step 2: Dyno Test Performance & DynPro Data
              </h2>
              <p className="text-xs text-slate-500">
                Upload original Taylor DynPro report, enter JIS Correction Factor, and record parameter readings.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleFillStandardReadings}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Fill nominal test values"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Auto-Fill Nominal Readings</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold">
                <span className="text-slate-600">Overall:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    overallCalc.overallResult === 'PASS'
                      ? 'bg-emerald-600 text-white'
                      : overallCalc.overallResult === 'FAIL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-400 text-blue-950'
                  }`}
                >
                  {overallCalc.overallResult}
                </span>
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* SECTION A: TAYLOR DYNPRO FILE UPLOAD & JIS FACTOR SECTION */}
          {/* ======================================================================= */}
          <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-2xl border border-slate-800 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <h3 className="text-xs font-black tracking-wider uppercase text-amber-400">
                    Taylor Dynamometer DynPro Data & JIS Factor
                  </h3>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Extracts EngSpd (RPM), Eng_Power (Hp), and Eng_Torque (Kgm) and applies QC JIS correction.
                </p>
              </div>

              {/* JIS Factor Input */}
              <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
                <span className="text-[11px] font-bold text-slate-300">JIS Factor:</span>
                <input
                  type="number"
                  step="0.001"
                  min="0.5"
                  max="2.0"
                  value={jisFactor}
                  onChange={(e) => setJisFactor(parseFloat(e.target.value) || 1.0)}
                  className="w-20 px-2 py-0.5 bg-slate-950 border border-amber-400/60 rounded text-xs font-mono font-black text-amber-400 text-center focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Upload Zone and File Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              {/* File Upload / Status Box */}
              <div className="md:col-span-2 space-y-2">
                {!dynProFile ? (
                  <div className="border-2 border-dashed border-slate-700 hover:border-amber-400/70 rounded-xl p-4 text-center transition-all bg-slate-950/40">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="dynpro-file-input"
                      accept=".pdf,.csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="dynpro-file-input"
                      className="cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                    >
                      <UploadCloud className="w-7 h-7 text-amber-400" />
                      <span className="font-bold text-slate-200">
                        {isParsingFile ? 'Extracting DynPro Data...' : 'Upload DynPro Performance Report (PDF / CSV / TXT)'}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Extracts EngSpd, Eng_Power, Eng_Torque automatically & retains original file.
                      </span>
                    </label>

                    <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={handleLoadSampleDynPro}
                        className="text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer"
                      >
                        ⚡ Load Sample DynPro Report (Demo)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-900/60 border border-blue-700 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-300" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-100 block text-xs truncate max-w-[280px]">
                          {dynProFile.fileName}
                        </span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {(dynProFile.fileSize / 1024).toFixed(1)} KB • {correctedPerformanceData.length} data points extracted
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-900/60 text-emerald-300 border border-emerald-700">
                        ✓ File Retained
                      </span>
                      <button
                        type="button"
                        onClick={handleRemoveDynPro}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Remove uploaded report"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {parseError && (
                  <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px] rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>

              {/* Extraction & Target Evaluation Summary */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Rated Targets & Closest RPM Points
                  </span>

                  <div className="space-y-1.5">
                    {/* Rated Power */}
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Rated Power Target:</span>
                        <span className="font-mono font-bold text-sky-300">
                          {selectedProduct?.ratedPowerRpm || 1900} RPM
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span className="text-xs font-mono font-black text-sky-400">
                          {ratedPowerResult ? `${ratedPowerResult.correctedHp.toFixed(1)} HP` : '-'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {ratedPowerResult ? `at ${ratedPowerResult.actualRpm} RPM (Raw: ${ratedPowerResult.rawHp} HP)` : 'No data'}
                        </span>
                      </div>
                    </div>

                    {/* Rated Torque */}
                    <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Rated Torque Target:</span>
                        <span className="font-mono font-bold text-amber-300">
                          {selectedProduct?.ratedTorqueRpm || 1350} RPM
                        </span>
                      </div>
                      <div className="flex justify-between items-baseline mt-0.5">
                        <span className="text-xs font-mono font-black text-amber-400">
                          {ratedTorqueResult ? `${ratedTorqueResult.correctedTorque.toFixed(1)} kgm` : '-'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {ratedTorqueResult ? `at ${ratedTorqueResult.actualRpm} RPM (Raw: ${ratedTorqueResult.rawTorque} kgm)` : 'No data'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Button to apply to table */}
                {correctedPerformanceData.length > 0 && (
                  <button
                    type="button"
                    onClick={handleConfirmPerformanceData}
                    className={`w-full py-2 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                      performanceConfirmed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-400 hover:bg-amber-300 text-blue-950 font-black'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{performanceConfirmed ? '✓ Performance Data Confirmed' : 'CONFIRM & APPLY PERFORMANCE DATA'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ======================================================================= */}
          {/* SECTION B: PERFORMANCE SAMPLING POINTS TABLE (QC TESTER AUDIT & REVIEW) */}
          {/* ======================================================================= */}
          {rawPerformanceData.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs space-y-0">
              <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h4 className="text-xs font-black tracking-wider uppercase text-amber-400">
                      PERFORMANCE SAMPLING POINTS (Taylor DynPro Logger Points)
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Selected actual measured engine operating points at predefined RPM targets (no interpolation).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAuditCalculations(!showAuditCalculations)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer"
                  >
                    {showAuditCalculations ? 'Hide Raw / JIS Details' : 'Inspect Raw & JIS Details'}
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPerformanceData}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      performanceConfirmed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-400 hover:bg-amber-300 text-blue-950 font-black shadow-sm'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{performanceConfirmed ? '✓ Confirmed' : 'Confirm Performance Data'}</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-4">Test Condition</th>
                      <th className="py-2.5 px-3 text-center">Target RPM</th>
                      <th className="py-2.5 px-4 text-center">Actual Measured RPM</th>
                      <th className="py-2.5 px-4 text-center">Power (HP)</th>
                      <th className="py-2.5 px-4 text-center">Torque (kgm)</th>
                      {showAuditCalculations && (
                        <>
                          <th className="py-2.5 px-3 text-center text-slate-500 font-mono">Raw Power</th>
                          <th className="py-2.5 px-3 text-center text-slate-500 font-mono">Raw Torque</th>
                          <th className="py-2.5 px-3 text-center text-amber-700 font-mono">JIS Factor</th>
                        </>
                      )}
                      <th className="py-2.5 px-4 text-center w-28">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {samplingPoints.map((pt, idx) => (
                      <tr
                        key={pt.id || idx}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !pt.available ? 'bg-slate-50/50 text-slate-400' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-800">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black mr-2 ${
                              pt.condition === 'LOW_IDLE'
                                ? 'bg-sky-100 text-sky-800'
                                : pt.condition === 'HIGH_IDLE'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {pt.condition === 'LOW_IDLE'
                              ? 'NO LOAD (Low Idle)'
                              : pt.condition === 'HIGH_IDLE'
                              ? 'NO LOAD (High Idle)'
                              : 'LOAD'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700">
                          {pt.targetRpm} RPM
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-black text-blue-950">
                          {pt.available && pt.actualRpm !== undefined ? (
                            <span>
                              {pt.actualRpm} RPM
                              {pt.lineNumber && (
                                <span className="text-[9px] text-slate-400 font-mono ml-1">
                                  [L#{pt.lineNumber}]
                                </span>
                              )}
                              {pt.differenceRpm !== 0 && (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">
                                  ({pt.differenceRpm && pt.differenceRpm > 0 ? `+${pt.differenceRpm}` : pt.differenceRpm})
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No valid data</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-blue-900">
                          {pt.available && pt.correctedPower !== undefined ? (
                            `${pt.correctedPower.toFixed(1)} HP`
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal italic">No valid load data</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono font-bold text-amber-900">
                          {pt.available && pt.correctedTorque !== undefined ? (
                            `${pt.correctedTorque.toFixed(1)} kgm`
                          ) : (
                            <span className="text-slate-400 text-[11px] font-normal italic">No valid load data</span>
                          )}
                        </td>
                        {showAuditCalculations && (
                          <>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {pt.rawPower !== undefined ? `${pt.rawPower} HP` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500">
                              {pt.rawTorque !== undefined ? `${pt.rawTorque} kgm` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono font-bold text-amber-700">
                              {jisFactor.toFixed(3)}
                            </td>
                          </>
                        )}
                        <td className="py-2.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                              pt.available
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {pt.available ? 'MEASURED' : 'UNAVAILABLE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Test Parameters Input Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                QC Parameter Measurements ({testResults.length} Parameters)
              </h3>
              <span className="text-[11px] text-slate-500">
                Enter readings or auto-fill with JIS-corrected performance data.
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold">
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-4">Parameter Name</th>
                    <th className="py-3 px-4">Standard Specification</th>
                    <th className="py-3 px-3">Unit</th>
                    <th className="py-3 px-6 text-center w-64">Actual Test Result</th>
                    <th className="py-3 px-4 text-center w-28">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {testResults.map((item, idx) => (
                    <tr
                      key={item.parameterId || idx}
                      className={`transition-colors ${
                        item.status === 'FAIL'
                          ? 'bg-rose-50/70 hover:bg-rose-50'
                          : item.status === 'PASS'
                          ? 'bg-emerald-50/20 hover:bg-emerald-50/40'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      {/* Index */}
                      <td className="py-3 px-3 text-center font-bold text-slate-400">
                        {idx + 1}
                      </td>

                      {/* Parameter Name */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block">{item.parameterName}</span>
                        {item.bankConfig === 'RH_LH' && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded inline-block mt-0.5">
                            Dual Bank (RH + LH)
                          </span>
                        )}
                        {item.parameterName.toLowerCase().includes('power') && ratedPowerResult && (
                          <span className="text-[9px] font-bold text-sky-700 bg-sky-100 px-1.5 py-0.2 rounded inline-block mt-0.5 ml-1">
                            JIS Corrected ({ratedPowerResult.correctedHp.toFixed(1)} HP)
                          </span>
                        )}
                        {item.parameterName.toLowerCase().includes('torque') && ratedTorqueResult && (
                          <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded inline-block mt-0.5 ml-1">
                            JIS Corrected ({ratedTorqueResult.correctedTorque.toFixed(1)} kgm)
                          </span>
                        )}
                      </td>

                      {/* Standard Spec */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {item.specText}
                      </td>

                      {/* Unit */}
                      <td className="py-3 px-3 font-semibold text-slate-600">
                        {item.unit}
                      </td>

                      {/* Actual Input */}
                      <td className="py-3 px-4">
                        {item.bankConfig === 'RH_LH' ? (
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                RH Bank
                              </span>
                              <input
                                type="number"
                                step="any"
                                placeholder="RH"
                                value={item.actualRh !== undefined ? item.actualRh : ''}
                                onChange={(e) => handleRhChange(idx, e.target.value)}
                                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:outline-none ${
                                  item.statusRh === 'FAIL'
                                    ? 'border-rose-400 bg-rose-50 text-rose-900'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-500 block mb-0.5">
                                LH Bank
                              </span>
                              <input
                                type="number"
                                step="any"
                                placeholder="LH"
                                value={item.actualLh !== undefined ? item.actualLh : ''}
                                onChange={(e) => handleLhChange(idx, e.target.value)}
                                className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:outline-none ${
                                  item.statusLh === 'FAIL'
                                    ? 'border-rose-400 bg-rose-50 text-rose-900'
                                    : 'border-slate-300 bg-white text-slate-900'
                                }`}
                              />
                            </div>
                          </div>
                        ) : (
                          <input
                            type={item.specType === 'STRING_MATCH' ? 'text' : 'number'}
                            step="any"
                            placeholder="Enter actual reading"
                            value={item.actualValue !== undefined ? item.actualValue : ''}
                            onChange={(e) => handleActualChange(idx, e.target.value)}
                            className={`w-full px-3 py-1.5 border rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-900/20 focus:outline-none ${
                              item.status === 'FAIL'
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : 'border-slate-300 bg-white text-slate-900'
                            }`}
                          />
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded text-[10px] font-black tracking-wider ${
                            item.status === 'PASS'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : item.status === 'FAIL'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Trend Chart */}
          <div className="pt-2">
            <PerformanceChart
              results={testResults}
              performanceData={correctedPerformanceData}
              samplingPoints={samplingPoints}
              jisFactor={jisFactor}
              ratedPowerResult={ratedPowerResult}
              ratedTorqueResult={ratedTorqueResult}
              modelName={selectedProduct?.model}
            />
          </div>

          {/* Wizard Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 1</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-600" />
                <span>Save Draft</span>
              </button>
              <button
                type="button"
                onClick={handleProceedToStep3}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Proceed to Review & Sign</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REVIEW RESULT & QC DIGITAL SIGNATURE */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Step 3: Verification & QC Digital Sign-Off
              </h2>
              <p className="text-xs text-slate-500">
                Review complete test results before digitally signing and submitting for Supervisor verification.
              </p>
            </div>

            <div
              className={`px-4 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 border ${
                overallCalc.overallResult === 'PASS'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <span>Overall Result:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-black ${
                  overallCalc.overallResult === 'PASS'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {overallCalc.overallResult}
              </span>
            </div>
          </div>

          {/* Product & Test Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Job Order</span>
              <span className="font-mono font-bold text-slate-900">{jobOrder}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Serial Number</span>
              <span className="font-mono font-bold text-slate-900">{serialNumber}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Model / Part No.</span>
              <span className="font-bold text-slate-900">
                {selectedProduct?.model} ({selectedProduct?.componentPartNumber})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">Dyno Test Bench</span>
              <span className="font-bold text-slate-900">{selectedBenchCode}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-medium">JIS Factor Applied</span>
              <span className="font-mono font-bold text-amber-900">{jisFactor.toFixed(3)}</span>
            </div>
          </div>

          {/* DynPro Performance Test Summary Card */}
          {correctedPerformanceData.length > 0 && (
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  DynPro Performance Curve & Rated Points Summary
                </span>
                {dynProFile && (
                  <span className="text-[10px] text-slate-300 font-mono bg-slate-800 px-2 py-0.5 rounded">
                    Attached Report: {dynProFile.fileName}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {ratedPowerResult && (
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Rated Power (Target: {ratedPowerResult.targetRpm} RPM)</span>
                    <span className="text-base font-black font-mono text-sky-400">
                      {ratedPowerResult.correctedHp.toFixed(1)} HP
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Measured at {ratedPowerResult.actualRpm} RPM (Raw: {ratedPowerResult.rawHp} HP × JIS {jisFactor})
                    </span>
                  </div>
                )}

                {ratedTorqueResult && (
                  <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Rated Torque (Target: {ratedTorqueResult.targetRpm} RPM)</span>
                    <span className="text-base font-black font-mono text-amber-400">
                      {ratedTorqueResult.correctedTorque.toFixed(1)} kgm
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Measured at {ratedTorqueResult.actualRpm} RPM (Raw: {ratedTorqueResult.rawTorque} kgm × JIS {jisFactor})
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Failed parameters alert if any */}
          {overallCalc.failedParameters > 0 && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Failed Parameters Detected ({overallCalc.failedParameters} items):</span>
              </div>
              <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                {testResults
                  .filter((r) => r.status === 'FAIL')
                  .map((f) => (
                    <li key={f.parameterId}>
                      <span className="font-bold">{f.parameterName}</span>: Standard [{f.specText}], Actual reading{' '}
                      {f.bankConfig === 'RH_LH'
                        ? `[RH: ${f.actualRh} ${f.unit}, LH: ${f.actualLh} ${f.unit}]`
                        : `[${f.actualValue} ${f.unit}]`}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Results Compact Review Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 border-b border-slate-200">
              Parameter Results Summary ({testResults.length} parameters)
            </div>
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">#</th>
                  <th className="py-2 px-3">Parameter</th>
                  <th className="py-2 px-3">Specification</th>
                  <th className="py-2 px-3 text-center">Actual Reading</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {testResults.map((item, idx) => (
                  <tr key={item.parameterId} className="hover:bg-slate-50">
                    <td className="py-2 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-800">{item.parameterName}</td>
                    <td className="py-2 px-3 font-mono text-slate-600">{item.specText}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold">
                      {item.bankConfig === 'RH_LH'
                        ? `RH: ${item.actualRh ?? '-'} | LH: ${item.actualLh ?? '-'} ${item.unit}`
                        : `${item.actualValue ?? '-'} ${item.unit}`}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          item.status === 'PASS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.status === 'FAIL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              QC Tester Observations / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Standard dyno run cycle performed. Fuel injection and governor curves verified within reman tolerance."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900"
            />
          </div>

          {/* QC Digital Signature Section */}
          <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <PenTool className="w-4 h-4 text-blue-900" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  QC Tester Digital Signature & Seal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSignaturePad(true)}
                className="text-xs font-bold text-blue-900 hover:text-blue-700 underline cursor-pointer"
              >
                {testerSignature ? 'Change / Re-Sign' : 'Draw Digital Signature'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <div className="space-y-1 text-xs text-slate-700">
                  <p>
                    <span className="text-slate-400 font-medium">Tester Name:</span>{' '}
                    <strong className="text-slate-900">{currentUser.name}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Employee ID / NIK:</span>{' '}
                    <strong className="font-mono text-slate-900">{currentUser.employeeId}</strong>
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Department:</span>{' '}
                    <span>{currentUser.department || 'QC Dyno Division'}</span>
                  </p>
                  <p>
                    <span className="text-slate-400 font-medium">Timestamp:</span>{' '}
                    <span className="font-mono">{new Date().toLocaleString()}</span>
                  </p>
                </div>
              </div>

              {/* Signature Display Preview */}
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex flex-col items-center justify-center min-h-[100px]">
                {testerSignature ? (
                  <div className="text-center">
                    <img
                      src={testerSignature}
                      alt="QC Tester Signature"
                      className="max-h-20 max-w-full object-contain mx-auto"
                    />
                    <span className="text-[10px] text-emerald-700 font-bold block mt-1">
                      ✓ Registered QC Signature Validated
                    </span>
                  </div>
                ) : (
                  <div className="text-center">
                    <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <span className="text-xs text-slate-500 font-medium block">
                      No signature provided
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(true)}
                      className="mt-1 px-3 py-1 bg-blue-900 text-white rounded text-[11px] font-bold cursor-pointer"
                    >
                      Sign Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Modal for Signature Pad */}
          {showSignaturePad && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
                <SignaturePad
                  title="QC Tester Digital Signature"
                  initialSignature={testerSignature}
                  onSave={(sig) => {
                    setTesterSignature(sig);
                    setShowSignaturePad(false);
                  }}
                  onCancel={() => setShowSignaturePad(false)}
                />
              </div>
            </div>
          )}

          {/* Wizard Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Step 2</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4 text-slate-600" />
                <span>Save as Draft</span>
              </button>
              <button
                type="button"
                onClick={handleSubmitForApproval}
                className="px-6 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-400" />
                <span>Sign & Submit for Supervisor Approval</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

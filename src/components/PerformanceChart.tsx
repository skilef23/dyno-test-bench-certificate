import React, { useState, useMemo } from 'react';
import {
  TestResultItem,
  DynProDataPoint,
  RatedPointResult,
  PerformanceSamplingPoint,
} from '../types';
import { extractSamplingPoints } from '../utils/dynoPerformance';

interface PerformanceChartProps {
  results?: TestResultItem[];
  performanceData?: DynProDataPoint[];
  samplingPoints?: PerformanceSamplingPoint[];
  jisFactor?: number;
  ratedPowerResult?: RatedPointResult;
  ratedTorqueResult?: RatedPointResult;
  modelName?: string;
  isPrintMode?: boolean;
}

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  results = [],
  performanceData,
  samplingPoints: propSamplingPoints,
  jisFactor = 1.0,
  ratedPowerResult,
  ratedTorqueResult,
  modelName = 'Engine Performance',
  isPrintMode = false,
}) => {
  const [activeTab, setActiveTab] = useState<'curve' | 'gauges'>('curve');
  const [hoveredPoint, setHoveredPoint] = useState<{
    rpm: number;
    power: number;
    torque: number;
    label: string;
  } | null>(null);

  // Extract key parameters from results for gauge view
  const exhaustItem = results.find((r) => r.parameterName.toLowerCase().includes('exhaust'));
  const boostItem = results.find((r) => r.parameterName.toLowerCase().includes('boost'));
  const oilPressHigh = results.find((r) => r.parameterName.toLowerCase().includes('oil pressure - high'));
  const oilTemp = results.find((r) => r.parameterName.toLowerCase().includes('oil temperature'));
  const coolantTemp = results.find((r) => r.parameterName.toLowerCase().includes('coolant'));
  const blowby = results.find((r) => r.parameterName.toLowerCase().includes('blowby'));

  // Calculate sampling points
  const samplingPoints = useMemo<PerformanceSamplingPoint[]>(() => {
    if (propSamplingPoints && propSamplingPoints.length > 0) {
      return propSamplingPoints;
    }
    if (performanceData && performanceData.length > 0) {
      return extractSamplingPoints(performanceData, jisFactor);
    }
    return [];
  }, [propSamplingPoints, performanceData, jisFactor]);

  // Available LOAD Sampling Points for continuous performance curve, sorted in ascending actual RPM order
  const loadCurvePoints = useMemo<PerformanceSamplingPoint[]>(() => {
    return samplingPoints
      .filter(
        (p) =>
          p.condition === 'LOAD' &&
          p.available &&
          p.actualRpm !== undefined &&
          p.correctedPower !== undefined &&
          p.correctedTorque !== undefined
      )
      .sort((a, b) => (a.actualRpm || 0) - (b.actualRpm || 0));
  }, [samplingPoints]);

  const lowIdlePoint = useMemo(
    () => samplingPoints.find((p) => p.condition === 'LOW_IDLE' && p.available),
    [samplingPoints]
  );
  const highIdlePoint = useMemo(
    () => samplingPoints.find((p) => p.condition === 'HIGH_IDLE' && p.available),
    [samplingPoints]
  );
  const unavailableCount = useMemo(
    () => samplingPoints.filter((p) => !p.available).length,
    [samplingPoints]
  );

  // Axis ranges
  const minRpm = 500;
  const maxRpm = 2300;

  // Auto-scale Power (HP)
  const maxMeasuredPower = useMemo(() => {
    const powers = loadCurvePoints.map((p) => p.correctedPower || 0);
    if (ratedPowerResult?.correctedHp) powers.push(ratedPowerResult.correctedHp);
    const max = powers.length > 0 ? Math.max(...powers) : 1200;
    const step = max > 1500 ? 250 : max > 800 ? 200 : 100;
    return Math.ceil((max * 1.15) / step) * step;
  }, [loadCurvePoints, ratedPowerResult]);

  // Auto-scale Torque (kgm)
  const maxMeasuredTorque = useMemo(() => {
    const torques = loadCurvePoints.map((p) => p.correctedTorque || 0);
    if (ratedTorqueResult?.correctedTorque) torques.push(ratedTorqueResult.correctedTorque);
    const max = torques.length > 0 ? Math.max(...torques) : 600;
    const step = max > 600 ? 100 : 50;
    return Math.ceil((max * 1.15) / step) * step;
  }, [loadCurvePoints, ratedTorqueResult]);

  // SVG Geometry
  const width = 720;
  const height = 280;
  const padding = { top: 32, right: 65, bottom: 42, left: 65 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const getX = (rpm: number) => {
    return padding.left + ((rpm - minRpm) / (maxRpm - minRpm)) * plotWidth;
  };

  const getYPower = (hp: number) => {
    return padding.top + plotHeight - (hp / maxMeasuredPower) * plotHeight;
  };

  const getYTorque = (tq: number) => {
    return padding.top + plotHeight - (tq / maxMeasuredTorque) * plotHeight;
  };

  // Continuous Connected SVG paths across LOAD sampling points in ascending RPM order
  const powerCurvePath = useMemo(() => {
    if (loadCurvePoints.length === 0) return '';
    return loadCurvePoints
      .map((p, idx) => {
        const x = getX(p.actualRpm!);
        const y = getYPower(p.correctedPower || 0);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [loadCurvePoints, maxMeasuredPower]);

  const torqueCurvePath = useMemo(() => {
    if (loadCurvePoints.length === 0) return '';
    return loadCurvePoints
      .map((p, idx) => {
        const x = getX(p.actualRpm!);
        const y = getYTorque(p.correctedTorque || 0);
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [loadCurvePoints, maxMeasuredTorque]);

  const rpmTicks = [650, 1000, 1200, 1400, 1600, 1800, 2000, 2200];
  const yRatios = [0.25, 0.5, 0.75, 1.0];

  const exhRh = exhaustItem?.actualRh || 0;
  const exhLh = exhaustItem?.actualLh || 0;
  const exhMax = exhaustItem?.maxValue || 650;
  const boostRh = boostItem?.actualRh || 0;
  const boostLh = boostItem?.actualLh || 0;
  const boostMin = boostItem?.minValue || 1250;

  return (
    <div
      id="performance-graph-container"
      className={`border rounded-xl p-4 ${
        isPrintMode
          ? 'bg-white border-slate-300 shadow-none'
          : 'bg-white border-slate-200 shadow-xs'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2.5 mb-3 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-900" />
            <h4 className="text-xs font-black tracking-wider text-blue-950 uppercase">
              ENGINE PERFORMANCE CURVE
            </h4>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Tested Power & Torque Performance Output • {modelName}
          </p>
        </div>

        {!isPrintMode && (
          <div className="flex items-center gap-2">
            <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('curve')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'curve'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Performance Curve
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('gauges')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  activeTab === 'gauges'
                    ? 'bg-white text-blue-950 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Sensor Gauges
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: ENGINE PERFORMANCE CURVE (Dual Y-Axis: Power HP & Torque kgm vs RPM) */}
      {(activeTab === 'curve' || isPrintMode) && (
        <div className="space-y-3">
          {loadCurvePoints.length < 3 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                !
              </div>
              <h5 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                INSUFFICIENT PERFORMANCE DATA
              </h5>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                The uploaded DynPro report does not contain sufficient valid performance operating points (minimum 3 distinct RPM records required). Please upload a valid Taylor Dynamometer dataset.
              </p>
            </div>
          ) : (
            <>
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Power Legend */}
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-1.5 bg-blue-600 rounded-full inline-block" />
                    <span className="font-bold text-blue-950">Power (HP)</span>
                  </div>

                  {/* Torque Legend */}
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-1.5 bg-amber-600 rounded-full inline-block" />
                    <span className="font-bold text-amber-950">Torque (kgm)</span>
                  </div>

                  {/* No Load Marker Tag */}
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-400 bg-white" />
                    <span>No Load (Idle)</span>
                  </div>
                </div>

                {hoveredPoint && !isPrintMode && (
                  <div className="text-[10px] font-mono font-bold bg-blue-50 text-blue-950 px-2.5 py-0.5 rounded border border-blue-200">
                    {hoveredPoint.label}: {hoveredPoint.rpm} RPM | {hoveredPoint.power.toFixed(1)} HP |{' '}
                    {hoveredPoint.torque.toFixed(1)} kgm
                  </div>
                )}
              </div>

              {/* SVG Canvas */}
              <div
                className={`w-full rounded-xl p-2 border ${
                  isPrintMode
                    ? 'bg-slate-50/70 border-slate-200 overflow-hidden min-w-0'
                    : 'bg-slate-950 border-slate-800 shadow-inner overflow-x-auto'
                }`}
              >
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className={`w-full h-auto select-none text-[10px] font-mono ${
                    isPrintMode ? 'min-w-0' : 'min-w-[620px]'
                  }`}
                >
                  {/* Vertical RPM Grid Lines */}
                  {rpmTicks.map((rpm) => {
                    const x = getX(rpm);
                    const isIdle = rpm === 650 || rpm === 2200;
                    return (
                      <g key={`grid-rpm-${rpm}`}>
                        <line
                          x1={x}
                          y1={padding.top}
                          x2={x}
                          y2={padding.top + plotHeight}
                          stroke={isPrintMode ? (isIdle ? '#cbd5e1' : '#e2e8f0') : isIdle ? '#334155' : '#1e293b'}
                          strokeDasharray={isIdle ? '2 2' : '3 3'}
                          strokeWidth="1"
                        />
                        <text
                          x={x}
                          y={height - 12}
                          textAnchor="middle"
                          fill={isPrintMode ? '#64748b' : '#94a3b8'}
                          className="text-[9px]"
                        >
                          {rpm}
                        </text>
                      </g>
                    );
                  })}

                  {/* Horizontal Grid Lines */}
                  {yRatios.map((ratio) => {
                    const y = padding.top + plotHeight * (1 - ratio);
                    const powerTick = Math.round(maxMeasuredPower * ratio);
                    const torqueTick = Math.round(maxMeasuredTorque * ratio);
                    return (
                      <g key={`grid-y-${ratio}`}>
                        <line
                          x1={padding.left}
                          y1={y}
                          x2={padding.left + plotWidth}
                          y2={y}
                          stroke={isPrintMode ? '#e2e8f0' : '#1e293b'}
                          strokeWidth="1"
                        />
                        {/* Left Axis: Power (HP) */}
                        <text
                          x={padding.left - 8}
                          y={y + 3}
                          textAnchor="end"
                          fill={isPrintMode ? '#1d4ed8' : '#60a5fa'}
                          className="text-[9px] font-bold"
                        >
                          {powerTick}
                        </text>
                        {/* Right Axis: Torque (kgm) */}
                        <text
                          x={padding.left + plotWidth + 8}
                          y={y + 3}
                          textAnchor="start"
                          fill={isPrintMode ? '#b45309' : '#fbbf24'}
                          className="text-[9px] font-bold"
                        >
                          {torqueTick}
                        </text>
                      </g>
                    );
                  })}

                  {/* Baseline */}
                  <line
                    x1={padding.left}
                    y1={padding.top + plotHeight}
                    x2={padding.left + plotWidth}
                    y2={padding.top + plotHeight}
                    stroke={isPrintMode ? '#94a3b8' : '#475569'}
                    strokeWidth="1.5"
                  />

                  {/* Axis Titles */}
                  <text
                    x={padding.left - 8}
                    y={padding.top - 12}
                    textAnchor="end"
                    fill={isPrintMode ? '#1e40af' : '#93c5fd'}
                    className="text-[10px] font-black"
                  >
                    Power (HP)
                  </text>
                  <text
                    x={padding.left + plotWidth + 8}
                    y={padding.top - 12}
                    textAnchor="start"
                    fill={isPrintMode ? '#b45309' : '#fde68a'}
                    className="text-[10px] font-black"
                  >
                    Torque (kgm)
                  </text>
                  <text
                    x={padding.left + plotWidth / 2}
                    y={height - 2}
                    textAnchor="middle"
                    fill={isPrintMode ? '#475569' : '#cbd5e1'}
                    className="text-[10px] font-bold tracking-wider"
                  >
                    Engine Speed (RPM)
                  </text>

              {/* Main Load Power Curve (Solid Blue Line) */}
              {powerCurvePath && (
                <path
                  d={powerCurvePath}
                  fill="none"
                  stroke={isPrintMode ? '#1e40af' : '#38bdf8'}
                  strokeWidth={isPrintMode ? '2.5' : '3'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Main Load Torque Curve (Solid Amber Line) */}
              {torqueCurvePath && (
                <path
                  d={torqueCurvePath}
                  fill="none"
                  stroke={isPrintMode ? '#d97706' : '#fbbf24'}
                  strokeWidth={isPrintMode ? '2.5' : '3'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Performance Points Data Markers (Power - Blue) - LOAD ONLY */}
              {loadCurvePoints.map((pt) => {
                const rpm = pt.actualRpm!;
                const hp = pt.correctedPower || 0;
                const x = getX(rpm);
                const y = getYPower(hp);
                return (
                  <g
                    key={`mark-p-${pt.id}`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        rpm,
                        power: hp,
                        torque: pt.correctedTorque || 0,
                        label: `${pt.conditionLabel || 'Load'} (${pt.targetRpm} RPM Target)`,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={isPrintMode ? '#1e40af' : '#38bdf8'}
                      stroke={isPrintMode ? '#ffffff' : '#0284c7'}
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* Performance Points Data Markers (Torque - Amber) - LOAD ONLY */}
              {loadCurvePoints.map((pt) => {
                const rpm = pt.actualRpm!;
                const tq = pt.correctedTorque || 0;
                const x = getX(rpm);
                const y = getYTorque(tq);
                return (
                  <g
                    key={`mark-t-${pt.id}`}
                    onMouseEnter={() =>
                      setHoveredPoint({
                        rpm,
                        power: pt.correctedPower || 0,
                        torque: tq,
                        label: `${pt.conditionLabel || 'Load'} (${pt.targetRpm} RPM Target)`,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r="4"
                      fill={isPrintMode ? '#d97706' : '#fbbf24'}
                      stroke={isPrintMode ? '#ffffff' : '#b45309'}
                      strokeWidth="1.5"
                    />
                  </g>
                );
              })}

              {/* NO LOAD: Low Idle Annotation & Drop Line */}
              {lowIdlePoint && lowIdlePoint.actualRpm !== undefined && (
                <g
                  onMouseEnter={() =>
                    setHoveredPoint({
                      rpm: lowIdlePoint.actualRpm!,
                      power: lowIdlePoint.correctedPower || 0,
                      torque: lowIdlePoint.correctedTorque || 0,
                      label: `Low Idle [No Load] (${lowIdlePoint.targetRpm} RPM Target)`,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  <line
                    x1={getX(lowIdlePoint.actualRpm)}
                    y1={padding.top + 30}
                    x2={getX(lowIdlePoint.actualRpm)}
                    y2={padding.top + plotHeight}
                    stroke={isPrintMode ? '#64748b' : '#94a3b8'}
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <circle
                    cx={getX(lowIdlePoint.actualRpm)}
                    cy={padding.top + plotHeight}
                    r="4.5"
                    fill={isPrintMode ? '#ffffff' : '#0f172a'}
                    stroke={isPrintMode ? '#475569' : '#94a3b8'}
                    strokeWidth="2"
                  />
                  <text
                    x={getX(lowIdlePoint.actualRpm)}
                    y={padding.top + 14}
                    textAnchor="middle"
                    fill={isPrintMode ? '#475569' : '#cbd5e1'}
                    className="text-[8.5px] font-bold"
                  >
                    Low Idle ({lowIdlePoint.actualRpm} RPM)
                  </text>
                  <text
                    x={getX(lowIdlePoint.actualRpm)}
                    y={padding.top + 24}
                    textAnchor="middle"
                    fill={isPrintMode ? '#64748b' : '#94a3b8'}
                    className="text-[7.5px]"
                  >
                    [No Load]
                  </text>
                </g>
              )}

              {/* NO LOAD: High Idle Annotation & Drop Line */}
              {highIdlePoint && highIdlePoint.actualRpm !== undefined && (
                <g
                  onMouseEnter={() =>
                    setHoveredPoint({
                      rpm: highIdlePoint.actualRpm!,
                      power: highIdlePoint.correctedPower || 0,
                      torque: highIdlePoint.correctedTorque || 0,
                      label: `High Idle [No Load] (${highIdlePoint.targetRpm} RPM Target)`,
                    })
                  }
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                >
                  <line
                    x1={getX(highIdlePoint.actualRpm)}
                    y1={padding.top + 30}
                    x2={getX(highIdlePoint.actualRpm)}
                    y2={padding.top + plotHeight}
                    stroke={isPrintMode ? '#64748b' : '#94a3b8'}
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <circle
                    cx={getX(highIdlePoint.actualRpm)}
                    cy={padding.top + plotHeight}
                    r="4.5"
                    fill={isPrintMode ? '#ffffff' : '#0f172a'}
                    stroke={isPrintMode ? '#475569' : '#94a3b8'}
                    strokeWidth="2"
                  />
                  <text
                    x={getX(highIdlePoint.actualRpm)}
                    y={padding.top + 14}
                    textAnchor="middle"
                    fill={isPrintMode ? '#475569' : '#cbd5e1'}
                    className="text-[8.5px] font-bold"
                  >
                    High Idle ({highIdlePoint.actualRpm} RPM)
                  </text>
                  <text
                    x={getX(highIdlePoint.actualRpm)}
                    y={padding.top + 24}
                    textAnchor="middle"
                    fill={isPrintMode ? '#64748b' : '#94a3b8'}
                    className="text-[7.5px]"
                  >
                    [No Load]
                  </text>
                </g>
              )}

              {/* RATED POWER HIGHLIGHT */}
              {ratedPowerResult && ratedPowerResult.correctedHp !== undefined && (
                <g>
                  <line
                    x1={getX(ratedPowerResult.actualRpm)}
                    y1={padding.top}
                    x2={getX(ratedPowerResult.actualRpm)}
                    y2={padding.top + plotHeight}
                    stroke={isPrintMode ? '#1e40af' : '#38bdf8'}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                  <circle
                    cx={getX(ratedPowerResult.actualRpm)}
                    cy={getYPower(ratedPowerResult.correctedHp)}
                    r="7"
                    fill={isPrintMode ? '#1e40af' : '#0284c7'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              )}

              {/* RATED TORQUE HIGHLIGHT */}
              {ratedTorqueResult && ratedTorqueResult.correctedTorque !== undefined && (
                <g>
                  <line
                    x1={getX(ratedTorqueResult.actualRpm)}
                    y1={padding.top}
                    x2={getX(ratedTorqueResult.actualRpm)}
                    y2={padding.top + plotHeight}
                    stroke={isPrintMode ? '#d97706' : '#fbbf24'}
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                  <circle
                    cx={getX(ratedTorqueResult.actualRpm)}
                    cy={getYTorque(ratedTorqueResult.correctedTorque)}
                    r="7"
                    fill={isPrintMode ? '#d97706' : '#f59e0b'}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                  />
                </g>
              )}
            </svg>
          </div>

          {/* Rated Point Results Cards */}
          {(ratedPowerResult || ratedTorqueResult) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Rated Power Result */}
              {ratedPowerResult && (
                <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-sky-800 tracking-wider block">
                      Rated Power (Reference: {ratedPowerResult.targetRpm} RPM)
                    </span>
                    <span className="text-sm font-black font-mono text-sky-950">
                      {ratedPowerResult.correctedHp?.toFixed(1) ?? '-'} HP @ {ratedPowerResult.actualRpm} RPM
                    </span>
                    <span className="text-[9.5px] text-sky-700 block mt-0.5 font-mono">
                      Measured at actual {ratedPowerResult.actualRpm} RPM
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-sky-200/80 text-sky-900 font-mono font-black rounded text-[10.5px]">
                    Rated Power
                  </span>
                </div>
              )}

              {/* Rated Torque Result */}
              {ratedTorqueResult && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider block">
                      Rated Torque (Reference: {ratedTorqueResult.targetRpm} RPM)
                    </span>
                    <span className="text-sm font-black font-mono text-amber-950">
                      {ratedTorqueResult.correctedTorque?.toFixed(1) ?? '-'} kgm @ {ratedTorqueResult.actualRpm} RPM
                    </span>
                    <span className="text-[9.5px] text-amber-700 block mt-0.5 font-mono">
                      Measured at actual {ratedTorqueResult.actualRpm} RPM
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-amber-200/80 text-amber-900 font-mono font-black rounded text-[10.5px]">
                    Rated Torque
                  </span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )}

      {/* VIEW 2: SENSOR GAUGES & BANK BALANCE */}
      {activeTab === 'gauges' && !isPrintMode && (
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bank Balance: Exhaust Temp (RH vs LH Bank) */}
            <div className="space-y-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">
                  Exhaust Temp Balance (RH vs LH Bank)
                </span>
                <span className="text-[10px] text-slate-500">Max {exhMax}°C</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-0.5">
                    <span>RH Bank</span>
                    <span
                      className={
                        exhRh <= exhMax
                          ? 'text-blue-900 font-mono font-bold'
                          : 'text-rose-600 font-mono font-bold'
                      }
                    >
                      {exhRh || '-'}°C
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        exhRh <= exhMax ? 'bg-blue-600' : 'bg-rose-600'
                      }`}
                      style={{ width: `${Math.min(100, (exhRh / (exhMax + 50)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-0.5">
                    <span>LH Bank</span>
                    <span
                      className={
                        exhLh <= exhMax
                          ? 'text-blue-900 font-mono font-bold'
                          : 'text-rose-600 font-mono font-bold'
                      }
                    >
                      {exhLh || '-'}°C
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        exhLh <= exhMax ? 'bg-indigo-600' : 'bg-rose-600'
                      }`}
                      style={{ width: `${Math.min(100, (exhLh / (exhMax + 50)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Bank Balance: Boost Pressure (RH vs LH) */}
            <div className="space-y-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800">
                  Boost Pressure Balance (RH vs LH)
                </span>
                <span className="text-[10px] text-slate-500">Min {boostMin} mmHg</span>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-0.5">
                    <span>RH Boost</span>
                    <span
                      className={
                        boostRh >= boostMin
                          ? 'text-blue-900 font-mono font-bold'
                          : 'text-rose-600 font-mono font-bold'
                      }
                    >
                      {boostRh || '-'} mmHg
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        boostRh >= boostMin ? 'bg-blue-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (boostRh / (boostMin * 1.3)) * 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-0.5">
                    <span>LH Boost</span>
                    <span
                      className={
                        boostLh >= boostMin
                          ? 'text-blue-900 font-mono font-bold'
                          : 'text-rose-600 font-mono font-bold'
                      }
                    >
                      {boostLh || '-'} mmHg
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        boostLh >= boostMin ? 'bg-indigo-600' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, (boostLh / (boostMin * 1.3)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Gauge Status Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="block text-[9px] uppercase font-bold text-slate-500">Oil Press High</span>
              <span className="text-xs font-bold font-mono text-slate-900">
                {oilPressHigh?.actualValue || '-'} <span className="text-[9px] font-normal text-slate-500">{oilPressHigh?.unit}</span>
              </span>
              <span className="block text-[8.5px] text-emerald-700 font-medium mt-0.5">Spec: 3.0 ~ 4.5</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="block text-[9px] uppercase font-bold text-slate-500">Oil Temp</span>
              <span className="text-xs font-bold font-mono text-slate-900">
                {oilTemp?.actualValue || '-'} <span className="text-[9px] font-normal text-slate-500">{oilTemp?.unit}</span>
              </span>
              <span className="block text-[8.5px] text-emerald-700 font-medium mt-0.5">Spec: 90 ~ 110°C</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="block text-[9px] uppercase font-bold text-slate-500">Coolant Temp</span>
              <span className="text-xs font-bold font-mono text-slate-900">
                {coolantTemp?.actualValue || '-'} <span className="text-[9px] font-normal text-slate-500">{coolantTemp?.unit}</span>
              </span>
              <span className="block text-[8.5px] text-emerald-700 font-medium mt-0.5">Spec: 70 ~ 90°C</span>
            </div>

            <div className="p-2 bg-slate-50 rounded-lg border border-slate-200/80">
              <span className="block text-[9px] uppercase font-bold text-slate-500">Blowby Press</span>
              <span className="text-xs font-bold font-mono text-slate-900">
                {blowby?.actualValue || '-'} <span className="text-[9px] font-normal text-slate-500">{blowby?.unit}</span>
              </span>
              <span className="block text-[8.5px] text-emerald-700 font-medium mt-0.5">Spec: Max 300</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

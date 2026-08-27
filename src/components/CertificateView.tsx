import React, { useState } from 'react';
import {
  Download,
  Printer,
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Award,
  Cloud,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileCheck,
  Check,
} from 'lucide-react';
import { TestRecord } from '../types';
import { PerformanceChart } from './PerformanceChart';
import { downloadCertificatePDF } from '../utils/pdfGenerator';
import { downloadDynoRecordJSON } from '../services/googleDrive';
import confetti from 'canvas-confetti';
import { KomatsuLogo } from './KomatsuLogo';

interface CertificateViewProps {
  record: TestRecord;
  onClose: () => void;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ record, onClose }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [jsonExportSuccess, setJsonExportSuccess] = useState(false);
  const [includeGraph, setIncludeGraph] = useState(true);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const isApproved = record.workflowStatus === 'APPROVED';
  const isPass = record.overallResult === 'PASS';

  const cleanModel = (record.typeModel || 'MODEL').replace(/[^a-zA-Z0-9-_]/g, '_');
  const cleanSerial = (record.serialNumber || 'SN').replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${record.certificateNumber || 'KRA-DYNO-CERT'}_${cleanModel}_${cleanSerial}.pdf`;

  const totalPages = includeGraph ? 2 : 1;

  const handleExportJSON = () => {
    const success = downloadDynoRecordJSON(record);
    if (success) {
      setJsonExportSuccess(true);
      setTimeout(() => setJsonExportSuccess(false), 4000);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadSuccess(false);

    try {
      const success = await downloadCertificatePDF('kra-official-certificate-container', filename);
      if (success) {
        setDownloadSuccess(true);
        if (isPass) {
          confetti({
            particleCount: 60,
            spread: 60,
            origin: { y: 0.7 },
          });
        }
        setTimeout(() => setDownloadSuccess(false), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="certificate-modal-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="certificate-modal-container bg-slate-100 rounded-xl shadow-2xl max-w-5xl w-full my-auto overflow-hidden flex flex-col max-h-[96vh] print:max-h-none print:shadow-none print:bg-white print:rounded-none">
        
        {/* Top Control Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 print:hidden border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold tracking-wide">
                  Official A4 Certificate Preview & Export
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1">
                  <Check className="w-3 h-3" /> A4 Safe Margin 15mm
                </span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {record.certificateNumber} • {record.typeModel} (S/N: {record.serialNumber}) • {totalPages} {totalPages > 1 ? 'Pages' : 'Page'}
              </span>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Include Graph Toggle */}
            <label className="text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer bg-slate-800 px-2.5 py-1.5 rounded-md hover:bg-slate-700 transition-colors">
              <input
                type="checkbox"
                checked={includeGraph}
                onChange={(e) => setIncludeGraph(e.target.checked)}
                className="rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span className="font-medium">Include Graph ({includeGraph ? '2 Pages' : '1 Page'})</span>
            </label>

            {/* Zoom Controls for Preview */}
            <div className="hidden md:flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(60, z - 10))}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono font-semibold px-1.5 text-slate-300 min-w-[38px] text-center">
                {zoomLevel}%
              </span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(130, z + 10))}
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(100)}
                className="p-1 text-slate-400 hover:text-white rounded border-l border-slate-700 ml-0.5 pl-1.5 transition-colors"
                title="Reset to 100% A4 Scale"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export JSON Button */}
            <button
              id="btn-export-cert-json"
              type="button"
              onClick={handleExportJSON}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center gap-1.5 transition-colors border border-slate-700"
              title="Export Certificate Data JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              Export JSON
            </button>

            {/* Print Button */}
            <button
              id="btn-print-cert"
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-md flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>

            {/* Download PDF Button */}
            <button
              id="btn-download-cert-pdf"
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3.5 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-blue-950 rounded-md flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {isDownloading ? 'Generating PDF...' : 'Download PDF'}
            </button>

            {/* Close Button */}
            <button
              id="btn-close-cert-modal"
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {downloadSuccess && (
          <div className="bg-emerald-600 text-white text-xs px-4 py-2 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Certificate PDF downloaded successfully in standard A4 format: {filename}
            </span>
            <button onClick={() => setDownloadSuccess(false)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {jsonExportSuccess && (
          <div className="bg-blue-600 text-white text-xs px-4 py-2 flex items-center justify-between print:hidden">
            <span className="flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" /> Certificate JSON data exported successfully!
            </span>
            <button onClick={() => setJsonExportSuccess(false)} className="text-blue-200 hover:text-white cursor-pointer">✕</button>
          </div>
        )}

        {/* Certificate Scrollable Preview Area */}
        <div className="certificate-scroll-area flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 print:p-0 print:bg-white print:overflow-visible flex flex-col items-center gap-6">
          
          <div
            id="kra-official-certificate-container"
            className="w-full flex flex-col items-center gap-6 print:gap-0 print:block"
            style={{
              transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : undefined,
              transformOrigin: 'top center',
              transition: 'transform 0.15s ease-out',
            }}
          >
            {/* ========================================================================= */}
            {/* PAGE 1: OFFICIAL CERTIFICATE HEADER, PRODUCT INFO & PARAMETERS TABLE     */}
            {/* ========================================================================= */}
            <div
              id="cert-page-1"
              className="certificate-a4-page bg-white text-slate-900 shadow-xl print:shadow-none border border-slate-300 print:border-none relative flex flex-col justify-between"
              style={{
                width: '210mm',
                minHeight: '297mm',
                padding: '15mm',
                boxSizing: 'border-box',
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              {/* Page Background Watermark for NON-APPROVED or FAIL */}
              {!isApproved && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-10 rotate-[-30deg]">
                  <span className="text-6xl sm:text-7xl font-black uppercase border-8 border-amber-600 text-amber-800 px-8 py-2 rounded-2xl tracking-widest">
                    {record.workflowStatus.replace('_', ' ')}
                  </span>
                </div>
              )}

              {isApproved && !isPass && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-15 rotate-[-30deg]">
                  <span className="text-6xl sm:text-7xl font-black uppercase border-8 border-rose-600 text-rose-800 px-8 py-2 rounded-2xl tracking-widest">
                    FAILED INSPECTION
                  </span>
                </div>
              )}

              {/* Main Content of Page 1 */}
              <div className="flex-1 flex flex-col">
                {/* Official Corporate Header */}
                <div className="border-b-2 border-blue-950 pb-3 mb-3">
                  <div className="flex items-start justify-between gap-4">
                    {/* Official Komatsu Reman Brandmark */}
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-32 bg-white rounded border border-slate-300 p-1 flex items-center justify-center shrink-0 shadow-2xs">
                        <KomatsuLogo variant="full" className="w-full h-full" />
                      </div>
                      <div>
                        <h1 className="text-[14px] font-black tracking-wide text-blue-950 uppercase leading-tight">
                          PT KOMATSU REMANUFACTURING ASIA
                        </h1>
                        <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                          Jl. Pulau Balang No. 99, Karang Joang, Balikpapan 76127, East Kalimantan - Indonesia
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium">
                          Quality Assurance Department • ISO 9001-2015 Certified
                        </p>
                      </div>
                    </div>

                    {/* Certificate Number & Date Card */}
                    <div className="text-right shrink-0">
                      <div className="inline-block bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-right">
                        <span className="block text-[8px] uppercase font-bold text-slate-500 tracking-wider">
                          Certificate No.
                        </span>
                        <span className="font-mono text-xs font-black text-blue-950">
                          {record.certificateNumber}
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-600 mt-0.5">
                        Date: <strong className="text-slate-900 font-semibold">{record.testDate || '-'}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Certificate Title Banner */}
                  <div className="text-center mt-2 pt-2 border-t border-slate-200">
                    <h2 className="text-[13px] font-black tracking-wider text-blue-950 uppercase">
                      SERTIFIKAT UJI KUALITAS PRODUK
                    </h2>
                    <h3 className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">
                      PRODUCT QUALITY TEST CERTIFICATE (DYNO TEST BENCH)
                    </h3>
                  </div>
                </div>

                {/* Section 1: PRODUCT & TEST IDENTIFICATION */}
                <div className="mb-3 print-avoid-break">
                  <div className="bg-blue-950 text-white px-2.5 py-1 rounded-t flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      1. INFORMASI PRODUK / PRODUCT INFORMATION
                    </span>
                    <span className="text-[9px] text-amber-300 font-mono font-medium">
                      Test Bench: {record.testBenchCode || 'TB-01'}
                    </span>
                  </div>
                  <div className="border border-t-0 border-slate-300 p-2.5 bg-slate-50/60 rounded-b">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10.5px]">
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Nama Produk / Product Name:</span>
                        <strong className="text-slate-900 font-bold">{record.productName || 'ENGINE ASSY'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Job Order No:</span>
                        <strong className="text-blue-950 font-mono font-bold">{record.jobOrder || '-'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Tipe / Model:</span>
                        <strong className="text-slate-900 font-bold">{record.typeModel || '-'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Serial Number:</span>
                        <strong className="text-blue-950 font-mono font-bold">{record.serialNumber || '-'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Comp. Part Number:</span>
                        <strong className="text-slate-900 font-mono">{record.componentPartNumber || '-'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Machine Model:</span>
                        <strong className="text-slate-900 font-semibold">{record.machineModel || '-'}</strong>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Dyno Test Bench:</span>
                        <span className="text-slate-800">{record.testBenchName || 'Dyno Test Bench 01'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/80 pb-0.5">
                        <span className="text-slate-600 font-medium">Tanggal Pengujian / Test Date:</span>
                        <strong className="text-slate-900">{record.testDate || '-'}</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: PERFORMANCE TEST RESULTS PARAMETER TABLE */}
                <div className="mb-3 print-avoid-break">
                  <div className="bg-blue-950 text-white px-2.5 py-1 rounded-t flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      2. HASIL PENGUJIAN PERFORMANCE / PERFORMANCE TEST RESULTS
                    </span>
                    <span className="text-[9px] text-slate-300 font-medium">
                      Total: {record.totalParameters || record.results.length} Parameters Evaluated
                    </span>
                  </div>

                  <div className="border border-t-0 border-slate-300 rounded-b overflow-hidden">
                    <table className="w-full text-left text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 text-[9.5px] text-slate-800 font-bold uppercase">
                          <th className="py-1.5 px-2 text-center w-7 border-r border-slate-200">No</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-200">Parameter Uji / Test Parameter</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-200">Spesifikasi Standar / Specification</th>
                          <th className="py-1.5 px-2 text-center w-14 border-r border-slate-200">Unit</th>
                          <th className="py-1.5 px-2.5 border-r border-slate-200">Hasil Uji Aktual / Actual Result</th>
                          <th className="py-1.5 px-2 text-center w-16">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {record.results.map((item, idx) => {
                          const isEven = idx % 2 === 1;
                          return (
                            <tr key={item.parameterId || idx} className={isEven ? 'bg-slate-50/50' : 'bg-white'}>
                              <td className="py-1 px-2 text-center font-mono text-slate-500 font-semibold border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-1 px-2.5 font-bold text-slate-900 border-r border-slate-200">
                                {item.parameterName}
                              </td>
                              <td className="py-1 px-2.5 font-medium text-slate-700 border-r border-slate-200">
                                {item.specText || '-'}
                              </td>
                              <td className="py-1 px-2 text-center text-slate-600 font-medium border-r border-slate-200">
                                {item.unit || '-'}
                              </td>
                              <td className="py-1 px-2.5 font-mono border-r border-slate-200">
                                {item.hasRhLh ? (
                                  <div className="flex gap-2">
                                    <span>
                                      RH: <strong className="text-slate-900">{item.actualRh ?? '-'}</strong>
                                    </span>
                                    <span className="text-slate-300">|</span>
                                    <span>
                                      LH: <strong className="text-slate-900">{item.actualLh ?? '-'}</strong>
                                    </span>
                                  </div>
                                ) : (
                                  <strong className="text-slate-900 font-bold">
                                    {item.actualValue !== undefined && item.actualValue !== ''
                                      ? String(item.actualValue)
                                      : '-'}
                                  </strong>
                                )}
                              </td>
                              <td className="py-1 px-2 text-center">
                                {item.status === 'PASS' ? (
                                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-black rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    PASS
                                  </span>
                                ) : item.status === 'FAIL' ? (
                                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-black rounded bg-rose-100 text-rose-800 border border-rose-300">
                                    FAIL
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.2 text-[9px] font-medium rounded bg-slate-100 text-slate-700">
                                    PENDING
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Section 2B: ENGINE PERFORMANCE RESULT SUMMARY */}
                {(record.ratedPowerResult || record.ratedTorqueResult || record.performanceData || record.dynProFile) && (
                  <div className="mb-3 print-avoid-break">
                    <div className="bg-slate-900 text-white px-2.5 py-1 rounded-t flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                        2B. HASIL UJI KINERJA MESIN / ENGINE PERFORMANCE RESULTS
                      </span>
                      <span className="text-[9px] font-mono text-slate-300">
                        JIS D 1005 Correction Factor: {record.jisFactor?.toFixed(3) || '1.000'}
                      </span>
                    </div>
                    <div className="border border-t-0 border-slate-300 p-2.5 bg-slate-50/80 rounded-b space-y-1.5 text-[10.5px]">
                      <div className="grid grid-cols-2 gap-2.5">
                        {record.ratedPowerResult && (
                          <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">
                                Rated Power (Ref: {record.ratedPowerResult.targetRpm} RPM)
                              </span>
                              <span className="text-sm font-black font-mono text-blue-950">
                                {record.ratedPowerResult.correctedHp?.toFixed(1) ?? '-'} HP
                              </span>
                              <span className="text-[8.5px] text-slate-500 block font-mono">
                                Measured at {record.ratedPowerResult.actualRpm} RPM
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-900 font-mono font-bold text-[9.5px] border border-blue-200">
                              Power (HP)
                            </span>
                          </div>
                        )}

                        {record.ratedTorqueResult && (
                          <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="text-[9px] font-bold text-slate-500 block uppercase tracking-wider">
                                Rated Torque (Ref: {record.ratedTorqueResult.targetRpm} RPM)
                              </span>
                              <span className="text-sm font-black font-mono text-amber-950">
                                {record.ratedTorqueResult.correctedTorque?.toFixed(1) ?? '-'} kg·m
                              </span>
                              <span className="text-[8.5px] text-slate-500 block font-mono">
                                Measured at {record.ratedTorqueResult.actualRpm} RPM
                              </span>
                            </div>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-mono font-bold text-[9.5px] border border-amber-200">
                              Torque (kg·m)
                            </span>
                          </div>
                        )}
                      </div>

                      {record.dynProFile && (
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[9px] text-slate-600">
                          <span className="flex items-center gap-1.5 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Taylor Dyno Log: <strong className="text-slate-800">{record.dynProFile.fileName}</strong>
                          </span>
                          <span className="text-slate-400 font-mono">Traceability ID: DYN-{record.certificateNumber.replace(/[^a-zA-Z0-9]/g, '')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* If Graph is Excluded, include Conclusion and Signatures on Page 1 */}
                {!includeGraph && (
                  <>
                    {/* Quality Conclusion */}
                    <div className="mb-3 border border-slate-300 rounded p-2.5 bg-slate-50 print-avoid-break">
                      <div className="flex items-start gap-2.5">
                        <div className={`p-1.5 rounded-full mt-0.5 ${isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {isPass ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <h4 className="text-[11px] font-bold tracking-wider text-blue-950 uppercase">
                              KESIMPULAN UJI MUTU / QUALITY CONCLUSION
                            </h4>
                            <span
                              className={`text-[10px] font-black px-2 py-0.2 rounded border uppercase ${
                                isPass ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
                              }`}
                            >
                              {isPass ? 'PASSED (LULUS)' : 'FAILED (TIDAK LULUS)'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-700 leading-relaxed">
                            {isPass
                              ? 'Produk ini telah melalui proses uji inspeksi dan verifikasi mutu Dyno Test Bench. Berdasarkan hasil pengujian seluruh parameter, produk DINYATAKAN LULUS dan memenuhi standar kualitas spesifikasi PT. Komatsu Remanufacturing Asia.'
                              : 'Produk ini TIDAK LULUS berdasarkan hasil pengujian Dyno Test Bench. Silakan review parameter yang berstatus FAIL dan lakukan tindakan korektif / re-test.'}
                          </p>
                          {record.remarks && (
                            <div className="mt-1 text-[9px] text-slate-500">
                              <strong>Remarks:</strong> {record.remarks}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Signatures & Seal */}
                    <div className="grid grid-cols-3 gap-3 border-t-2 border-slate-300 pt-2 items-end text-center text-[10px] print-avoid-break">
                      {/* Tester */}
                      <div className="border border-slate-200 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[110px]">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                          Diuji Oleh / Tested by:
                        </span>
                        <div className="my-auto py-1 flex items-center justify-center min-h-[40px]">
                          {record.testerSignature ? (
                            <img src={record.testerSignature} alt="QC Signature" className="max-h-10 max-w-[120px] object-contain mx-auto" />
                          ) : (
                            <span className="text-[10px] italic text-slate-400">Digital Signature</span>
                          )}
                        </div>
                        <div>
                          <strong className="block text-slate-900 font-bold text-[10px]">{record.testerName || 'QC Tester'}</strong>
                          <span className="block text-[8.5px] text-slate-500">NIK: {record.testerEmployeeId || '-'}</span>
                        </div>
                      </div>

                      {/* Seal */}
                      <div className="flex flex-col items-center justify-center p-1">
                        <div className="w-14 h-14 border-2 border-dashed border-blue-900 rounded-full flex flex-col items-center justify-center p-1 bg-blue-50/60">
                          <ShieldCheck className="w-5 h-5 text-blue-900" />
                          <span className="text-[6.5px] font-bold text-blue-950 uppercase tracking-tighter">KRA QC SEAL</span>
                        </div>
                        <span className="block text-[7.5px] font-mono text-slate-500 mt-1">Doc ID: {record.id}</span>
                      </div>

                      {/* Supervisor */}
                      <div className="border border-slate-200 rounded p-2 bg-slate-50/50 flex flex-col justify-between min-h-[110px]">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                          Disetujui Oleh / Approved by:
                        </span>
                        <div className="my-auto py-1 flex items-center justify-center min-h-[40px]">
                          {record.supervisorSignature ? (
                            <img src={record.supervisorSignature} alt="Supervisor Signature" className="max-h-10 max-w-[120px] object-contain mx-auto" />
                          ) : (
                            <span className="text-[10px] italic text-slate-400">{isApproved ? 'Digital Signature' : 'Waiting Approval'}</span>
                          )}
                        </div>
                        <div>
                          <strong className="block text-slate-900 font-bold text-[10px]">{record.supervisorName || (isApproved ? 'QC Supervisor' : 'Pending Approval')}</strong>
                          <span className="block text-[8.5px] text-slate-500">NIK: {record.supervisorEmployeeId || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Page 1 Official Footer */}
              <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500 print-avoid-break">
                <span>PT Komatsu Remanufacturing Asia - Engine Quality Test Bench</span>
                <span className="font-semibold text-slate-700">Form KRA-QC-DYNO-F01 Rev.03</span>
                <span>Halaman 1 dari {totalPages} / Page 1 of {totalPages}</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* PAGE 2: PERFORMANCE GRAPH, CONCLUSION & OFFICIAL SIGNATURES (IF GRAPH ON) */}
            {/* ========================================================================= */}
            {includeGraph && (
              <div
                id="cert-page-2"
                className="certificate-a4-page bg-white text-slate-900 shadow-xl print:shadow-none border border-slate-300 print:border-none relative flex flex-col justify-between"
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  padding: '15mm',
                  boxSizing: 'border-box',
                  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {/* Main Content of Page 2 */}
                <div className="flex-1 flex flex-col">
                  {/* Page 2 Continuation Header */}
                  <div className="border-b-2 border-blue-950 pb-2.5 mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-24 bg-white rounded border border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                        <KomatsuLogo variant="full" className="w-full h-full" />
                      </div>
                      <div>
                        <h2 className="text-[11px] font-black text-blue-950 uppercase tracking-wide">
                          PRODUCT QUALITY TEST CERTIFICATE — PERFORMANCE EVALUATION
                        </h2>
                        <p className="text-[8.5px] text-slate-500">
                          PT Komatsu Remanufacturing Asia • Quality Assurance Department
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block">
                        Certificate Ref.
                      </span>
                      <span className="font-mono text-[10.5px] font-bold text-blue-950">
                        {record.certificateNumber} ({record.typeModel} - S/N: {record.serialNumber})
                      </span>
                    </div>
                  </div>

                  {/* Section 3: PERFORMANCE GRAPH */}
                  <div className="mb-4 print-avoid-break">
                    <div className="bg-blue-950 text-white px-2.5 py-1 rounded-t flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider">
                        3. GRAFIK KINERJA MESIN / ENGINE PERFORMANCE CURVE
                      </span>
                      <span className="text-[9px] text-slate-300 font-mono">
                        Power (HP) & Torque (kg·m) vs RPM
                      </span>
                    </div>
                    <div className="border border-t-0 border-slate-300 p-2.5 bg-white rounded-b">
                      <PerformanceChart
                        results={record.results}
                        performanceData={record.performanceData}
                        samplingPoints={record.samplingPoints}
                        jisFactor={record.jisFactor}
                        ratedPowerResult={record.ratedPowerResult}
                        ratedTorqueResult={record.ratedTorqueResult}
                        modelName={record.typeModel}
                        isPrintMode={true}
                      />
                    </div>
                  </div>

                  {/* Section 4: QUALITY CONCLUSION & EVALUATION */}
                  <div className="mb-4 border border-slate-300 rounded p-3 bg-slate-50 print-avoid-break">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-full mt-0.5 shrink-0 ${
                          isPass ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isPass ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-[11.5px] font-bold tracking-wider text-blue-950 uppercase">
                            4. KESIMPULAN UJI MUTU / QUALITY CONCLUSION
                          </h4>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded border uppercase tracking-wider ${
                              isPass
                                ? 'bg-emerald-600 text-white border-emerald-700'
                                : 'bg-rose-600 text-white border-rose-700'
                            }`}
                          >
                            {isPass ? 'PASSED (LULUS)' : 'FAILED (TIDAK LULUS)'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-700 leading-relaxed">
                          {isPass
                            ? 'Produk ini telah melalui proses uji inspeksi dan verifikasi mutu Dyno Test Bench. Berdasarkan hasil pengujian seluruh parameter, produk DINYATAKAN LULUS dan memenuhi standar kualitas spesifikasi PT. Komatsu Remanufacturing Asia.'
                            : 'Produk ini TIDAK LULUS berdasarkan hasil pengujian Dyno Test Bench. Silakan review parameter yang berstatus FAIL dan lakukan tindakan korektif / re-test sebelum unit diserahkan ke proses selanjutnya.'}
                        </p>
                        {record.rejectionReason && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[10px] text-rose-700">
                            <strong>Catatan Supervisor / Rejection Reason:</strong> {record.rejectionReason}
                          </div>
                        )}
                        {record.remarks && !record.rejectionReason && (
                          <div className="mt-1 text-[9.5px] text-slate-500">
                            <strong>Remarks:</strong> {record.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Section 5: SIGNATURES & VERIFICATION BLOCK */}
                  <div className="border-t-2 border-slate-300 pt-3 mb-2 print-avoid-break">
                    <span className="block text-[9.5px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                      5. PENGESAHAN HASIL UJI / TEST APPROVAL & VERIFICATION
                    </span>
                    <div className="grid grid-cols-3 gap-3 items-end text-center text-[10px]">
                      {/* QC Tester Signature */}
                      <div className="border border-slate-200 rounded p-2.5 bg-slate-50/60 flex flex-col justify-between min-h-[125px]">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                          Diuji Oleh / Tested by:
                        </span>
                        <div className="my-auto py-1 flex items-center justify-center min-h-[45px]">
                          {record.testerSignature ? (
                            <img
                              src={record.testerSignature}
                              alt="QC Signature"
                              className="max-h-11 max-w-[130px] object-contain mx-auto"
                            />
                          ) : (
                            <span className="text-[10.5px] italic text-slate-400">Digital Signature</span>
                          )}
                        </div>
                        <div>
                          <strong className="block text-slate-900 font-bold text-[10.5px]">{record.testerName || 'QC Tester'}</strong>
                          <span className="block text-[9px] text-slate-500">NIK: {record.testerEmployeeId || '-'}</span>
                          <span className="block text-[8px] text-slate-400">Date: {record.testDate || '-'}</span>
                        </div>
                      </div>

                      {/* Security Seal & Verification */}
                      <div className="flex flex-col items-center justify-center p-2">
                        <div className="w-16 h-16 border-2 border-dashed border-blue-900 rounded-full flex flex-col items-center justify-center p-1 bg-blue-50/60 shadow-2xs">
                          <ShieldCheck className="w-6 h-6 text-blue-900" />
                          <span className="text-[7px] font-bold text-blue-950 uppercase tracking-tighter">
                            KRA QC SEAL
                          </span>
                        </div>
                        <div className="mt-1 text-center">
                          <span className="block text-[8px] font-mono text-slate-500">
                            Doc ID: {record.id}
                          </span>
                          <span className="block text-[7.5px] text-emerald-700 font-semibold">
                            {isApproved ? '● Digitally Signed & Locked' : '○ Pending Supervisor Sign'}
                          </span>
                        </div>
                      </div>

                      {/* Supervisor Approval Signature */}
                      <div className="border border-slate-200 rounded p-2.5 bg-slate-50/60 flex flex-col justify-between min-h-[125px]">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                          Disetujui Oleh / Approved by:
                        </span>
                        <div className="my-auto py-1 flex items-center justify-center min-h-[45px]">
                          {record.supervisorSignature ? (
                            <img
                              src={record.supervisorSignature}
                              alt="Supervisor Signature"
                              className="max-h-11 max-w-[130px] object-contain mx-auto"
                            />
                          ) : (
                            <span className="text-[10.5px] italic text-slate-400">
                              {isApproved ? 'Digital Signature' : 'Waiting Approval'}
                            </span>
                          )}
                        </div>
                        <div>
                          <strong className="block text-slate-900 font-bold text-[10.5px]">
                            {record.supervisorName || (isApproved ? 'QC Supervisor' : 'Pending Approval')}
                          </strong>
                          <span className="block text-[9px] text-slate-500">
                            {record.supervisorEmployeeId ? `NIK: ${record.supervisorEmployeeId}` : '-'}
                          </span>
                          <span className="block text-[8px] text-slate-400">
                            Date: {record.approvedAt ? record.approvedAt.split('T')[0] : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Page 2 Official Footer */}
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between text-[8.5px] text-slate-500 print-avoid-break">
                  <span>PT Komatsu Remanufacturing Asia - Heavy Equipment Engine Quality Assurance</span>
                  <span className="font-semibold text-slate-700">Form KRA-QC-DYNO-F01 Rev.03</span>
                  <span>Halaman 2 dari 2 / Page 2 of 2</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

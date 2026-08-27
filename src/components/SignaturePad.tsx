import React, { useRef, useState, useEffect } from 'react';
import { RotateCcw, PenTool, Type, Check } from 'lucide-react';

interface SignaturePadProps {
  initialSignature?: string;
  userName: string;
  employeeId?: string;
  onSave: (signatureData: string) => void;
  readOnly?: boolean;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  initialSignature,
  userName,
  employeeId,
  onSave,
  readOnly = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [mode, setMode] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState(userName || '');
  const [selectedFont, setSelectedFont] = useState<'cursive' | 'serif' | 'signature'>('signature');

  useEffect(() => {
    if (initialSignature && !hasDrawn && canvasRef.current && mode === 'draw') {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setHasDrawn(true);
        };
        img.src = initialSignature;
      }
    }
  }, [initialSignature, mode, hasDrawn]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f2e5a'; // KRA Navy
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      onSave(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSave('');
  };

  const generateTypedSignature = (text: string) => {
    if (!text.trim()) {
      onSave('');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0f2e5a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontStyle = 'italic 32px "Brush Script MT", "Caveat", "Segoe Script", cursive';
    if (selectedFont === 'serif') {
      fontStyle = 'italic 28px "Georgia", serif';
    } else if (selectedFont === 'signature') {
      fontStyle = 'italic 34px "Dancing Script", "Caveat", cursive';
    }

    ctx.font = fontStyle;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 - 10);

    // subtle underline
    ctx.beginPath();
    ctx.strokeStyle = '#0f2e5a';
    ctx.lineWidth = 1.5;
    ctx.moveTo(60, canvas.height / 2 + 20);
    ctx.lineTo(340, canvas.height / 2 + 20);
    ctx.stroke();

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedName(val);
    generateTypedSignature(val);
  };

  const handleApplyPreset = () => {
    generateTypedSignature(userName);
  };

  return (
    <div id="signature-pad-container" className="space-y-3">
      {!readOnly && (
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <button
              id="btn-sig-draw"
              type="button"
              onClick={() => setMode('draw')}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                mode === 'draw'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Draw Signature
            </button>
            <button
              id="btn-sig-type"
              type="button"
              onClick={() => {
                setMode('type');
                generateTypedSignature(typedName || userName);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                mode === 'type'
                  ? 'bg-blue-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Type Name
            </button>
          </div>

          {mode === 'draw' && (
            <button
              id="btn-sig-clear"
              type="button"
              onClick={clearCanvas}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-rose-50 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      )}

      {mode === 'draw' ? (
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg bg-white overflow-hidden shadow-inner">
          <canvas
            ref={canvasRef}
            width={400}
            height={140}
            className="w-full h-32 touch-none cursor-crosshair bg-slate-50/50"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
          {!hasDrawn && !readOnly && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-400">
              <PenTool className="w-5 h-5 mb-1 opacity-60" />
              <span className="text-xs font-medium">Draw signature here with mouse or touch</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <input
              id="input-typed-sig-name"
              type="text"
              value={typedName}
              onChange={handleTypeChange}
              placeholder="Enter full name for signature..."
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-800 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleApplyPreset}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md whitespace-nowrap"
            >
              Use My Name
            </button>
          </div>

          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col items-center justify-center min-h-[90px]">
            <p className="text-2xl italic font-serif text-blue-950 tracking-wider">
              {typedName || userName || 'Signature Preview'}
            </p>
            <div className="w-48 h-0.5 bg-blue-900/40 mt-2"></div>
            <span className="text-[11px] text-slate-500 mt-1">Verified Digital Signature</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span>Signer: <strong className="text-slate-800">{userName}</strong> {employeeId && `(${employeeId})`}</span>
        <span className="text-emerald-700 font-medium flex items-center gap-1">
          <Check className="w-3 h-3" /> Timestamp will be attached upon submit
        </span>
      </div>
    </div>
  );
};

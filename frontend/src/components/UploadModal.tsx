import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, FileText, Loader2, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-reset state whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setUploadResult(null);
      setError(null);
      setIsUploading(false);
    }
  }, [isOpen]);

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setError(null);
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await apiFetch('/upload', {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setUploadResult(data);
      onUploadSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0A0A0A] p-6 shadow-2xl relative">
        
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
            <UploadCloud className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Import Product Catalog File</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Supported formats: CSV, XLSX, XLS</p>
          </div>
        </div>

        {!uploadResult ? (
          <>
            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-white/20 hover:border-emerald-500/80 rounded-xl p-8 text-center bg-black/50 hover:bg-black/80 transition-all cursor-pointer mb-4"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
              />
              <FileText className="w-9 h-9 text-slate-400 mx-auto mb-2.5 opacity-80" />
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-emerald-400 mt-1 font-mono">{(file.size / 1024).toFixed(1)} KB — Ready to parse & ingest</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-200">Drag & drop your catalog file here, or <span className="text-emerald-400 underline font-semibold">browse</span></p>
                  <p className="text-xs text-slate-500 mt-1 font-mono">Accepts columns: Mfg_Part_Num, Part_Desc, Part_Manuf</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                onClick={handleClose}
                className="btn-secondary px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="btn-primary flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing & Importing...
                  </>
                ) : (
                  <>
                    Import into Catalog
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Upload Success View */
          <div>
            <div className="p-4 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-emerald-400">{uploadResult.message}</h4>
                <p className="text-xs text-slate-300 font-mono mt-0.5">Parsed successfully. Ingested {uploadResult.imported_count} catalog rows.</p>
              </div>
            </div>

            {/* Preview Table */}
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Ingested Preview ({uploadResult.filename})</h4>
            <div className="overflow-x-auto rounded-xl border border-white/10 max-h-56 mb-5 bg-black/50">
              <table className="w-full text-left text-xs font-mono text-slate-300">
                <thead className="bg-black/80 uppercase font-semibold text-slate-400 sticky top-0 text-[10px]">
                  <tr>
                    <th className="p-2.5 pl-3">Part Num</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Manufacturer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {uploadResult.preview_rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-white/[0.02]">
                      <td className="p-2.5 pl-3 font-mono text-white font-bold">{row.mfg_part_num}</td>
                      <td className="p-2.5 max-w-xs truncate">{row.part_desc}</td>
                      <td className="p-2.5 text-slate-400">{row.part_manuf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end items-center gap-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer flex items-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Upload Another File
              </button>
              <button
                onClick={handleClose}
                className="btn-primary px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Close & View Products
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default UploadModal;


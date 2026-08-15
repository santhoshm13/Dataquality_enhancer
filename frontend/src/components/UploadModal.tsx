import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

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
      const response = await fetch("http://127.0.0.1:8000/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Upload failed");
      }

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-800 p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Import Product Catalog File</h2>
            <p className="text-xs text-indigo-400 font-semibold mt-0.5">Supported formats: CSV, XLSX, XLS</p>
          </div>
        </div>

        {!uploadResult ? (
          <>
            {/* Drag & Drop Box */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/80 rounded-xl p-8 text-center bg-slate-900/40 hover:bg-slate-900/80 transition-all cursor-pointer mb-4"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                className="hidden"
              />
              <FileText className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-80" />
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-white">{file.name}</p>
                  <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB — Ready to parse with Pandas & import</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-200">Drag & drop your CSV or Excel file here, or <span className="text-indigo-400 underline">browse</span></p>
                  <p className="text-xs text-slate-500 mt-1">Supports CSV, XLSX, XLS containing Mfg_Part_Num, Part_Desc, Part_Manuf</p>
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || isUploading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing & Importing...
                  </>
                ) : (
                  <>
                    Import into PostgreSQL
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Upload Success & Preview View */
          <div>
            <div className="p-4 mb-5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-200">{uploadResult.message}</h4>
                  <p className="text-xs text-emerald-400/80">Parsed using Pandas. Imported {uploadResult.imported_count} rows into Supabase PostgreSQL.</p>
                </div>
              </div>
            </div>

            {/* Preview Table */}
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ingested Records Preview ({uploadResult.filename})</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-56 mb-6">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 uppercase font-semibold text-slate-400 sticky top-0">
                  <tr>
                    <th className="p-2.5">Part Num</th>
                    <th className="p-2.5">Description</th>
                    <th className="p-2.5">Manufacturer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/40">
                  {uploadResult.preview_rows.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-900/50">
                      <td className="p-2.5 font-mono text-indigo-300">{row.mfg_part_num}</td>
                      <td className="p-2.5 max-w-xs truncate">{row.part_desc}</td>
                      <td className="p-2.5 text-slate-400">{row.part_manuf}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all"
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

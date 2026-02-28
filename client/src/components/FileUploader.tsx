import React, { useState } from 'react';

export const FileUploader = ({ onUploadSuccess }: { onUploadSuccess: (file: File) => void }) => {
  const [file, setFile] = useState<File | null>(null);

  const handleProceed = () => {
    if (!file) return alert("Please select a PDF file");
    onUploadSuccess(file);
  };

  return (
    <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center max-w-md w-full">
      <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-4">1</div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Upload Document</h3>
      <p className="text-sm text-slate-500 mb-6 text-center">Your file stays in your browser memory for privacy.</p>
      
      <input 
        type="file" 
        accept="application/pdf"
        className="mb-6 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      
      <button 
        onClick={handleProceed}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg"
      >
        Proceed to Sign
      </button>
    </div>
  );
};
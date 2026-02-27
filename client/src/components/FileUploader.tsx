import React, { useState } from 'react';
import axios from 'axios';

// This pulls the URL from Vercel's Environment Variables
// It falls back to localhost only if the variable is missing
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const FileUploader = ({ onUploadSuccess }: { onUploadSuccess: (fileId: string) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Select a PDF");
    setLoading(true);

    try {
      // 1. Ensure Auth Token exists
      let token = localStorage.getItem('token');
      
      if (!token) {
        // UPDATED: Use dynamic API_BASE_URL
        const res = await axios.post(`${API_BASE_URL}/api/auth/login`, { 
          email: 'user@test.com' 
        });
        token = res.data.token;
        localStorage.setItem('token', token!);
      }

      // 2. Upload
      const formData = new FormData();
      formData.append('pdf', file);

      // UPDATED: Use dynamic API_BASE_URL
      const uploadRes = await axios.post(`${API_BASE_URL}/api/docs/upload`, formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data' 
        }
      });

      onUploadSuccess(uploadRes.data.fileId);
      alert("Document Uploaded Successfully!");
    } catch (e: any) {
      console.error("Full Error Info:", e.response?.data || e.message);
      alert(`Upload Failed: ${e.response?.data?.error || "Server connection error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
      <input 
        type="file" 
        accept=".pdf" 
        className="mb-4 text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" 
        onChange={(e) => setFile(e.target.files?.[0] || null)} 
      />
      <button 
        onClick={handleUpload} 
        disabled={loading}
        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-lg active:scale-95"
      >
        {loading ? "Connecting to Secure Server..." : "Upload & Sign"}
      </button>
    </div>
  );
};
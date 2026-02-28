import React, { useState } from 'react';
import axios from 'axios';

export const FileUploader = ({ onUploadSuccess }: { onUploadSuccess: (fileId: string) => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // LOGIC TO FIND THE CORRECT URL
  const getBackendUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL;
    // Remove trailing slash if it exists
    if (envUrl) return envUrl.replace(/\/$/, "");
    // Fallback for local development
    return "http://localhost:5000";
  };

  const handleUpload = async () => {
    if (!file) return alert("Select a PDF");
    const API_URL = getBackendUrl();
    
    setLoading(true);
    try {
      // 1. Login
      const loginRes = await axios.post(`${API_URL}/api/auth/login`, { email: 'user@test.com' });
      const token = loginRes.data.token;

      // 2. Upload
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await axios.post(`${API_URL}/api/docs/upload`, formData, {
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'multipart/form-data' 
        }
      });

      onUploadSuccess(response.data.fileId);
    } catch (error: any) {
      console.error("DEBUG:", error);
      // This will tell us the EXACT URL that failed
      alert(`CONNECTION FAILED!\nURL: ${API_URL}\nError: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
      <input type="file" accept=".pdf" className="mb-4" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} disabled={loading} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold">
        {loading ? "Connecting..." : "Upload & Sign"}
      </button>
      <p className="mt-4 text-[10px] text-gray-400">Current Target: {getBackendUrl()}</p>
    </div>
  );
};
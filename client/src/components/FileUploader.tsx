import React, { useState } from 'react';
import axios from 'axios';

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
        const res = await axios.post('http://localhost:5000/api/auth/login', { email: 'user@test.com' });
        token = res.data.token;
        localStorage.setItem('token', token!);
      }

      // 2. Upload
      const formData = new FormData();
      formData.append('pdf', file);
      const uploadRes = await axios.post('http://localhost:5000/api/docs/upload', formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      onUploadSuccess(uploadRes.data.fileId);
    } catch (e) {
      alert("Upload Failed. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-10 rounded-2xl shadow-xl border border-gray-100 flex flex-col items-center">
      <input type="file" accept=".pdf" className="mb-4" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      <button onClick={handleUpload} className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold">
        {loading ? "Uploading Securely..." : "Upload & Sign"}
      </button>
    </div>
  );
};
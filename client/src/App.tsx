import { useState, useEffect } from 'react'
import { FileUploader } from './components/FileUploader'
import { PdfEditor } from './components/PdfEditor'
import axios from 'axios'
import App from './App';

function App() {
  const [fileId, setFileId] = useState<string | null>(null);

  // Optional: Clean up token on first load to ensure fresh login
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {!fileId ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">Digital Signature</h1>
            <p className="text-slate-500">Enterprise document management system</p>
          </div>
          <FileUploader onUploadSuccess={(id) => setFileId(id)} />
        </div>
      ) : (
        <PdfEditor fileId={fileId} />
      )}
    </div>
  )
}

export default App
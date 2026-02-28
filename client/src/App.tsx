import { useState, useEffect } from 'react'
import { FileUploader } from './components/FileUploader'
import { PdfEditor } from './components/PdfEditor'

function App() {
  // NEW: Store the actual File object instead of just the ID string
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Clean up token on first load to ensure a fresh secure session
  useEffect(() => {
    localStorage.removeItem('token');
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {!selectedFile ? (
        // UPLOADER SCREEN
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-2 tracking-tight">
              Digital Signature
            </h1>
            <p className="text-slate-500 font-medium">
              Enterprise stateless document management system
            </p>
          </div>
          
          {/* On success, we save the actual file to state */}
          <FileUploader onUploadSuccess={(file) => setSelectedFile(file)} />
          
          <div className="mt-8 text-slate-400 text-xs flex gap-4">
            <span>✔ JWT Protected</span>
            <span>✔ No-Storage Privacy</span>
            <span>✔ Audit Ready</span>
          </div>
        </div>
      ) : (
        // EDITOR SCREEN
        // We pass the file and a way to go back
        <PdfEditor 
          file={selectedFile} 
          onBack={() => setSelectedFile(null)} 
        />
      )}
    </div>
  )
}

export default App;
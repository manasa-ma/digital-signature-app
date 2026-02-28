import { useState, useEffect } from 'react'
import { FileUploader } from './components/FileUploader'
import { PdfEditor } from './components/PdfEditor'

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    localStorage.removeItem('token'); // Fresh session on load
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {!selectedFile ? (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-extrabold text-slate-900 mb-2">Digital Signature</h1>
            <p className="text-slate-500">Enterprise stateless document management</p>
          </div>
          {/* We pass the actual file object up to App state */}
          <FileUploader onUploadSuccess={(file) => setSelectedFile(file)} />
        </div>
      ) : (
        <PdfEditor file={selectedFile} onBack={() => setSelectedFile(null)} />
      )}
    </div>
  )
}

export default App;
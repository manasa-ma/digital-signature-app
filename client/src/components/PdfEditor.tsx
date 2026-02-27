import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { SignatureModal } from './SignatureModal';
import { Loader2, Download, Move, XCircle, ShieldCheck } from 'lucide-react';

// Setup dynamic API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export const PdfEditor = ({ fileId }: { fileId: string }) => {
  const [status, setStatus] = useState('PENDING');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');
  
  // UPDATED: Use dynamic URL for PDF viewing
  const pdfUrl = `${API_BASE_URL}/uploads/${fileId}`;

  // Track Lifecycle Status
  useEffect(() => {
    // UPDATED: Use dynamic URL
    axios.get(`${API_BASE_URL}/api/docs/${fileId}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setStatus(res.data.status))
    .catch(err => console.error("Error fetching status:", err));
  }, [fileId, token]);

  const handleFinalize = async () => {
    try {
      // UPDATED: Use dynamic URL
      const res = await axios.post(`${API_BASE_URL}/api/signatures/finalize`, 
        { fileId, signatureData: signatureImg, x: position.x, y: position.y },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // The backend returns a full URL, but we ensure it's correct
      setSignedUrl(res.data.downloadUrl);
      setStatus('SIGNED');
      alert("Document Signed Successfully!");
    } catch (e) { 
      console.error(e);
      alert("Error signing document. Check console."); 
    }
  };

  const handleReject = async () => {
    if (!confirm("Reject this document? This action is permanent.")) return;
    try {
      // UPDATED: Use dynamic URL
      await axios.post(`${API_BASE_URL}/api/docs/${fileId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus('REJECTED');
    } catch (e) {
      alert("Error rejecting document.");
    }
  };

  return (
    <div className="flex flex-col items-center bg-slate-950 min-h-screen">
      {/* SaaS Header */}
      <div className="w-full bg-slate-900 p-4 border-b border-white/10 flex justify-between px-10 items-center">
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
            status === 'SIGNED' ? 'bg-green-500 text-white' : 
            status === 'REJECTED' ? 'bg-red-500 text-white' : 
            'bg-amber-500 text-black'
          }`}>
            {status}
          </span>
          <span className="text-white text-sm truncate max-w-[200px]">{fileId}</span>
        </div>

        <div className="flex gap-3">
          {status === 'PENDING' && (
            <>
              <button onClick={handleReject} className="text-red-500 text-xs font-bold px-4 hover:bg-red-500/10 rounded transition-colors">
                Reject
              </button>
              <button onClick={() => setIsModalOpen(true)} className="bg-white/10 text-white px-4 py-2 rounded text-xs hover:bg-white/20 transition-colors">
                ✍️ Signature
              </button>
              {signatureImg && (
                <button onClick={handleFinalize} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3" /> Verify & Sign
                </button>
              )}
            </>
          )}
          {status === 'SIGNED' && signedUrl && (
            <a href={signedUrl} target="_blank" rel="noreferrer" className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2 hover:bg-green-700 transition-all">
              <Download className="w-4 h-4" /> Download Signed PDF
            </a>
          )}
        </div>
      </div>

      {/* Workspace */}
      <div className="relative mt-10 p-10 overflow-auto max-w-full">
        {status === 'REJECTED' && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center text-white font-bold text-2xl backdrop-blur-sm">
                DOCUMENT REJECTED
            </div>
        )}
        
        <div 
          ref={containerRef} 
          onMouseMove={(e) => {
            if (isDragging && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setPosition({ x: e.clientX - rect.left - 75, y: e.clientY - rect.top - 25 });
            }
          }} 
          onMouseUp={() => setIsDragging(false)} 
          className={`relative bg-white shadow-2xl transition-all ${status === 'REJECTED' ? 'grayscale' : ''}`}
        >
          <Document 
            file={pdfUrl} 
            loading={<div className="p-20 flex flex-col items-center gap-4 text-slate-400 font-medium">
                <Loader2 className="animate-spin w-8 h-8 text-blue-500" />
                Loading PDF...
            </div>}
          >
            <Page pageNumber={1} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>

          {signatureImg && status === 'PENDING' && (
            <div 
                onMouseDown={() => setIsDragging(true)} 
                style={{ position: 'absolute', left: position.x, top: position.y }} 
                className="cursor-move border-2 border-dashed border-blue-500 bg-blue-50/50 group"
            >
                <div className="absolute -top-6 left-0 bg-blue-600 text-[8px] text-white px-1 rounded hidden group-hover:block">
                    Drag to position
                </div>
              <img src={signatureImg} className="w-[150px] h-[50px] pointer-events-none" alt="signature" />
            </div>
          )}
        </div>
      </div>
      
      {isModalOpen && (
        <SignatureModal 
            onSave={(data) => { setSignatureImg(data); setIsModalOpen(false); }} 
            onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};
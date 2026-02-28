import { useState, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { SignatureModal } from './SignatureModal';
import { Loader2, Download, CheckCircle, Shield } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export const PdfEditor = ({ file, onBack }: { file: File, onBack: () => void }) => {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [status, setStatus] = useState<'PENDING' | 'SIGNED'>('PENDING'); // STATUS STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedPdfB64, setSignedPdfB64] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const localPdfUrl = useMemo(() => URL.createObjectURL(file), [file]);

  const handleFinalize = async () => {
    if (!signatureImg) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Pdf = reader.result as string;
        
        // Ensure token exists
        let token = localStorage.getItem('token');
        if (!token) {
           const loginRes = await axios.post(`${API_BASE_URL}/api/auth/login`, {});
           token = loginRes.data.token;
           localStorage.setItem('token', token!);
        }

        const res = await axios.post(`${API_BASE_URL}/api/signatures/finalize`, {
          pdfData: base64Pdf,
          signatureData: signatureImg,
          x: position.x,
          y: position.y
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        setSignedPdfB64(res.data.signedPdf);
        setStatus('SIGNED'); // UPDATE STATUS TO SIGNED
        alert("Document Successfully Signed!");
      } catch (e: any) {
        console.error(e);
        alert(`Signing Failed: ${e.response?.data?.error || "PDF might be too large (>4MB)"}`);
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return (
    <div className="flex flex-col items-center bg-slate-950 min-h-screen">
      {/* STATUS HEADER */}
      <div className="w-full bg-slate-900/90 backdrop-blur-md p-4 flex justify-between px-10 items-center border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-white/50 hover:text-white transition-colors">← Back</button>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${status === 'SIGNED' ? 'bg-green-500 text-white' : 'bg-amber-500 text-black'}`}>
                {status === 'SIGNED' ? <CheckCircle size={12}/> : <div className="w-2 h-2 bg-black rounded-full animate-pulse"/>}
                {status}
            </div>
        </div>

        <div className="flex gap-3">
          {status === 'PENDING' && !signatureImg && (
            <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold text-xs flex items-center gap-2">✍️ Add Signature</button>
          )}
          
          {signatureImg && status === 'PENDING' && (
            <button onClick={handleFinalize} disabled={isProcessing} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-xs">
              {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <Shield size={14}/>}
              {isProcessing ? "Processing..." : "Verify & Finalize"}
            </button>
          )}

          {status === 'SIGNED' && signedPdfB64 && (
            <a href={signedPdfB64} download="Signed_Document.pdf" className="bg-white text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-xs animate-bounce">
              <Download size={14}/> Download Result
            </a>
          )}
        </div>
      </div>

      <div className="relative mt-10 mb-20 p-4">
        <div 
          ref={containerRef} 
          onMouseMove={(e) => {
            if (isDragging && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setPosition({ x: e.clientX - rect.left - 75, y: e.clientY - rect.top - 25 });
            }
          }} 
          onMouseUp={() => setIsDragging(false)}
          className={`relative bg-white shadow-2xl transition-all duration-500 ${status === 'SIGNED' ? 'ring-8 ring-green-500/20' : ''}`}
        >
          <Document file={localPdfUrl}>
            <Page pageNumber={1} width={750} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>

          {signatureImg && status === 'PENDING' && (
            <div 
              onMouseDown={() => setIsDragging(true)} 
              style={{ position: 'absolute', left: position.x, top: position.y }} 
              className="cursor-move border-2 border-dashed border-blue-500 bg-blue-500/10 p-1 group"
            >
               <div className="absolute -top-5 left-0 bg-blue-600 text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Drag to position</div>
               <img src={signatureImg} className="w-[150px] h-[50px] pointer-events-none" alt="signature" />
            </div>
          )}
        </div>
      </div>
      
      {isModalOpen && <SignatureModal onSave={(data) => { setSignatureImg(data); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
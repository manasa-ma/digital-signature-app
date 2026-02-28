import { useState, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { SignatureModal } from './SignatureModal';
import { Loader2, Download, Move, ShieldCheck } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export const PdfEditor = ({ file, onBack }: { file: File, onBack: () => void }) => {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedPdfB64, setSignedPdfB64] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // FIX: Create a local browser URL. Fast, reliable, and free!
  const localPdfUrl = useMemo(() => URL.createObjectURL(file), [file]);

  const handleFinalize = async () => {
    if (!signatureImg) return;
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const base64Pdf = reader.result as string;
        let token = localStorage.getItem('token');
        
        // Auto-login if needed
        if (!token) {
           const login = await axios.post(`${API_BASE_URL}/api/auth/login`, {});
           token = login.data.token;
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
      } catch (e) {
        alert("Error during signing process");
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return (
    <div className="flex flex-col items-center bg-slate-950 min-h-screen">
      <div className="w-full bg-slate-900/90 backdrop-blur-md p-4 flex justify-between px-10 items-center border-b border-white/10 sticky top-0 z-50">
        <button onClick={onBack} className="text-white/50 hover:text-white transition-colors">← Change File</button>
        <div className="flex gap-3">
          {!signatureImg && <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold">Create Signature</button>}
          {signatureImg && !signedPdfB64 && (
            <button onClick={handleFinalize} disabled={isProcessing} className="bg-green-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2">
              {isProcessing ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
              {isProcessing ? "Signing..." : "Finalize & Sign"}
            </button>
          )}
          {signedPdfB64 && (
            <a href={signedPdfB64} download="Signed_Document.pdf" className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 animate-bounce">
              <Download /> Download Final PDF
            </a>
          )}
        </div>
      </div>

      <div className="relative mt-10 mb-20 p-10 overflow-auto">
        <div 
          ref={containerRef} 
          onMouseMove={(e) => {
            if (isDragging && containerRef.current) {
              const rect = containerRef.current.getBoundingClientRect();
              setPosition({ x: e.clientX - rect.left - 75, y: e.clientY - rect.top - 25 });
            }
          }} 
          onMouseUp={() => setIsDragging(false)}
          className="relative bg-white shadow-2xl cursor-crosshair"
        >
          <Document file={localPdfUrl} loading={<Loader2 className="animate-spin text-blue-500 m-20" />}>
            <Page pageNumber={1} width={750} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>

          {signatureImg && !signedPdfB64 && (
            <div onMouseDown={() => setIsDragging(true)} style={{ position: 'absolute', left: position.x, top: position.y }} className="cursor-move border-2 border-dashed border-blue-500 bg-blue-500/10">
               <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[8px] px-1 uppercase font-bold">Drag to place</div>
               <img src={signatureImg} className="w-[150px] h-[50px] pointer-events-none" alt="signature" />
            </div>
          )}
        </div>
      </div>
      {isModalOpen && <SignatureModal onSave={(data) => { setSignatureImg(data); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
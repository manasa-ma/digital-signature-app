import { useState, useRef, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { SignatureModal } from './SignatureModal';
import { Loader2, Download, ShieldCheck, ArrowLeft, History, Lock } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export const PdfEditor = ({ file, onBack }: { file: File, onBack: () => void }) => {
  const [signatureImg, setSignatureImg] = useState<string | null>(null);
  const [status, setStatus] = useState<'PENDING' | 'SIGNED'>('PENDING');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [signedPdfB64, setSignedPdfB64] = useState<string | null>(null);
  const [auditData, setAuditData] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Instant local loading - fixes Vercel 404s
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
        }, { headers: { Authorization: `Bearer ${token}` } });

        setSignedPdfB64(res.data.signedPdf);
        setAuditData(res.data.auditTrail);
        setStatus('SIGNED');
      } catch (e) {
        alert("Signing Error: PDF might be too large (>4MB) for Vercel Free tier.");
      } finally {
        setIsProcessing(false);
      }
    };
  };

  return (
    <div className="flex flex-col items-center bg-[#0a0a0c] min-h-screen pb-20">
      <div className="w-full bg-[#111114]/80 backdrop-blur-md p-4 flex justify-between px-10 items-center border-b border-white/10 sticky top-0 z-50">
        <div className="flex items-center gap-6">
            <button onClick={onBack} className="text-white/40 hover:text-white transition-colors flex items-center gap-1"><ArrowLeft size={16}/> Back</button>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${status === 'SIGNED' ? 'bg-green-500 text-white' : 'bg-amber-500 text-black'}`}>
                {status}
            </div>
        </div>

        <div className="flex gap-3">
          {status === 'PENDING' && (
            <button onClick={() => setIsModalOpen(true)} className="bg-white/5 hover:bg-white/10 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all border border-white/10">✍️ Signature</button>
          )}
          {signatureImg && status === 'PENDING' && (
            <button onClick={handleFinalize} disabled={isProcessing} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-xs transition-all shadow-lg shadow-blue-500/20">
              {isProcessing ? <Loader2 className="animate-spin" size={14}/> : <ShieldCheck size={14}/>}
              {isProcessing ? "Processing..." : "Finalize & Verify"}
            </button>
          )}
          {status === 'SIGNED' && (
            <a href={signedPdfB64!} download="Verified_Signed_Doc.pdf" className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-xs animate-in zoom-in-95">
              <Download size={14}/> Download Result
            </a>
          )}
        </div>
      </div>

      {/* AUDIT DETAILS PANEL (Displayed after signing) */}
      {status === 'SIGNED' && auditData && (
        <div className="w-full max-w-[750px] mt-8 bg-green-500/5 border border-green-500/20 rounded-2xl p-6 grid grid-cols-2 gap-6 animate-in slide-in-from-top-4">
            <div>
                <p className="text-green-500/50 text-[9px] font-bold uppercase tracking-widest mb-1">Audit Tracking ID</p>
                <p className="text-green-400 font-mono text-sm">{auditData.auditId}</p>
            </div>
            <div>
                <p className="text-green-500/50 text-[9px] font-bold uppercase tracking-widest mb-1">SHA-256 Fingerprint</p>
                <p className="text-green-400 font-mono text-[10px] break-all">{auditData.fingerprint}</p>
            </div>
            <div className="col-span-2 flex items-center gap-2 text-green-500/80 text-[10px] font-medium border-t border-green-500/10 pt-4">
                <Lock size={12}/> Document is now immutable and stored in browser session.
            </div>
        </div>
      )}

      <div className="relative mt-10 p-4">
        <div ref={containerRef} onMouseMove={(e) => {
            if (isDragging && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setPosition({ x: e.clientX - rect.left - 75, y: e.clientY - rect.top - 25 });
            }
        }} onMouseUp={() => setIsDragging(false)} className={`relative bg-white shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-700 ${status === 'SIGNED' ? 'scale-[1.01]' : ''}`}>
          <Document file={localPdfUrl} loading={<div className="p-20"><Loader2 className="animate-spin text-blue-500" size={40}/></div>}>
            <Page pageNumber={1} width={750} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>

          {signatureImg && status === 'PENDING' && (
            <div onMouseDown={() => setIsDragging(true)} style={{ position: 'absolute', left: position.x, top: position.y }} className="cursor-move border-2 border-dashed border-blue-500 bg-blue-500/5 p-1 group">
               <div className="absolute -top-6 left-0 bg-blue-600 text-white text-[8px] px-1 font-bold uppercase opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Place Signature</div>
               <img src={signatureImg} className="w-[150px] h-[50px] pointer-events-none" />
            </div>
          )}
        </div>
      </div>
      {isModalOpen && <SignatureModal onSave={(data) => { setSignatureImg(data); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
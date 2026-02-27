import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { SignatureModal } from './SignatureModal';
import { Loader2, Download, Move, XCircle, ShieldCheck } from 'lucide-react';

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
  const pdfUrl = `http://localhost:5000/uploads/${fileId}`;

  // Track Lifecycle Status
  useEffect(() => {
    axios.get(`http://localhost:5000/api/docs/${fileId}/status`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setStatus(res.data.status));
  }, []);

  const handleFinalize = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/signatures/finalize', 
        { fileId, signatureData: signatureImg, x: position.x, y: position.y },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSignedUrl(res.data.downloadUrl);
      setStatus('SIGNED');
    } catch (e) { alert("Error signing"); }
  };

  const handleReject = async () => {
    if (!confirm("Reject this document?")) return;
    await axios.post(`http://localhost:5000/api/docs/${fileId}/reject`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setStatus('REJECTED');
  };

  return (
    <div className="flex flex-col items-center bg-slate-950 min-h-screen">
      {/* SaaS Header */}
      <div className="w-full bg-slate-900 p-4 border-b border-white/10 flex justify-between px-10 items-center">
        <div className="flex items-center gap-4">
          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${status === 'SIGNED' ? 'bg-green-500 text-white' : status === 'REJECTED' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
            {status}
          </span>
          <span className="text-white text-sm">{fileId}</span>
        </div>

        <div className="flex gap-3">
          {status === 'PENDING' && (
            <>
              <button onClick={handleReject} className="text-red-500 text-xs font-bold px-4 hover:bg-red-500/10 rounded">Reject</button>
              <button onClick={() => setIsModalOpen(true)} className="bg-white/10 text-white px-4 py-2 rounded text-xs">✍️ Signature</button>
              {signatureImg && <button onClick={handleFinalize} className="bg-blue-600 text-white px-4 py-2 rounded text-xs font-bold">Verify & Sign</button>}
            </>
          )}
          {status === 'SIGNED' && signedUrl && (
            <a href={signedUrl} target="_blank" className="bg-green-600 text-white px-4 py-2 rounded text-xs font-bold flex items-center gap-2">
              <Download className="w-4 h-4" /> Download Signed PDF
            </a>
          )}
        </div>
      </div>

      {/* Workspace */}
      <div className="relative mt-10 p-10 overflow-auto">
        {status === 'REJECTED' && <div className="absolute inset-0 bg-black/60 z-50 flex items-center justify-center text-white font-bold text-2xl">DOCUMENT REJECTED</div>}
        
        <div ref={containerRef} onMouseMove={(e) => {
          if (isDragging && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setPosition({ x: e.clientX - rect.left - 75, y: e.clientY - rect.top - 25 });
          }
        }} onMouseUp={() => setIsDragging(false)} className="relative bg-white shadow-2xl">
          <Document file={pdfUrl} loading={<Loader2 className="animate-spin text-white" />}>
            <Page pageNumber={1} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
          </Document>

          {signatureImg && status === 'PENDING' && (
            <div onMouseDown={() => setIsDragging(true)} style={{ position: 'absolute', left: position.x, top: position.y }} className="cursor-move border-2 border-dashed border-blue-500 bg-blue-50/50">
              <img src={signatureImg} className="w-[150px] h-[50px]" />
            </div>
          )}
        </div>
      </div>
      {isModalOpen && <SignatureModal onSave={(data) => { setSignatureImg(data); setIsModalOpen(false); }} onClose={() => setIsModalOpen(false)} />}
    </div>
  );
};
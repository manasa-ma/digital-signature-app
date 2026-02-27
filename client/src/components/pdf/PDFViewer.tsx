import { useState, useEffect, useRef } from 'react';

interface PDFViewerProps {
  pdfData: string; // base64 encoded
  onPageClick?: (pageNumber: number, x: number, y: number) => void;
  scale?: number;
}

export const PDFViewer = ({ pdfData, onPageClick, scale = 1.5 }: PDFViewerProps) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pages, setPages] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPDF = async () => {
      if (!pdfData) return;
      
      try {
        // For simplicity, we'll render each page as an image
        // In production, you'd use pdfjs-dist
        const pdfBytes = atob(pdfData);
        const bytes = new Uint8Array(pdfBytes.length);
        for (let i = 0; i < pdfBytes.length; i++) {
          bytes[i] = pdfBytes.charCodeAt(i);
        }
        
        // Create a simple viewer using iframe
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        setPages([url]);
        setNumPages(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadPDF();
  }, [pdfData]);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageNum: number) => {
    if (!onPageClick || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    onPageClick(pageNum, x, y);
  };

  return (
    <div ref={containerRef} className="flex flex-col items-center gap-4 p-4">
      {pages.map((pageUrl, index) => (
        <div
          key={index}
          className="relative shadow-lg"
          onClick={(e) => handlePageClick(e, index)}
        >
          <iframe
            src={pageUrl}
            className="w-[612px] h-[792px]"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
            title={`Page ${index + 1}`}
          />
        </div>
      ))}
    </div>
  );
};

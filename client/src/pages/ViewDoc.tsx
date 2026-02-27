import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';
import { ProtectedLayout } from '../components/layout/ProtectedLayout';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

export const ViewDoc = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDocument, currentPdf, fetchDocument, isLoading } = useDocStore();

  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
  }, [id, fetchDocument]);

  const handleDownload = () => {
    if (!currentPdf) return;
    
    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${currentPdf}`;
    link.download = `${currentDocument?.name || 'document'}.pdf`;
    link.click();
  };

  if (!currentDocument) {
    return (
      <ProtectedLayout>
        <Navbar title="Loading..." />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <Navbar title={currentDocument.name} />
      <div className="flex h-[calc(100vh-4rem)]">
        {/* PDF Viewer */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex justify-center">
            <div className="bg-white shadow-lg" style={{ width: '612px', height: '792px' }}>
              {currentPdf && (
                <iframe
                  src={`data:application/pdf;base64,${currentPdf}`}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-auto">
          <Button 
            variant="secondary" 
            className="w-full mb-4"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Documents
          </Button>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Document Details</h3>
              <div className="text-sm space-y-2">
                <p><span className="text-gray-500">Name:</span> {currentDocument.name}</p>
                <p><span className="text-gray-500">Original:</span> {currentDocument.originalName}</p>
                <p><span className="text-gray-500">Created:</span> {new Date(currentDocument.createdAt).toLocaleDateString()}</p>
                {currentDocument.signedAt && (
                  <p><span className="text-gray-500">Signed:</span> {new Date(currentDocument.signedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Signature Fields</h3>
              <p className="text-sm text-gray-500">
                {currentDocument.signatureFields.filter(f => f.signedAt).length} of{' '}
                {currentDocument.signatureFields.length} fields signed
              </p>
            </div>

            <Button className="w-full" onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  );
};

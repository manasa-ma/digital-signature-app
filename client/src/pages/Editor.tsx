import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';
import { ProtectedLayout } from '../components/layout/ProtectedLayout';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SignaturePad } from '../components/signature/SignaturePad';
import { PDFFields } from '../components/pdf/PDFFields';
import { SignatureField } from '../types';
import { DEFAULT_FIELD_WIDTH, DEFAULT_FIELD_HEIGHT } from '../utils/pdfUtils';

export const Editor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentDocument, currentPdf, fetchDocument, addField, signField, isLoading } = useDocStore();
  const [selectedField, setSelectedField] = useState<SignatureField | null>(null);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isAddingField, setIsAddingField] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchDocument(id);
    }
  }, [id, fetchDocument]);

  const handlePageClick = async (pageNumber: number, x: number, y: number) => {
    if (!isAddingField || !id) return;

    await addField(id, {
      page: pageNumber,
      x,
      y,
      width: DEFAULT_FIELD_WIDTH,
      height: DEFAULT_FIELD_HEIGHT,
    });
    setIsAddingField(false);
  };

  const handleFieldClick = (field: SignatureField) => {
    if (!field.signedAt) {
      setSelectedField(field);
      setShowSignatureModal(true);
    }
  };

  const handleSignatureSave = async (signatureData: string) => {
    if (!id || !selectedField) return;

    await signField(id, {
      fieldId: selectedField.id,
      signatureData,
    });
    setShowSignatureModal(false);
    setSelectedField(null);
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
      <Navbar title={`Editing: ${currentDocument.name}`} />
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Main PDF Area */}
        <div className="flex-1 overflow-auto bg-gray-100 p-4">
          <div className="flex justify-center">
            <div 
              ref={containerRef}
              className="relative bg-white shadow-lg"
              style={{ width: '612px', height: '792px' }}
              onClick={(e) => {
                if (isAddingField) {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  handlePageClick(0, e.clientX - rect.left, e.clientY - rect.top);
                }
              }}
            >
              {currentPdf && (
                <iframe
                  src={`data:application/pdf;base64,${currentPdf}`}
                  className="w-full h-full"
                  title="PDF Viewer"
                />
              )}
              <PDFFields
                fields={currentDocument.signatureFields}
                pageHeight={792}
                onFieldClick={handleFieldClick}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-auto">
          <div className="mb-4">
            <Button 
              variant="secondary" 
              className="w-full mb-2"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button 
              className="w-full"
              onClick={() => setIsAddingField(!isAddingField)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {isAddingField ? 'Cancel' : 'Add Field'}
            </Button>
          </div>

          {isAddingField && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4 text-sm text-blue-700">
              Click on the document to add a signature field
            </div>
          )}

          <h3 className="font-semibold mb-3">Signature Fields</h3>
          {currentDocument.signatureFields.length === 0 ? (
            <p className="text-sm text-gray-500">No signature fields yet</p>
          ) : (
            <div className="space-y-2">
              {currentDocument.signatureFields.map((field) => (
                <div
                  key={field.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    field.signedAt 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleFieldClick(field)}
                >
                  <p className="font-medium text-sm">Page {field.page + 1}</p>
                  <p className="text-xs text-gray-500">
                    {field.signedAt ? 'Signed' : 'Not signed'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        title="Add Your Signature"
      >
        <SignaturePad
          onSave={handleSignatureSave}
          onCancel={() => setShowSignatureModal(false)}
        />
      </Modal>
    </ProtectedLayout>
  );
};

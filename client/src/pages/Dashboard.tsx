import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Upload, Clock, CheckCircle, Trash2, Eye } from 'lucide-react';
import { useDocStore } from '../store/useDocStore';
import { ProtectedLayout } from '../components/layout/ProtectedLayout';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';
import { formatDate } from '../utils/pdfUtils';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { documents, isLoading, fetchDocuments, deleteDocument } = useDocStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    setDeletingId(id);
    await deleteDocument(id);
    setDeletingId(null);
  };

  return (
    <ProtectedLayout>
      <Navbar title="Documents" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">My Documents</h1>
          <Button onClick={() => navigate('/upload')}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {isLoading && documents.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
            <p className="text-gray-500 mb-4">Upload a PDF to get started</p>
            <Button onClick={() => navigate('/upload')}>
              <Upload className="w-4 h-4 mr-2" />
              Upload Document
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 bg-primary-100 rounded-lg">
                    <FileText className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => navigate(`/document/${doc.id}`)}
                      className="p-1.5 hover:bg-gray-100 rounded-lg"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      className="p-1.5 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                
                <h3 className="font-medium text-gray-900 mb-1 truncate">{doc.name}</h3>
                <p className="text-sm text-gray-500 mb-3">{doc.originalName}</p>
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(doc.createdAt)}
                  </span>
                  <span className="flex items-center gap-1">
                    {doc.signedAt ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-green-500" />
                        Signed
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                        {doc.signatureFieldsCount} fields
                      </>
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
};

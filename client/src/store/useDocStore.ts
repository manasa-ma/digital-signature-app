import { create } from 'zustand';
import { Document, DocumentListItem, SignatureField } from '../types';
import { docApi, AddFieldData, SignData } from '../api/docApi';

interface DocState {
  documents: DocumentListItem[];
  currentDocument: Document | null;
  currentPdf: string | null;
  isLoading: boolean;
  error: string | null;
  
  fetchDocuments: () => Promise<void>;
  fetchDocument: (id: string) => Promise<void>;
  uploadDocument: (file: File) => Promise<Document>;
  addField: (docId: string, data: AddFieldData) => Promise<SignatureField>;
  signField: (docId: string, data: SignData) => Promise<SignatureField>;
  deleteDocument: (id: string) => Promise<void>;
  clearCurrentDocument: () => void;
  clearError: () => void;
}

export const useDocStore = create<DocState>((set, get) => ({
  documents: [],
  currentDocument: null,
  currentPdf: null,
  isLoading: false,
  error: null,

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await docApi.getAll();
      set({ documents: response.documents, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch documents',
        isLoading: false,
      });
    }
  },

  fetchDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await docApi.getById(id);
      set({
        currentDocument: response.document,
        currentPdf: response.pdf,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch document',
        isLoading: false,
      });
    }
  },

  uploadDocument: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      const response = await docApi.upload(file);
      const { documents } = get();
      set({
        documents: [response.document, ...documents],
        isLoading: false,
      });
      return response.document;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upload document',
        isLoading: false,
      });
      throw error;
    }
  },

  addField: async (docId: string, data: AddFieldData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await docApi.addField(docId, data);
      const { currentDocument } = get();
      if (currentDocument) {
        set({
          currentDocument: {
            ...currentDocument,
            signatureFields: [...currentDocument.signatureFields, response.field],
          },
          isLoading: false,
        });
      }
      return response.field;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to add signature field',
        isLoading: false,
      });
      throw error;
    }
  },

  signField: async (docId: string, data: SignData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await docApi.sign(docId, data);
      const { currentDocument } = get();
      if (currentDocument) {
        set({
          currentDocument: {
            ...currentDocument,
            signatureFields: currentDocument.signatureFields.map((f) =>
              f.id === data.fieldId ? response.field : f
            ),
          },
          isLoading: false,
        });
      }
      return response.field;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to sign document',
        isLoading: false,
      });
      throw error;
    }
  },

  deleteDocument: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await docApi.delete(id);
      const { documents, currentDocument } = get();
      set({
        documents: documents.filter((d) => d.id !== id),
        currentDocument: currentDocument?.id === id ? null : currentDocument,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to delete document',
        isLoading: false,
      });
    }
  },

  clearCurrentDocument: () => {
    set({ currentDocument: null, currentPdf: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

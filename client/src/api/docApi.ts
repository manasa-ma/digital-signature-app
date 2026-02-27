import api from './axios';
import { Document, DocumentListItem, DocumentResponse, DocumentsResponse, SignatureField } from '../types';

export interface AddFieldData {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignData {
  fieldId: string;
  signatureData: string;
}

export const docApi = {
  upload: async (file: File): Promise<{ document: Document }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ document: Document }>('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getAll: async (): Promise<DocumentsResponse> => {
    const response = await api.get<DocumentsResponse>('/documents');
    return response.data;
  },

  getById: async (id: string): Promise<DocumentResponse> => {
    const response = await api.get<DocumentResponse>(`/documents/${id}`);
    return response.data;
  },

  addField: async (id: string, data: AddFieldData): Promise<{ field: SignatureField }> => {
    const response = await api.post<{ field: SignatureField }>(`/documents/${id}/fields`, data);
    return response.data;
  },

  sign: async (id: string, data: SignData): Promise<{ field: SignatureField }> => {
    const response = await api.post<{ field: SignatureField }>(`/documents/${id}/sign`, data);
    return response.data;
  },

  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/documents/${id}`);
    return response.data;
  },
};

// User types
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

// Document types
export interface SignatureField {
  id: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  signerId?: string;
  signedAt?: string;
  signatureData?: string;
}

export interface Document {
  id: string;
  name: string;
  originalName: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  signatureFields: SignatureField[];
}

export interface DocumentListItem {
  id: string;
  name: string;
  originalName: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  signatureFieldsCount: number;
}

export interface DocumentResponse {
  document: Document;
  pdf: string; // base64 encoded PDF
}

export interface DocumentsResponse {
  documents: DocumentListItem[];
}

// API Error
export interface ApiError {
  message: string;
}

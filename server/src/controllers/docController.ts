import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createError } from '../middleware/errorHandler.js';
import { authGuard, AuthRequest } from '../middleware/authGuard.js';
import { PDFDocument, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

// In-memory document store (replace with database in production)
interface SignatureField {
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

interface Document {
  id: string;
  name: string;
  originalName: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string;
  signatureFields: SignatureField[];
  filePath: string;
}

const documents: Map<string, Document> = new Map();

export const uploadDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    
    if (!req.file) {
      throw createError('No file uploaded', 400);
    }

    const { originalname, filename, path: filePath } = req.file;
    const docId = uuidv4();
    
    const doc: Document = {
      id: docId,
      name: originalname.replace(/\.pdf$/i, ''),
      originalName: originalname,
      ownerId: authReq.user!.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      signatureFields: [],
      filePath,
    };

    documents.set(docId, doc);

    res.status(201).json({
      message: 'Document uploaded successfully',
      document: {
        id: doc.id,
        name: doc.name,
        originalName: doc.originalName,
        createdAt: doc.createdAt,
        signatureFields: doc.signatureFields,
      },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userDocs = Array.from(documents.values())
      .filter(doc => doc.ownerId === authReq.user!.userId)
      .map(doc => ({
        id: doc.id,
        name: doc.name,
        originalName: doc.originalName,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        signedAt: doc.signedAt,
        signatureFieldsCount: doc.signatureFields.length,
      }));

    res.json({ documents: userDocs });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const getDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const doc = documents.get(id);

    if (!doc) {
      throw createError('Document not found', 404);
    }

    // Read and return PDF as base64
    const fileBuffer = await fs.readFile(doc.filePath);
    const base64 = fileBuffer.toString('base64');

    res.json({
      document: {
        id: doc.id,
        name: doc.name,
        originalName: doc.originalName,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        signedAt: doc.signedAt,
        signatureFields: doc.signatureFields,
      },
      pdf: base64,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const addSignatureField = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page, x, y, width, height } = req.body;
    const authReq = req as AuthRequest;

    const doc = documents.get(id);
    if (!doc) {
      throw createError('Document not found', 404);
    }

    if (doc.ownerId !== authReq.user!.userId) {
      throw createError('Not authorized to modify this document', 403);
    }

    const fieldId = uuidv4();
    const field: SignatureField = {
      id: fieldId,
      page,
      x,
      y,
      width,
      height,
    };

    doc.signatureFields.push(field);
    doc.updatedAt = new Date().toISOString();

    res.status(201).json({
      message: 'Signature field added',
      field: { id: fieldId, page, x, y, width, height },
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const signDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { fieldId, signatureData } = req.body;
    const authReq = req as AuthRequest;

    const doc = documents.get(id);
    if (!doc) {
      throw createError('Document not found', 404);
    }

    const field = doc.signatureFields.find(f => f.id === fieldId);
    if (!field) {
      throw createError('Signature field not found', 404);
    }

    if (field.signerId) {
      throw createError('This field has already been signed', 400);
    }

    // Convert base64 PNG to bytes
    const signatureBytes = Buffer.from(signatureData.replace(/^data:image\/png;base64,/, ''), 'base64');

    // Load the PDF
    const pdfBytes = await fs.readFile(doc.filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Embed the signature image
    const signatureImage = await pdfDoc.embedPng(signatureBytes);
    
    // Get the page and draw the signature
    const pages = pdfDoc.getPages();
    if (field.page >= pages.length) {
      throw createError('Invalid page number', 400);
    }
    
    const page = pages[field.page];
    page.drawImage(signatureImage, {
      x: field.x,
      y: page.getHeight() - field.y - field.height,
      width: field.width,
      height: field.height,
    });

    // Update field
    field.signerId = authReq.user!.userId;
    field.signedAt = new Date().toISOString();
    field.signatureData = signatureData;

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    await fs.writeFile(doc.filePath, signedPdfBytes);

    doc.updatedAt = new Date().toISOString();
    doc.signedAt = new Date().toISOString();

    res.json({
      message: 'Document signed successfully',
      field,
    });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const authReq = req as AuthRequest;

    const doc = documents.get(id);
    if (!doc) {
      throw createError('Document not found', 404);
    }

    if (doc.ownerId !== authReq.user!.userId) {
      throw createError('Not authorized to delete this document', 403);
    }

    // Delete file
    try {
      await fs.unlink(doc.filePath);
    } catch {
      // File might not exist, continue
    }

    documents.delete(id);

    res.json({ message: 'Document deleted successfully' });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

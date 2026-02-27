import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  uploadDocument,
  getDocuments,
  getDocument,
  addSignatureField,
  signDocument,
  deleteDocument,
} from '../controllers/docController.js';
import { authGuard } from '../middleware/authGuard.js';
import { UPLOAD_DIR, MAX_FILE_SIZE } from '../config/env.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

router.post('/upload', authGuard, upload.single('file'), uploadDocument);
router.get('/', authGuard, getDocuments);
router.get('/:id', authGuard, getDocument);
router.post('/:id/fields', authGuard, addSignatureField);
router.post('/:id/sign', authGuard, signDocument);
router.delete('/:id', authGuard, deleteDocument);

export default router;

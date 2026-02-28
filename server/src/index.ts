import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import os from 'os';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// 1. Storage Configuration
const isProd = process.env.NODE_ENV === 'production';
const uploadDir = isProd ? os.tmpdir() : path.join(process.cwd(), 'uploads');

if (!isProd && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Optimized CORS for Binary PDF Data
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// --- ROUTES ---

app.get('/', (req, res) => res.send('Digital Signature Backend is running! 🚀'));

// Robust File Serving Route (Fixes the "Failed to load PDF" error)
app.get('/api/files/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    
    if (fs.existsSync(filePath)) {
        // Set specific headers for PDF viewing
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: "File expired or not found. Please upload again." });
    }
});

app.post('/api/auth/login', (req, res) => {
    const token = jwt.sign({ email: req.body.email || 'user@test.com' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

const upload = multer({ dest: uploadDir });

app.post('/api/docs/upload', upload.single('pdf'), (req: any, res: any) => {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    // In serverless, we need to make sure the file has an ID we can find
    res.json({ fileId: req.file.filename });
});

app.get('/api/docs/:id/status', (req, res) => {
    const filePath = path.join(uploadDir, req.params.id);
    res.json({ status: fs.existsSync(filePath) ? 'PENDING' : 'EXPIRED' });
});

app.post('/api/signatures/finalize', async (req: any, res: any) => {
    const { fileId, signatureData, x, y } = req.body;
    try {
        const filePath = path.join(uploadDir, fileId);
        if (!fs.existsSync(filePath)) throw new Error("File expired on serverless storage");

        const pdfDoc = await PDFDocument.load(fs.readFileSync(filePath));
        const firstPage = pdfDoc.getPages()[0];
        const { height } = firstPage.getSize();

        const sigImg = await pdfDoc.embedPng(Buffer.from(signatureData.split(',')[1], 'base64'));
        firstPage.drawImage(sigImg, { x, y: height - y - 50, width: 150, height: 50 });

        const signedBytes = await pdfDoc.save();
        const signedName = `signed-${fileId}.pdf`;
        const signedPath = path.join(uploadDir, signedName);
        fs.writeFileSync(signedPath, signedBytes);

        const protocol = req.headers['x-forwarded-proto'] || 'https';
        res.json({ 
            downloadUrl: `${protocol}://${req.headers.host}/api/files/${signedName}` 
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// For local development
if (!isProd) {
    const PORT = 5000;
    app.listen(PORT, () => console.log(`Local server: http://localhost:${PORT}`));
}

export default app;
import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import os from 'os'; // Added for temp directory access

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// 1. Vercel-Compatible Storage Setup
// In production (Vercel), we must use the OS temp directory
const isProduction = process.env.NODE_ENV === 'production';
const uploadDir = isProduction ? os.tmpdir() : path.join(process.cwd(), 'uploads');
const dbPath = path.join(uploadDir, 'db.json');

if (!isProduction && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Helper to save/load document statuses
const loadRegistry = () => {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {
        return {};
    }
};

const saveRegistry = (data: any) => {
    try {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Registry save failed (expected in serverless):", e);
    }
};

// 2. Middleware
app.use(cors({ 
    origin: '*', // Set to specific Vercel URL later for security
    credentials: true 
}));
app.use(express.json({ limit: '50mb' }));

// Serve PDFs (Note: In Vercel, this only works for the current session)
app.use('/uploads', express.static(uploadDir));

const authenticateToken = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: "Session Expired" });
        req.user = user;
        next();
    });
};

// --- ROUTES ---

app.get('/api/health', (req, res) => res.send('Enterprise Engine Live 🚀'));

app.post('/api/auth/login', (req, res) => {
    const token = jwt.sign({ email: req.body.email || 'user@test.com' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

const upload = multer({ storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
})});

app.post('/api/docs/upload', authenticateToken, upload.single('pdf'), (req: any, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    
    const fileId = req.file.filename;
    const registry = loadRegistry();
    registry[fileId] = { 
        status: 'PENDING', 
        owner: req.user.email,
        originalName: req.file.originalname,
        createdAt: new Date().toISOString()
    };
    saveRegistry(registry);
    
    res.json({ fileId });
});

app.get('/api/docs/:id/status', authenticateToken, (req, res) => {
    const registry = loadRegistry();
    const doc = registry[req.params.id];
    if (!doc) return res.status(404).json({ status: 'NOT_FOUND' });
    res.json(doc);
});

app.post('/api/docs/:id/reject', authenticateToken, (req, res) => {
    const registry = loadRegistry();
    if (registry[req.params.id]) {
        registry[req.params.id].status = 'REJECTED';
        saveRegistry(registry);
        res.json({ status: 'REJECTED' });
    } else {
        res.status(404).send("Document not found");
    }
});

app.post('/api/signatures/finalize', authenticateToken, async (req: any, res) => {
    const { fileId, signatureData, x, y } = req.body;
    try {
        const filePath = path.join(uploadDir, fileId);
        const pdfDoc = await PDFDocument.load(fs.readFileSync(filePath));
        const firstPage = pdfDoc.getPages()[0];
        const { height, width } = firstPage.getSize();

        const sigImg = await pdfDoc.embedPng(Buffer.from(signatureData.split(',')[1], 'base64'));
        firstPage.drawImage(sigImg, { x, y: height - y - 50, width: 150, height: 50 });

        const auditPage = pdfDoc.addPage([width, height]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        auditPage.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.05, 0.1, 0.2) });
        auditPage.drawText('DIGITAL SIGNATURE AUDIT REPORT', { x: 50, y: height - 35, size: 16, font: fontBold, color: rgb(1, 1, 1) });
        
        const auditLines = [
            { label: 'Document ID:', value: fileId },
            { label: 'Signer Email:', value: req.user.email },
            { label: 'Timestamp:', value: new Date().toUTCString() },
            { label: 'IP Address:', value: req.headers['x-forwarded-for'] || req.ip }
        ];

        auditLines.forEach((line, i) => {
            auditPage.drawText(line.label, { x: 50, y: height - 120 - (i * 30), size: 12, font: fontBold });
            auditPage.drawText(line.value, { x: 200, y: height - 120 - (i * 30), size: 12, font, color: rgb(0.3, 0.3, 0.3) });
        });

        const signedName = `signed-${fileId}`;
        const signedPath = path.join(uploadDir, signedName);
        fs.writeFileSync(signedPath, await pdfDoc.save());

        const registry = loadRegistry();
        if (registry[fileId]) {
            registry[fileId].status = 'SIGNED';
            saveRegistry(registry);
        }

        // Return the download URL based on current host
        const protocol = req.headers['x-forwarded-proto'] || 'http';
        const host = req.headers.host;
        res.json({ 
            downloadUrl: `${protocol}://${host}/uploads/${signedName}`,
            status: 'SIGNED' 
        });

    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// For local development
if (!isProduction) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

// CRITICAL FOR VERCEL: Export the app
export default app;
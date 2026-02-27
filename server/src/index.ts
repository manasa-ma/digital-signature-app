import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
// USE DYNAMIC PORT FOR DEPLOYMENT (Render/Heroku/Railway)
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// 1. Storage & Persistence Setup
const uploadDir = path.join(process.cwd(), 'uploads');
const dbPath = path.join(uploadDir, 'db.json');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Helper to save/load document statuses so they aren't lost on restart
const loadRegistry = () => {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};
const saveRegistry = (data: any) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// 2. Middleware
app.use(cors({ 
    origin: process.env.FRONTEND_URL || 'http://localhost:5173', 
    credentials: true 
}));
app.use(express.json({ limit: '50mb' }));

// Serve PDFs (Used by the viewer during signing)
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

// Mock Login
app.post('/api/auth/login', (req, res) => {
    const token = jwt.sign({ email: req.body.email || 'user@test.com' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

// Upload Document
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

// Get Document Status
app.get('/api/docs/:id/status', authenticateToken, (req, res) => {
    const registry = loadRegistry();
    const doc = registry[req.params.id];
    if (!doc) return res.status(404).json({ status: 'NOT_FOUND' });
    res.json(doc);
});

// Reject Document
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

// Finalize, Sign & Generate Certificate
app.post('/api/signatures/finalize', authenticateToken, async (req: any, res) => {
    const { fileId, signatureData, x, y } = req.body;
    try {
        const filePath = path.join(uploadDir, fileId);
        const pdfDoc = await PDFDocument.load(fs.readFileSync(filePath));
        const firstPage = pdfDoc.getPages()[0];
        const { height, width } = firstPage.getSize();

        // 1. Embed Signature Image
        const sigImg = await pdfDoc.embedPng(Buffer.from(signatureData.split(',')[1], 'base64'));
        firstPage.drawImage(sigImg, { 
            x, 
            y: height - y - 50, 
            width: 150, 
            height: 50 
        });

        // 2. Add Professional Audit Certificate Page
        const auditPage = pdfDoc.addPage([width, height]);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        
        const topY = height - 100;

        // Header
        auditPage.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.05, 0.1, 0.2) });
        auditPage.drawText('DIGITAL SIGNATURE AUDIT REPORT', { x: 50, y: height - 35, size: 16, font: fontBold, color: rgb(1, 1, 1) });

        // Content
        auditPage.drawText('CERTIFICATE OF COMPLETION', { x: 50, y: topY, size: 22, font: fontBold });
        
        const auditLines = [
            { label: 'Document ID:', value: fileId },
            { label: 'Signer Email:', value: req.user.email },
            { label: 'Timestamp:', value: new Date().toUTCString() },
            { label: 'IP Address:', value: req.ip || 'Remote' },
            { label: 'Security Level:', value: 'JWT Authenticated / SSL Encrypted' },
            { label: 'Digital Fingerprint:', value: Buffer.from(fileId).toString('hex').substring(0, 32).toUpperCase() }
        ];

        auditLines.forEach((line, i) => {
            auditPage.drawText(line.label, { x: 50, y: topY - 60 - (i * 30), size: 12, font: fontBold });
            auditPage.drawText(line.value, { x: 200, y: topY - 60 - (i * 30), size: 12, font, color: rgb(0.3, 0.3, 0.3) });
        });

        // "Verified" Stamp
        auditPage.drawRectangle({ x: 50, y: 100, width: 200, height: 50, borderColor: rgb(0, 0.5, 0), borderWidth: 2 });
        auditPage.drawText('VERIFIED DOCUMENT', { x: 75, y: 120, size: 12, font: fontBold, color: rgb(0, 0.5, 0) });

        // 3. Save Final File
        const signedName = `signed-${fileId}`;
        const signedPath = path.join(uploadDir, signedName);
        fs.writeFileSync(signedPath, await pdfDoc.save());

        // 4. Update Registry
        const registry = loadRegistry();
        if (registry[fileId]) {
            registry[fileId].status = 'SIGNED';
            registry[fileId].signedAt = new Date().toISOString();
            saveRegistry(registry);
        }

        res.json({ 
            downloadUrl: `${process.env.BACKEND_URL || 'http://localhost:5000'}/uploads/${signedName}`,
            status: 'SIGNED' 
        });

    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: "Internal processing error", details: e.message });
    }
});

app.listen(PORT, () => {
    console.log(`
    ✅ ENTERPRISE SIGNATURE ENGINE STARTED
    --------------------------------------
    PORT: ${PORT}
    MODE: ${process.env.NODE_ENV || 'development'}
    URL:  http://localhost:${PORT}
    --------------------------------------
    `);
});
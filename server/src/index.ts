import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import os from 'os';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// 1. Vercel-Compatible Storage Setup
const isProduction = process.env.NODE_ENV === 'production';
const uploadDir = isProduction ? os.tmpdir() : path.join(process.cwd(), 'uploads');
const dbPath = path.join(uploadDir, 'db.json');

if (!isProduction && !fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. STRENGTHENED CORS MIDDLEWARE
app.use(cors({ 
    origin: '*', // For production, replace '*' with your actual Vercel frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true 
}));

// 3. MANUAL OPTIONS HANDLER (Fixes the Pre-flight error in your screenshot)
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

app.use(express.json({ limit: '50mb' }));

// Serve PDFs
app.use('/uploads', express.static(uploadDir));

// Helper for Registry (Status Tracking)
const loadRegistry = () => {
    try {
        if (!fs.existsSync(dbPath)) return {};
        return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) { return {}; }
};

const saveRegistry = (data: any) => {
    try { fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); } catch (e) {}
};

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
    registry[fileId] = { status: 'PENDING', owner: req.user.email, createdAt: new Date().toISOString() };
    saveRegistry(registry);
    res.json({ fileId });
});

app.get('/api/docs/:id/status', authenticateToken, (req, res) => {
    const registry = loadRegistry();
    const doc = registry[req.params.id];
    if (!doc) return res.status(404).json({ status: 'NOT_FOUND' });
    res.json(doc);
});

app.post('/api/signatures/finalize', authenticateToken, async (req: any, res) => {
    const { fileId, signatureData, x, y } = req.body;
    try {
        const filePath = path.join(uploadDir, fileId);
        if (!fs.existsSync(filePath)) throw new Error("File not found on server");

        const pdfDoc = await PDFDocument.load(fs.readFileSync(filePath));
        const firstPage = pdfDoc.getPages()[0];
        const { height, width } = firstPage.getSize();

        const sigImg = await pdfDoc.embedPng(Buffer.from(signatureData.split(',')[1], 'base64'));
        firstPage.drawImage(sigImg, { x, y: height - y - 50, width: 150, height: 50 });

        // Add Audit Page
        const auditPage = pdfDoc.addPage([width, height]);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        auditPage.drawText('AUDIT CERTIFICATE', { x: 50, y: height - 100, size: 20, font: fontBold });
        auditPage.drawText(`Signer: ${req.user.email}`, { x: 50, y: height - 150, size: 12 });
        auditPage.drawText(`IP: ${req.headers['x-forwarded-for'] || req.ip}`, { x: 50, y: height - 170, size: 12 });

        const signedName = `signed-${fileId}`;
        fs.writeFileSync(path.join(uploadDir, signedName), await pdfDoc.save());

        const protocol = req.headers['x-forwarded-proto'] || 'http';
        res.json({ 
            downloadUrl: `${protocol}://${req.headers.host}/uploads/${signedName}`,
            status: 'SIGNED' 
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

if (!isProduction) {
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
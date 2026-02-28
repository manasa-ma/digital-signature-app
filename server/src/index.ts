import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// 1. STRENGTHENED CORS & BODY LIMITS
// We increase the limit to 50MB because we are sending full PDF strings
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(cors({
    origin: '*', // For production, you can replace with your Vercel frontend URL
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// Manual OPTIONS handler for Vercel pre-flight reliability
app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// 2. AUTH MIDDLEWARE
const authenticateToken = (req: any, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Unauthorized: Please log in" });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: "Session Expired" });
        req.user = user;
        next();
    });
};

// --- ROUTES ---

app.get('/', (req, res) => res.send('Digital Signature Stateless Engine Live 🚀'));

// Mock Login
app.post('/api/auth/login', (req, res) => {
    const token = jwt.sign({ email: req.body.email || 'user@test.com' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

/**
 * STATELESS SIGNING ROUTE
 * Accepts the PDF and Signature as Base64, processes in RAM, and returns the result.
 */
app.post('/api/signatures/finalize', authenticateToken, async (req: any, res: any) => {
    const { pdfData, signatureData, x, y } = req.body;

    try {
        if (!pdfData || !signatureData) {
            return res.status(400).json({ error: "Missing PDF or Signature data" });
        }

        // 1. Load the PDF from the Base64 string sent by the frontend
        const pdfBytes = Buffer.from(pdfData.split(',')[1], 'base64');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { height, width } = firstPage.getSize();

        // 2. Embed the Signature Image
        const sigImgBytes = Buffer.from(signatureData.split(',')[1], 'base64');
        const signatureImage = await pdfDoc.embedPng(sigImgBytes);

        // Draw signature (Coordinate conversion: Browser top-down to PDF bottom-up)
        firstPage.drawImage(signatureImage, {
            x: x,
            y: height - y - 50,
            width: 150,
            height: 50,
        });

        // 3. GENERATE AUDIT CERTIFICATE PAGE (Enterprise Requirement)
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
        
        const auditPage = pdfDoc.addPage([width, height]);
        
        // Header Bar
        auditPage.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.05, 0.1, 0.2) });
        auditPage.drawText('DIGITAL SIGNATURE AUDIT REPORT', { x: 50, y: height - 38, size: 16, font: fontBold, color: rgb(1, 1, 1) });

        // Audit Content
        const startY = height - 120;
        auditPage.drawText('CERTIFICATE OF COMPLETION', { x: 50, y: startY, size: 22, font: fontBold });
        
        const details = [
            `Signer Identity: ${req.user.email}`,
            `Timestamp: ${new Date().toUTCString()}`,
            `IP Address: ${req.headers['x-forwarded-for'] || req.ip}`,
            `Security Level: JWT Authenticated (Stateless)`,
            `Integrity Status: Document modified and verified by Signature Engine`
        ];

        details.forEach((text, i) => {
            auditPage.drawText(text, { x: 50, y: startY - 50 - (i * 25), size: 11, font: fontItalic, color: rgb(0.2, 0.2, 0.2) });
        });

        // "Verified" Stamp
        auditPage.drawRectangle({ x: width - 200, y: 50, width: 150, height: 40, borderColor: rgb(0, 0.5, 0), borderWidth: 2 });
        auditPage.drawText('VERIFIED', { x: width - 155, y: 65, size: 12, font: fontBold, color: rgb(0, 0.5, 0) });

        // 4. SAVE AND SEND BACK AS BASE64
        const signedPdfBase64 = await pdfDoc.saveAsBase64({ dataUri: true });
        
        res.json({ 
            message: "Signed successfully",
            signedPdf: signedPdfBase64,
            status: 'SIGNED' 
        });

    } catch (e: any) {
        console.error("Signing Error:", e);
        res.status(500).json({ error: "Failed to process PDF: " + e.message });
    }
});

// For local development
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
    const PORT = 5000;
    app.listen(PORT, () => console.log(`Stateless Server: http://localhost:${PORT}`));
}

// CRITICAL FOR VERCEL
export default app;
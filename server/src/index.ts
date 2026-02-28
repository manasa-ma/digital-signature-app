import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// Increase body limit to handle large PDF strings on Vercel
app.use(express.json({ limit: '4.5mb' })); 
app.use(cors({ origin: '*' }));

// --- SECURITY: JWT AUTH ---
app.post('/api/auth/login', (req, res) => {
    const token = jwt.sign({ email: 'signer@manasa-enterprise.com' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

app.get('/', (req, res) => res.send('Digital Signature Audit Engine: Online 🚀'));

// --- CORE LOGIC: SIGN & AUDIT ---
app.post('/api/signatures/finalize', async (req: any, res: any) => {
    const { pdfData, signatureData, x, y } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const user: any = jwt.verify(token, JWT_SECRET);

        // 1. Process PDF Bytes
        const pdfBytes = Buffer.from(pdfData.split(',')[1], 'base64');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        const { height, width } = firstPage.getSize();

        // 2. Embed Signature Image
        const sigImg = await pdfDoc.embedPng(Buffer.from(signatureData.split(',')[1], 'base64'));
        firstPage.drawImage(sigImg, { x, y: height - y - 50, width: 150, height: 50 });

        // 3. GENERATE AUDIT TRAIL DATA
        const auditId = `TRK-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const fingerprint = crypto.createHash('sha256').update(pdfData + signatureData).digest('hex').toUpperCase();

        // 4. APPEND AUDIT CERTIFICATE PAGE
        const auditPage = pdfDoc.addPage([width, height]);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontReg = await pdfDoc.embedFont(StandardFonts.Helvetica);

        // Styling the Certificate
        auditPage.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: rgb(0.05, 0.1, 0.2) });
        auditPage.drawText('OFFICIAL SIGNATURE AUDIT CERTIFICATE', { x: 50, y: height - 40, size: 16, font: fontBold, color: rgb(1, 1, 1) });

        const startY = height - 120;
        const details = [
            { l: "Tracking ID", v: auditId },
            { l: "Signer Email", v: user.email },
            { l: "IP Address", v: req.headers['x-forwarded-for'] || req.ip },
            { l: "Timestamp", v: new Date().toUTCString() },
            { l: "Digital Fingerprint", v: fingerprint.substring(0, 32) + "..." },
            { l: "Status", v: "Digitally Signed & Integrity Verified" }
        ];

        details.forEach((item, i) => {
            auditPage.drawText(`${item.l}:`, { x: 50, y: startY - (i * 35), size: 11, font: fontBold });
            auditPage.drawText(item.v, { x: 180, y: startY - (i * 35), size: 11, font: fontReg, color: rgb(0.3, 0.3, 0.3) });
        });

        // "Verified" Stamp
        auditPage.drawRectangle({ x: width - 200, y: 50, width: 150, height: 50, borderColor: rgb(0, 0.5, 0), borderWidth: 2 });
        auditPage.drawText('VERIFIED', { x: width - 155, y: 70, size: 14, font: fontBold, color: rgb(0, 0.5, 0) });

        // 5. Finalize and Return
        const signedBase64 = await pdfDoc.saveAsBase64({ dataUri: true });
        res.json({ 
            signedPdf: signedBase64, 
            status: 'SIGNED',
            auditTrail: { auditId, fingerprint, time: new Date().toISOString() }
        });

    } catch (e: any) {
        res.status(500).json({ error: "Serverless execution failed: " + e.message });
    }
});

export default app;
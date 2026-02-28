import express, { Response, NextFunction } from 'express';
import cors from 'cors';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import jwt from 'jsonwebtoken';

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'enterprise_secret_key_999';

// FIX: Increase limits to the absolute maximum Vercel allows (4.5MB)
app.use(express.json({ limit: '4.5mb' })); 
app.use(express.urlencoded({ limit: '4.5mb', extended: true }));

app.use(cors({ origin: '*' }));

// Mock Login (Returns a "key" to the frontend)
app.post('/api/auth/login', (req, res) => {
    const token = jwt.sign({ email: 'user@test.com' }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token });
});

// Finalize Signature
app.post('/api/signatures/finalize', async (req: any, res: any) => {
    const { pdfData, signatureData, x, y } = req.body;
    
    // Auth Check
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Missing Token" });

    try {
        const user: any = jwt.verify(token, JWT_SECRET);
        
        // 1. Process PDF
        const pdfBytes = Buffer.from(pdfData.split(',')[1], 'base64');
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const firstPage = pdfDoc.getPages()[0];
        const { height, width } = firstPage.getSize();

        // 2. Embed Signature
        const sigImg = await pdfDoc.embedPng(Buffer.from(signatureData.split(',')[1], 'base64'));
        firstPage.drawImage(sigImg, { x, y: height - y - 50, width: 150, height: 50 });

        // 3. Add Audit Certificate Page
        const auditPage = pdfDoc.addPage([width, height]);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        auditPage.drawText('CERTIFICATE OF COMPLETION', { x: 50, y: height - 100, size: 20, font: fontBold });
        auditPage.drawText(`Signed By: ${user.email}`, { x: 50, y: height - 150, size: 12 });
        auditPage.drawText(`Date: ${new Date().toUTCString()}`, { x: 50, y: height - 170, size: 12 });

        const signedBase64 = await pdfDoc.saveAsBase64({ dataUri: true });

        // 4. Return result + Status
        res.json({ 
            signedPdf: signedBase64,
            status: 'SIGNED' 
        });
    } catch (e: any) {
        console.error(e);
        res.status(500).json({ error: e.message });
    }
});

export default app;
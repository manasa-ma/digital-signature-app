import { PDFDocument } from 'pdf-lib';

export const embedSignature = async (
  pdfBuffer: Buffer,
  signatureImageUri: string, // base64 from client
  x: number,
  y: number,
  pageIndex: number
) => {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  const pages = pdfDoc.getPages();
  const targetPage = pages[pageIndex];

  // Convert base64 signature to image
  const signatureImage = await pdfDoc.embedPng(signatureImageUri);
  
  // Draw the signature
  targetPage.drawImage(signatureImage, {
    x,
    y,
    width: 150,
    height: 50,
  });

  return await pdfDoc.save();
};
import fs from 'fs';
import path from 'path';

export const logEvent = (docId: string, action: string, details: any) => {
  const logPath = path.join(__dirname, '../../uploads/audit.log');
  const entry = {
    timestamp: new Date().toISOString(),
    documentId: docId,
    action, // e.g., "UPLOADED", "VIEWED", "SIGNED"
    ...details,
  };

  fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  console.log(`[AUDIT LOG]: ${action} for ${docId}`);
};
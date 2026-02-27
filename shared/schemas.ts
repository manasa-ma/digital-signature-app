import { z } from 'zod';

export const SignatureSchema = z.object({
  documentId: z.string().uuid(),
  page: z.number().min(0),
  x: z.number(),
  y: z.number(),
  signatureData: z.string().startsWith('data:image/png;base64,'),
});
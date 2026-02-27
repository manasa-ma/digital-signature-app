import { SignatureField } from '../../types';
import { DEFAULT_FIELD_WIDTH, DEFAULT_FIELD_HEIGHT } from '../../utils/pdfUtils';

interface PDFFieldsProps {
  fields: SignatureField[];
  scale?: number;
  pageHeight?: number;
  onFieldClick?: (field: SignatureField) => void;
}

export const PDFFields = ({ fields, scale = 1.5, pageHeight = 792, onFieldClick }: PDFFieldsProps) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {fields.map((field) => {
        // Convert PDF coordinates to screen coordinates
        // PDF origin is bottom-left, screen origin is top-left
        const screenX = field.x * scale;
        const screenY = (pageHeight - field.y - field.height) * scale;
        const screenWidth = field.width * scale;
        const screenHeight = field.height * scale;

        return (
          <div
            key={field.id}
            className={`absolute border-2 border-dashed transition-all cursor-pointer pointer-events-auto
              ${field.signedAt 
                ? 'border-green-500 bg-green-100 bg-opacity-30' 
                : 'border-blue-400 bg-blue-100 bg-opacity-30 hover:bg-opacity-50 hover:border-blue-500'
              }`}
            style={{
              left: screenX,
              top: screenY,
              width: screenWidth,
              height: screenHeight,
            }}
            onClick={() => onFieldClick?.(field)}
          >
            {field.signedAt && field.signatureData && (
              <img 
                src={field.signatureData} 
                alt="Signature" 
                className="w-full h-full object-contain"
              />
            )}
            {!field.signedAt && (
              <div className="flex items-center justify-center h-full text-xs text-blue-600 font-medium">
                Sign Here
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Convert screen coordinates to PDF coordinates
export const screenToPdfCoordinates = (
  screenX: number,
  screenY: number,
  pageHeight: number,
  scale: number
): { x: number; y: number } => {
  return {
    x: screenX / scale,
    y: (pageHeight - screenY) / scale,
  };
};

// Convert PDF coordinates to screen coordinates
export const pdfToScreenCoordinates = (
  pdfX: number,
  pdfY: number,
  pageHeight: number,
  scale: number
): { x: number; y: number } => {
  return {
    x: pdfX * scale,
    y: pageHeight - pdfY * scale,
  };
};

// Calculate field position based on mouse event
export const getFieldPositionFromEvent = (
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  pageHeight: number,
  scale: number
): { x: number; y: number } => {
  const x = clientX - containerRect.left;
  const y = clientY - containerRect.top;
  
  return screenToPdfCoordinates(x, y, pageHeight, scale);
};

// Format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Generate unique ID for fields
export const generateFieldId = (): string => {
  return `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Default field dimensions
export const DEFAULT_FIELD_WIDTH = 200;
export const DEFAULT_FIELD_HEIGHT = 50;

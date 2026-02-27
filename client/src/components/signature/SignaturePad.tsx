import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '../ui/Button';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onCancel?: () => void;
}

export const SignaturePad = ({ onSave, onCancel }: SignaturePadProps) => {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: 'signature-canvas w-full h-40',
          }}
          penColor="black"
          onEnd={() => setIsEmpty(sigCanvas.current?.isEmpty() ?? true)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={handleClear} type="button">
          Clear
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel} type="button">
            Cancel
          </Button>
        )}
        <Button onClick={handleSave} disabled={isEmpty} type="button">
          Save Signature
        </Button>
      </div>
    </div>
  );
};

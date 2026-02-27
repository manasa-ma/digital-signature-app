import { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

export const SignatureModal = ({ onSave, onClose }: { onSave: (data: string) => void, onClose: () => void }) => {
  const sigCanvas = useRef<any>(null);

  const handleSave = () => {
    if (sigCanvas.current.isEmpty()) return alert("Please provide a signature first");
    const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    onSave(dataURL);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Draw Your Signature</h2>
        <div className="border-2 border-gray-200 rounded-lg bg-gray-50 mb-4">
          <SignatureCanvas 
            ref={sigCanvas}
            canvasProps={{ width: 400, height: 200, className: 'signature-canvas w-full h-48' }} 
          />
        </div>
        <div className="flex gap-3">
          <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-2 rounded-lg font-bold hover:bg-green-700">Save</button>
          <button onClick={() => sigCanvas.current.clear()} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold">Clear</button>
          <button onClick={onClose} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-bold">Cancel</button>
        </div>
      </div>
    </div>
  );
};
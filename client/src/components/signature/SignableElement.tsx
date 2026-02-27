import { SignatureField } from '../../types';
import { PenLine } from 'lucide-react';

interface SignableElementProps {
  field: SignatureField;
  isSelected?: boolean;
  onSelect?: (field: SignatureField) => void;
}

export const SignableElement = ({ field, isSelected, onSelect }: SignableElementProps) => {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all cursor-pointer ${
        isSelected 
          ? 'border-primary-500 bg-primary-50' 
          : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect?.(field)}
    >
      <div className="p-2 bg-primary-100 rounded-lg">
        <PenLine className="w-4 h-4 text-primary-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          Signature Field
        </p>
        <p className="text-xs text-gray-500">
          {field.signedAt ? 'Signed' : 'Not signed'} • Page {field.page + 1}
        </p>
      </div>
    </div>
  );
};

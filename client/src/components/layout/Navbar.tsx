import { Menu } from 'lucide-react';

interface NavbarProps {
  title?: string;
}

export const Navbar = ({ title }: NavbarProps) => {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
      <button className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg">
        <Menu className="w-5 h-5" />
      </button>
      {title && (
        <h2 className="text-lg font-semibold ml-4">{title}</h2>
      )}
    </header>
  );
};

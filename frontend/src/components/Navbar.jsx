import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { LogOut, Map, Users, User, Compass } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 flex justify-between items-center shadow-sm border-b border-gray-100">
      <div className="flex items-center gap-12">
        <Link to="/dashboard" className="flex items-center gap-2 text-brand-600 font-black text-2xl tracking-tight">
          <Map className="w-7 h-7" />
          <span>Traveloop</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 font-medium text-gray-500">
          <Link to="/dashboard" className={`flex items-center gap-1 hover:text-brand-600 transition-colors ${location.pathname === '/dashboard' ? 'text-brand-600' : ''}`}><Compass className="w-4 h-4"/> My Trips</Link>
          <Link to="/community" className={`flex items-center gap-1 hover:text-brand-600 transition-colors ${location.pathname === '/community' ? 'text-brand-600' : ''}`}><Users className="w-4 h-4"/> Community</Link>
        </div>
      </div>
      <div className="flex gap-4 items-center">
        <Link to="/profile" className="p-2 text-gray-400 hover:text-brand-600 bg-gray-50 hover:bg-brand-50 rounded-full transition-all">
          <User className="w-5 h-5" />
        </Link>
        <div className="w-px h-6 bg-gray-200"></div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-500 hover:text-red-600 transition-colors font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </nav>
  );
}

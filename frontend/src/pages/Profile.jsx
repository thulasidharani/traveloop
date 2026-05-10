import { useState } from 'react';
import { User, Mail, Shield, Save } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function Profile({ session }) {
  const [loading, setLoading] = useState(false);
  
  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Profile</h1>
      
      <div className="glass rounded-3xl p-8 shadow-sm border border-gray-100">
        <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-24 h-24 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 text-3xl font-bold">
            {session?.user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Traveler</h2>
            <p className="text-gray-500 flex items-center gap-2"><Mail className="w-4 h-4"/> {session?.user?.email}</p>
          </div>
        </div>

        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Display Name</label>
            <input type="text" placeholder="Your Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 bg-white/70" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Bio</label>
            <textarea rows="3" placeholder="Tell us about your travel style..." className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 bg-white/70"></textarea>
          </div>
          
          <button type="button" className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-colors">
            <Save className="w-4 h-4"/> Save Changes
          </button>
        </form>
      </div>
      
      <div className="mt-8 glass rounded-3xl p-8 shadow-sm border border-red-100 bg-red-50/30">
        <h3 className="text-xl font-bold text-red-600 mb-2 flex items-center gap-2"><Shield className="w-5 h-5"/> Danger Zone</h3>
        <p className="text-gray-600 text-sm mb-4">Permanently delete your account and all associated trips.</p>
        <button className="border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-50 transition-colors">
          Delete Account
        </button>
      </div>
    </div>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from './services/supabase';

// Pages
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateTrip from './pages/CreateTrip';
import TripDetails from './pages/TripDetails';
import Community from './pages/Community';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50 font-sans text-gray-900 relative overflow-x-hidden selection:bg-brand-200 selection:text-brand-900">
        {/* Global Background Blobs */}
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-brand-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
           <div className="absolute top-[-10%] right-[-10%] w-[40rem] h-[40rem] bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
           <div className="absolute bottom-[-20%] left-[20%] w-[40rem] h-[40rem] bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {session && <Navbar />}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={!session ? <Auth /> : <Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={session ? <Dashboard session={session} /> : <Navigate to="/" />} />
              <Route path="/community" element={session ? <Community session={session} /> : <Navigate to="/" />} />
              <Route path="/profile" element={session ? <Profile session={session} /> : <Navigate to="/" />} />
              <Route path="/create-trip" element={session ? <CreateTrip session={session} /> : <Navigate to="/" />} />
              <Route path="/trip/:id" element={session ? <TripDetails session={session} /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;

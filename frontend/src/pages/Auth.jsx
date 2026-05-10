import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { Map, PlaneTakeoff, Mail, Lock, ArrowRight, Compass, Sparkles, Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [animateIn, setAnimateIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setAnimateIn(true);
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ text: 'Check your email for the login link!', type: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 font-sans selection:bg-brand-500 selection:text-white">
      {/* Left side - Visuals */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-brand-900">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-600/40 to-brand-900/90 z-10 mix-blend-multiply"></div>
        <img 
          src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop" 
          alt="Travel Landscape" 
          className="absolute inset-0 w-full h-full object-cover z-0 opacity-80"
        />
        
        {/* Animated decorative elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-brand-400/30 rounded-full mix-blend-screen filter blur-[80px] animate-blob z-10"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000 z-10"></div>

        <div className="relative z-20 flex flex-col justify-between p-16 h-full text-white">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-xl backdrop-blur-md border border-white/20 shadow-xl">
              <PlaneTakeoff className="w-8 h-8 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight">Traveloop</span>
          </div>

          <div className={`transition-all duration-1000 transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            <h1 className="text-5xl font-extrabold mb-6 leading-tight">
              Design your dream <br/>
              journey with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 to-teal-200">AI</span>.
            </h1>
            <p className="text-lg text-brand-50 max-w-md font-light leading-relaxed">
              Experience the future of travel planning. Smart itineraries, personalized recommendations, and seamless organization.
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm font-medium text-brand-100">
            <div className="flex -space-x-3">
              <img src="https://i.pravatar.cc/100?img=1" className="w-10 h-10 rounded-full border-2 border-brand-900 shadow-md" alt="user" />
              <img src="https://i.pravatar.cc/100?img=2" className="w-10 h-10 rounded-full border-2 border-brand-900 shadow-md" alt="user" />
              <img src="https://i.pravatar.cc/100?img=3" className="w-10 h-10 rounded-full border-2 border-brand-900 shadow-md" alt="user" />
              <div className="w-10 h-10 rounded-full border-2 border-brand-900 shadow-md bg-brand-800 flex items-center justify-center text-xs font-bold">+2k</div>
            </div>
            <p>Join thousands of happy travelers</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 relative overflow-hidden bg-white">
        {/* Mobile background */}
        <div className="lg:hidden absolute inset-0 z-0">
           <img 
            src="https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=2070&auto=format&fit=crop" 
            alt="Travel Landscape" 
            className="w-full h-full object-cover opacity-15"
          />
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[4px]"></div>
        </div>

        <div className={`w-full max-w-md relative z-10 transition-all duration-700 delay-100 transform ${animateIn ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="lg:hidden flex items-center gap-3 mb-10 justify-center">
            <div className="bg-brand-50 p-3 rounded-2xl border border-brand-100 shadow-sm">
              <PlaneTakeoff className="w-8 h-8 text-brand-600" />
            </div>
            <span className="text-3xl font-bold text-gray-900 tracking-tight">Traveloop</span>
          </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignUp ? 'Create an account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 text-sm sm:text-base">
              {isSignUp ? 'Start your journey with us today.' : 'Please enter your details to sign in.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700 ml-1">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-semibold text-gray-700">Password</label>
                {!isSignUp && (
                  <a href="#" className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-brand-500 transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-12 py-3.5 bg-gray-50/50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white transition-all text-gray-900 placeholder-gray-400 shadow-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {message.text && (
              <div className={`p-4 rounded-xl text-sm font-medium flex items-start gap-3 shadow-sm ${
                message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {message.type === 'error' ? (
                  <span className="mt-0.5 shrink-0 bg-red-100 p-1 rounded-full text-red-600">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </span>
                ) : (
                  <span className="mt-0.5 shrink-0 bg-emerald-100 p-1 rounded-full text-emerald-600">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </span>
                )}
                <span>{message.text}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden bg-brand-600 text-white font-semibold py-3.5 rounded-2xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_16px_rgba(13,148,136,0.25)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:pointer-events-none mt-6 flex items-center justify-center gap-2"
            >
              <span className="relative z-10">{loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
              {!loading && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-500 text-sm">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
              <button 
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setMessage({ text: '', type: '' });
                }}
                className="ml-2 font-semibold text-brand-600 hover:text-brand-700 transition-colors focus:outline-none hover:underline underline-offset-4"
              >
                {isSignUp ? 'Sign in instead' : "Create one now"}
              </button>
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

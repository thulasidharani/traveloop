import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, MapPin, Calendar, ArrowRight, Search, CloudSun, Trophy, Globe, Leaf, Mic, MicOff } from 'lucide-react';
import { apiCall } from '../services/api';
import { INSPIRATIONS } from '../data/inspirations';

export default function Dashboard({ session }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchPrompt, setSearchPrompt] = useState("");
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Voice recognition is not supported in this browser. Try Chrome.");
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setSearchPrompt(transcript);
    };
    recognition.onerror = (event) => console.error("Speech recognition error", event.error);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchPrompt.trim()) {
      navigate(`/create-trip?prompt=${encodeURIComponent(searchPrompt.trim())}`);
    } else {
      navigate('/create-trip');
    }
  };

  useEffect(() => {
    // In a real app, we'd fetch from backend. For MVP, we mock if backend isn't ready or fetch if it is.
    const fetchTrips = async () => {
      try {
        const data = await apiCall('/trips');
        setTrips(data);
      } catch (error) {
        console.log("Using mock data as backend might not be up yet.");
        setTrips([
          { id: 1, title: 'Summer in Paris', start_date: '2024-06-15', end_date: '2024-06-22', cities: 'Paris, France' },
          { id: 2, title: 'Japan Explorer', start_date: '2024-09-10', end_date: '2024-09-25', cities: 'Tokyo, Kyoto, Osaka' }
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchTrips();
  }, []);


  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      <div className="mb-8 bg-gradient-to-r from-brand-600 to-brand-400 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2">Welcome back, Traveler!</h1>
          <p className="text-brand-100 text-lg max-w-xl mb-6">Where do you want to go next?</p>
          
          {/* Quick AI Search Bar (Option 4) */}
          <form onSubmit={handleSearchSubmit} className="relative max-w-2xl mb-6 flex items-center">
             <Search className="absolute left-4 w-5 h-5 text-gray-400" />
             <input 
               type="text" 
               value={searchPrompt}
               onChange={(e) => setSearchPrompt(e.target.value)}
               placeholder={isListening ? "Listening..." : "e.g., 3 days in Goa under ₹15,000"} 
               className="w-full pl-12 pr-44 py-4 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-brand-300 shadow-lg font-medium" 
             />
             <div className="absolute right-2 flex gap-2">
               <button 
                 type="button" 
                 onClick={startListening}
                 className={`p-2 rounded-full transition flex items-center justify-center ${isListening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                 title="Voice Search"
               >
                 {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
               </button>
               <button type="submit" className="bg-brand-600 text-white px-6 py-2 rounded-full font-bold hover:bg-brand-700 transition">
                  Plan Trip
               </button>
             </div>
          </form>

          <div className="flex items-center gap-4 text-sm text-brand-100 font-medium">
             <span>Trending:</span>
             {['Bali, Indonesia', 'Kyoto, Japan', 'Swiss Alps'].map(place => (
               <span 
                 key={place} 
                 onClick={() => navigate(`/create-trip?prompt=${encodeURIComponent(`A relaxed 5-day trip to ${place}`)}`)}
                 className="bg-white/20 px-3 py-1 rounded-full cursor-pointer hover:bg-white/30 transition-colors"
               >
                 {place.split(',')[0]}
               </span>
             ))}
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-1/4 translate-y-1/4">
          <MapPin className="w-64 h-64" />
        </div>
      </div>

      {/* Travel Stats Widget (Option 2) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass p-4 rounded-2xl border border-brand-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0"><Globe className="w-6 h-6"/></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase">Countries</p><p className="text-xl font-black text-gray-900">4</p></div>
        </div>
        <div className="glass p-4 rounded-2xl border border-brand-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center shrink-0"><MapPin className="w-6 h-6"/></div>
          <div><p className="text-xs text-gray-500 font-bold uppercase">Trips Planned</p><p className="text-xl font-black text-gray-900">{trips.length || 0}</p></div>
        </div>
        <div className="glass p-4 rounded-2xl border border-green-100 bg-green-50/50 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0"><Leaf className="w-6 h-6"/></div>
          <div><p className="text-xs text-green-600 font-bold uppercase">CO₂ Offset</p><p className="text-xl font-black text-green-700">140 kg</p></div>
        </div>
        <div className="glass p-4 rounded-2xl border border-purple-100 bg-purple-50/50 flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center shrink-0"><Trophy className="w-6 h-6"/></div>
          <div><p className="text-xs text-purple-600 font-bold uppercase">Traveler Level</p><p className="text-lg font-black text-purple-700 leading-tight">Gold Explorer</p></div>
        </div>
      </div>



      <div className="mb-10">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Your Trips</h2>
          <Link to="/create-trip" className="bg-brand-50 text-brand-600 px-4 py-2 rounded-xl font-bold hover:bg-brand-100 transition flex items-center gap-2 shadow-sm">
            <Plus className="w-4 h-4"/> New Trip
          </Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>)}
          </div>
        ) : trips.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map(trip => (
              <Link to={`/trip/${trip.id}`} key={trip.id} className="group block">
                <div className="glass rounded-2xl p-6 h-full border border-gray-100 hover:border-brand-300 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-brand-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-brand-100 transition-colors"></div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 relative z-10">{trip.title}</h3>
                  <div className="flex items-center gap-2 text-gray-500 mb-4 relative z-10">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm">{trip.cities}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto relative z-10">
                    <div className="flex items-center gap-2 text-sm text-brand-600 bg-brand-50 px-3 py-1 rounded-full font-medium">
                      <Calendar className="w-4 h-4" />
                      {new Date(trip.start_date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                    </div>
                    <div className="bg-white p-2 rounded-full shadow-sm text-brand-500 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 glass rounded-2xl">
            <p className="text-gray-500">No trips planned yet.</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Inspiration & Community Trips</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {INSPIRATIONS.map((place, i) => (
            <Link 
              key={i} 
              to={`/create-trip?prompt=${encodeURIComponent(`A 5-day trip to ${place.name}`)}`}
              className="h-32 rounded-xl relative overflow-hidden group cursor-pointer shadow-md block"
            >
              <img 
                src={place.img} 
                alt={place.name} 
                loading="lazy" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80' }}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent group-hover:from-black/60 transition-colors flex items-end p-4">
                <span className="text-white font-semibold text-sm leading-tight drop-shadow-md">{place.name}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

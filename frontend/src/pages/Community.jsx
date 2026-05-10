import { useState } from 'react';
import { MapPin, Search, Heart, User, Clock, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../services/api';
import { INSPIRATIONS } from '../data/inspirations';

export default function Community({ session }) {
  const navigate = useNavigate();
  const [cloningId, setCloningId] = useState(null);

  const mockPublicTrips = INSPIRATIONS.map((place, index) => {
    const names = ["Alex Walker", "Sarah Snow", "Kenji Sato", "Mia Chen", "Liam Johnson", "Emma Davis", "Noah Martinez", "Olivia Smith", "Ethan Brown", "Ava Wilson"];
    const titles = ['Backpacking through', 'A week in', 'Cultural Tour of', 'Exploring', 'Relaxing trip to', 'Family vacation in', 'Weekend getaway to', 'Solo adventure in'];
    return {
      id: 100 + index,
      title: `${titles[index % titles.length]} ${place.name.split(',')[0]}`,
      cities: place.name,
      user: names[index % names.length],
      likes: (index * 17) % 350 + 10, // Deterministic pseudo-random likes
      days: (index % 10) + 3,
      img: place.img
    };
  });

  const handleCloneTrip = async (trip) => {
    setCloningId(trip.id);
    try {
      const res = await apiCall('/create-trip', {
        method: 'POST',
        body: JSON.stringify({
          user_id: session?.user?.id || 'demo-user',
          title: `${trip.title} (Cloned)`,
          cities: trip.cities,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + trip.days * 86400000).toISOString().split('T')[0]
        })
      });
      if (res.id) {
        navigate(`/trip/${res.id}`);
      }
    } catch (error) {
      alert("Failed to clone trip.");
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Trips</h1>
        <p className="text-gray-500">Get inspired by itineraries crafted by fellow travelers.</p>
      </div>

      <div className="relative max-w-xl mx-auto mb-10">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="Search for destinations, activities..." 
          className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {mockPublicTrips.map(trip => (
          <div key={trip.id} className="glass rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group cursor-pointer border border-gray-100">
            <div className="h-48 overflow-hidden relative">
              <img 
                src={trip.img} 
                alt={trip.title} 
                loading="lazy" 
                onError={(e) => { e.target.onerror = null; e.target.src = 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80' }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-sm font-bold text-gray-700 shadow-sm">
                <Heart className="w-4 h-4 text-red-500 fill-current" /> {trip.likes}
              </div>
            </div>
            <div className="p-6">
              <h3 className="font-bold text-xl text-gray-900 mb-2 line-clamp-1">{trip.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1"><User className="w-4 h-4"/> {trip.user}</span>
                <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {trip.days} Days</span>
              </div>
              <button 
                onClick={() => handleCloneTrip(trip)}
                disabled={cloningId === trip.id}
                className="w-full py-2 bg-brand-50 text-brand-600 font-bold rounded-xl group-hover:bg-brand-600 group-hover:text-white transition-colors flex justify-center items-center gap-2"
              >
                {cloningId === trip.id ? 'Cloning...' : <><Copy className="w-4 h-4"/> Clone Itinerary</>}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

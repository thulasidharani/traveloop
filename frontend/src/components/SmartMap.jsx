import { useEffect, useState, useRef } from 'react';
import { Navigation, MapPin, CheckCircle, ExternalLink } from 'lucide-react';
import { apiCall } from '../services/api';

export default function SmartMap({ city }) {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [places, setPlaces] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [nextStops, setNextStops] = useState({ next: null, nextNext: null });
  const [tracking, setTracking] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const userMarkerRef = useRef(null);
  const routingControlRef = useRef(null);

  // Update real-time route when tracking
  useEffect(() => {
    if (tracking && userLoc && nextStops.next && routingControlRef.current) {
       routingControlRef.current.setWaypoints([
          window.L.latLng(userLoc.lat, userLoc.lng),
          window.L.latLng(nextStops.next.lat, nextStops.next.lng)
       ]);
    } else if (!tracking && places.length > 0 && routingControlRef.current) {
       routingControlRef.current.setWaypoints(places.map(l => window.L.latLng(l.lat, l.lng)));
    }
  }, [tracking, userLoc, nextStops.next, places]);

  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const data = await apiCall(`/places?city=${encodeURIComponent(city)}`);
        setPlaces(data);
        initMap(data);
      } catch (error) {
        console.error("Failed to fetch places", error);
      }
    };

    if (!window.L) {
      // Dynamically load Leaflet
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      
      script.onload = () => {
         // Load Routing Machine after Leaflet
         const link2 = document.createElement('link');
         link2.rel = 'stylesheet';
         link2.href = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.css';
         document.head.appendChild(link2);

         const script2 = document.createElement('script');
         script2.src = 'https://unpkg.com/leaflet-routing-machine@3.2.12/dist/leaflet-routing-machine.js';
         script2.async = true;
         script2.onload = () => fetchPlaces();
         document.body.appendChild(script2);
      };
      
      document.body.appendChild(script);
    } else {
      fetchPlaces();
    }
  }, [city]);

  // Frontend calculation for next stops ensures instantaneous UI updates when "Mark as Visited" is clicked
  useEffect(() => {
    if (!userLoc || places.length === 0) return;
    
    const unvisited = places.filter(p => !p.visited);
    if (unvisited.length === 0) {
      setNextStops({ next: null, nextNext: null });
      return;
    }
    
    // Sort unvisited places by distance from user
    const sorted = [...unvisited].sort((a, b) => {
      const distA = Math.hypot(a.lat - userLoc.lat, a.lng - userLoc.lng);
      const distB = Math.hypot(b.lat - userLoc.lat, b.lng - userLoc.lng);
      return distA - distB;
    });

    setNextStops({ next: sorted[0], nextNext: sorted[1] || null });
  }, [places, userLoc]);

  const initMap = (locations) => {
    if (!window.L || !mapRef.current) return;
    
    // Clean up previous map instance if it exists
    if (mapRef.current._leaflet_id) {
       mapRef.current.outerHTML = `<div id="map-container" class="w-full h-full rounded-[1.25rem] bg-gray-100 z-10"></div>`;
       mapRef.current = document.getElementById('map-container');
    }
    
    const center = locations.length > 0 ? [locations[0].lat, locations[0].lng] : [15.5553, 73.7517];
    const lmap = window.L.map(mapRef.current).setView(center, 12);
    
    // Using a beautiful free tile layer (CartoDB Voyager)
    window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(lmap);
    
    setMap(lmap);

    // Helper to get emoji based on place name
    const getIconHTML = (name) => {
       const lowerName = (name || '').toLowerCase();
       let emoji = '📍'; // Default Map Pin
       if (lowerName.includes('flight') || lowerName.includes('airport') || lowerName.includes('terminal')) emoji = '✈️';
       else if (lowerName.includes('restaurant') || lowerName.includes('food') || lowerName.includes('cafe') || lowerName.includes('dining') || lowerName.includes('bar')) emoji = '🍽️';
       else if (lowerName.includes('hotel') || lowerName.includes('stay') || lowerName.includes('resort') || lowerName.includes('villa')) emoji = '🏨';
       else if (lowerName.includes('park') || lowerName.includes('garden') || lowerName.includes('nature') || lowerName.includes('forest')) emoji = '🌳';
       else if (lowerName.includes('museum') || lowerName.includes('art') || lowerName.includes('gallery') || lowerName.includes('temple') || lowerName.includes('church')) emoji = '🏛️';
       else if (lowerName.includes('beach') || lowerName.includes('sea') || lowerName.includes('coast') || lowerName.includes('ocean')) emoji = '🏖️';
       else if (lowerName.includes('train') || lowerName.includes('station') || lowerName.includes('railway')) emoji = '🚂';
       else if (lowerName.includes('mountain') || lowerName.includes('hike') || lowerName.includes('peak')) emoji = '⛰️';
       else if (lowerName.includes('shop') || lowerName.includes('mall') || lowerName.includes('market')) emoji = '🛍️';
       
       return `<div style="font-size: 16px; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; background: white; border-radius: 50%; border: 2px solid #3b82f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.2);">${emoji}</div>`;
    };

    // Draw Destination Markers
    locations.forEach((loc, idx) => {
      const customIcon = window.L.divIcon({
        html: getIconHTML(loc.name),
        className: 'custom-leaflet-icon',
        iconSize: [32, 32],
        iconAnchor: [16, 16], // Anchor in center
        popupAnchor: [0, -16]
      });
      const marker = window.L.marker([loc.lat, loc.lng], { icon: customIcon }).addTo(lmap);
      marker.bindPopup(`<b>${idx + 1}. ${loc.name}</b>`);
      marker.on('click', () => setSelectedPlace(loc));
    });

    // Draw Real Road Directions (Google Maps style) using OSRM
    if (window.L.Routing) {
      if (routingControlRef.current) {
         lmap.removeControl(routingControlRef.current);
      }
      const waypoints = locations.map(l => window.L.latLng(l.lat, l.lng));
      routingControlRef.current = window.L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: false,
        addWaypoints: false,
        show: false, // Hide the text instructions box
        createMarker: function() { return null; }, // We already drew custom markers above
        lineOptions: {
          styles: [{color: '#3b82f6', opacity: 0.8, weight: 6}]
        }
      }).addTo(lmap);
    } else {
      // Fallback to straight line if routing machine failed to load
      const routeCoords = locations.map(l => [l.lat, l.lng]);
      window.L.polyline(routeCoords, {color: '#3b82f6', weight: 4, dashArray: '5, 10'}).addTo(lmap);
    }
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setTracking(true);
    
    // Watch position
    navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLoc({ lat, lng });

        // Update Map Marker
        if (map && window.L) {
          if (!userMarkerRef.current) {
             userMarkerRef.current = window.L.circleMarker([lat, lng], {
               radius: 8,
               fillColor: "#ef4444",
               color: "#ffffff",
               weight: 2,
               opacity: 1,
               fillOpacity: 1
             }).addTo(map);
             userMarkerRef.current.bindPopup("<b>You are here</b>").openPopup();
          } else {
             userMarkerRef.current.setLatLng([lat, lng]);
          }
          map.panTo([lat, lng]);
        }
      },
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
  };

  const markVisited = (placeName) => {
    // Update local state so the useEffect recalculates the next stop immediately
    setPlaces(prev => prev.map(p => p.name === placeName ? { ...p, visited: true } : p));
  };

  const handleAiMapSubmit = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await apiCall('/ai/map-places', {
        method: 'POST',
        body: JSON.stringify({ city, prompt: aiPrompt })
      });
      if (res.status === 'success' && res.places) {
        setPlaces(prev => [...prev, ...res.places]);
        setAiPrompt("");
        // Re-init map to draw new places
        initMap([...places, ...res.places]);
      }
    } catch (error) {
      alert("AI mapping failed.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Sidebar for Tracking Info */}
      <div className="w-full md:w-1/3 space-y-4">
        <div className="glass p-6 rounded-2xl shadow-sm border border-brand-100">
          <h3 className="font-bold text-xl text-gray-900 mb-4 flex items-center gap-2">
            <Navigation className="text-brand-600" /> Live GPS Tracking
          </h3>
          
          {!tracking ? (
            <button onClick={startTracking} className="w-full bg-brand-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-brand-700 transition">
              Start Tracking Route
            </button>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <span className="font-semibold text-sm">GPS Active & Tracking</span>
              </div>

              {nextStops.next && (
                <div className="bg-brand-50 p-4 rounded-xl border border-brand-100">
                  <p className="text-xs font-bold text-brand-500 uppercase mb-1">➡ Next Stop</p>
                  <p className="font-bold text-gray-900 text-lg mb-3">{nextStops.next.name}</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => markVisited(nextStops.next.name)} className="flex-1 bg-white border border-brand-200 text-brand-600 text-sm font-bold py-2 rounded-lg hover:bg-brand-100 transition flex items-center justify-center gap-1">
                      <CheckCircle className="w-4 h-4"/> Mark Visited
                    </button>
                    {userLoc && (
                      <a 
                        href={`https://www.google.com/maps/dir/?api=1&origin=${userLoc.lat},${userLoc.lng}&destination=${nextStops.next.lat},${nextStops.next.lng}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="bg-brand-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-brand-700 transition flex items-center justify-center shadow-sm whitespace-nowrap"
                        title="Navigate in Google Maps"
                      >
                        <ExternalLink className="w-4 h-4" /> Go
                      </a>
                    )}
                  </div>
                </div>
              )}

              {nextStops.nextNext && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 opacity-70">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">➡ Up Next</p>
                  <p className="font-bold text-gray-700">{nextStops.nextNext.name}</p>
                </div>
              )}

              {!nextStops.next && places.length > 0 && places.every(p => p.visited) && (
                <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center animate-fade-in shadow-sm">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-green-800 text-lg mb-1">Journey Complete!</h4>
                  <p className="text-green-600 text-sm mb-4">You have visited all locations on your itinerary.</p>
                  <button 
                    onClick={() => {
                      alert("Trip Ended Successfully! Great job finishing your itinerary.");
                      setTracking(false);
                    }} 
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-md hover:bg-green-700 transition active:scale-95"
                  >
                    Finish Travel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedPlace && (
          <div className="glass p-6 rounded-2xl shadow-lg border border-brand-200 animate-fade-in relative overflow-hidden bg-white/80 backdrop-blur-md">
             <button onClick={() => setSelectedPlace(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center font-bold transition">✕</button>
             <h4 className="font-bold text-xl text-gray-900 mb-3 pr-6 leading-tight">{selectedPlace.name}</h4>
             <div className="h-40 w-full rounded-xl overflow-hidden mb-4 shadow-sm border border-gray-100 relative group">
               <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors z-10 pointer-events-none"></div>
               <img src={`https://picsum.photos/seed/${encodeURIComponent(selectedPlace.name)}/400/200`} className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700" alt={selectedPlace.name} />
             </div>
             <p className="text-sm text-gray-600 mb-5 leading-relaxed">
               Ready to explore <b>{selectedPlace.name}</b>? This location has been marked on your personalized itinerary.
             </p>
             <div className="flex gap-3">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.lat},${selectedPlace.lng}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="bg-brand-600 text-white flex-1 text-sm font-bold py-2.5 rounded-xl hover:bg-brand-700 transition flex items-center justify-center shadow-md active:scale-95"
                >
                  <Navigation className="w-4 h-4 mr-2" /> Open in Google Maps
                </a>
             </div>
          </div>
        )}
        
        <div className="glass p-6 rounded-2xl shadow-sm border border-gray-100">
          <h4 className="font-bold text-gray-800 mb-4">Route Plan</h4>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-300 before:to-transparent">
            {places.map((p, i) => (
              <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className={`flex items-center justify-center w-6 h-6 rounded-full border-4 border-white shrink-0 md:order-1 shadow-sm ${p.visited ? 'bg-green-500' : 'bg-brand-400'}`}></div>
                <div 
                  onClick={() => setSelectedPlace(p)} 
                  className={`w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl shadow-sm border cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${p.visited ? 'bg-green-50 border-green-100' : 'bg-white border-gray-100'} ${selectedPlace?.name === p.name ? 'ring-2 ring-brand-500 border-transparent bg-brand-50' : ''}`}
                >
                   <p className={`font-semibold text-sm ${p.visited ? 'text-green-700' : 'text-gray-800'}`}>{p.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actual Map Area */}
      <div className="w-full md:w-2/3 flex flex-col gap-4">
        
        {/* AI Map Configurator */}
        <form onSubmit={handleAiMapSubmit} className="glass p-4 rounded-2xl shadow-sm border border-brand-100 flex gap-4 items-center">
          <input 
            type="text" 
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="Ask AI to add places (e.g. 'Show me nearby veg restaurants')" 
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 bg-white/70 outline-none"
          />
          <button 
            type="submit" 
            disabled={aiLoading}
            className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {aiLoading ? 'Asking AI...' : 'Add to Map'}
          </button>
        </form>

        <div className="h-[600px] glass p-2 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div id="map-container" ref={mapRef} className="w-full h-full rounded-[1.25rem] bg-gray-100 z-10 relative">
             {!map && <div className="absolute inset-0 flex items-center justify-center animate-pulse text-gray-400 font-medium">Loading Interactive Map...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

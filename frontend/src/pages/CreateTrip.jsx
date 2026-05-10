import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiCall } from '../services/api';
import { MapPin, Calendar, Type, Sparkles, Wand2, Wallet, Users, CloudSun } from 'lucide-react';

export default function CreateTrip({ session }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialPrompt = searchParams.get('prompt') || '';

  const [formData, setFormData] = useState({
    title: '',
    cities: '',
    start_date: '',
    end_date: '',
    budget: 5000,
    adults: 1,
    children: 0,
    ai_prompt: initialPrompt
  });

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [liveWeather, setLiveWeather] = useState(null);

  const [styles, setStyles] = useState([]);
  const availableStyles = ['Adventure 🏔️', 'Luxury 🥂', 'Backpacking 🎒', 'Family 👨‍👩‍👧', 'Culture 🏛️', 'Romantic 💖'];

  const toggleStyle = (style) => {
    setStyles(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
  };

  const getCurrencySymbol = (citiesStr) => {
    if (!citiesStr) return '₹';
    const c = String(citiesStr).toLowerCase();
    if (c.includes('india') || c.includes('ind') || c.includes('goa') || c.includes('delhi') || c.includes('mumbai') || c.includes('chennai') || c.includes('kerala')) return '₹';
    if (c.includes('uk') || c.includes('london') || c.includes('england') || c.includes('scotland')) return '£';
    if (c.includes('europe') || c.includes('france') || c.includes('paris') || c.includes('italy') || c.includes('rome') || c.includes('germany') || c.includes('spain') || c.includes('barcelona') || c.includes('amsterdam') || c.includes('netherlands') || c.includes('greece') || c.includes('portugal')) return '€';
    if (c.includes('swiss') || c.includes('zurich') || c.includes('switzerland')) return 'CHF ';
    if (c.includes('japan') || c.includes('tokyo') || c.includes('kyoto') || c.includes('osaka')) return '¥';
    if (c.includes('dubai') || c.includes('uae') || c.includes('abu dhabi')) return 'AED ';
    if (c.includes('bali') || c.includes('indonesia') || c.includes('jakarta')) return 'Rp ';
    if (c.includes('thai') || c.includes('bangkok') || c.includes('phuket')) return '฿';
    if (c.includes('singapore')) return 'S$';
    if (c.includes('malaysia') || c.includes('kuala lumpur')) return 'RM ';
    if (c.includes('australia') || c.includes('sydney') || c.includes('melbourne')) return 'A$';
    if (c.includes('canada') || c.includes('toronto') || c.includes('vancouver')) return 'C$';
    if (c.includes('korea') || c.includes('seoul')) return '₩';
    if (c.includes('vietnam') || c.includes('hanoi') || c.includes('ho chi minh')) return '₫';
    return '$';
  };

  const calculateDays = () => {
    if (!formData.start_date || !formData.end_date) return 1;
    const start = new Date(formData.start_date);
    const end = new Date(formData.end_date);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const getBudgetLimits = (citiesStr, days, selectedStyles, adults, children) => {
    const lower = citiesStr.toLowerCase();
    
    let baseMin, baseMax, baseStep, baseDefault, maxLabelSuffix;
    
    if (lower.includes('india') || lower.includes('goa') || lower.includes('ooty') || lower.includes('delhi') || lower.includes('mumbai')) {
      baseMin = 1000; baseMax = 25000; baseStep = 500; baseDefault = 5000; maxLabelSuffix = 'L+';
    }
    else if (lower.includes('japan') || lower.includes('tokyo') || lower.includes('kyoto') || lower.includes('osaka')) {
      baseMin = 10000; baseMax = 200000; baseStep = 5000; baseDefault = 40000; maxLabelSuffix = 'M+';
    }
    else if (lower.includes('bali') || lower.includes('indonesia')) {
      baseMin = 200000; baseMax = 5000000; baseStep = 100000; baseDefault = 1000000; maxLabelSuffix = 'M+';
    }
    else {
      // Default / USD / Euro / GBP
      baseMin = 100; baseMax = 5000; baseStep = 100; baseDefault = 1000; maxLabelSuffix = 'k+';
    }
    
    // Apply multipliers based on travel vibes
    let minMultiplier = 1;
    let maxMultiplier = 1;
    
    const stylesStr = selectedStyles.join(' ').toLowerCase();
    if (stylesStr.includes('luxury')) {
      minMultiplier = 3.5;
      maxMultiplier = 5;
    } else if (stylesStr.includes('backpacking')) {
      minMultiplier = 0.5;
      maxMultiplier = 0.6;
    } else if (stylesStr.includes('family')) {
      minMultiplier = 1.2; // Slight additional scaling on top of member count
      maxMultiplier = 1.5;
    } else if (stylesStr.includes('romantic')) {
      minMultiplier = 1.5;
      maxMultiplier = 2;
    }
    
    // Calculate total effective travelers (kids count for less budget)
    const effectiveTravelers = Math.max((parseInt(adults) || 1) + (parseInt(children || 0) * 0.7), 1);
    
    // Multiply base amounts by the number of days AND effective travelers
    const min = Math.ceil((baseMin * minMultiplier) * days * effectiveTravelers);
    const max = Math.ceil((baseMax * maxMultiplier) * days * effectiveTravelers);
    const step = baseStep * days;
    const def = Math.ceil((baseDefault * minMultiplier) * days * effectiveTravelers);
    
    let label = '';
    if (maxLabelSuffix === 'L+') label = `${(max / 100000).toFixed(1)}L+`;
    else if (maxLabelSuffix === 'M+') label = `${(max / 1000000).toFixed(1)}M+`;
    else label = `${(max / 1000).toFixed(1)}k+`;
    
    return { min, max, step, default: def, maxLabel: label.replace('.0', '') };
  };

  const currencySymbol = getCurrencySymbol(formData.cities);
  const budgetLimits = getBudgetLimits(formData.cities, calculateDays(), styles, formData.adults, formData.children);

  useEffect(() => {
    if (formData.budget < budgetLimits.min || formData.budget > budgetLimits.max) {
      setFormData(prev => ({ ...prev, budget: budgetLimits.default }));
    }
  }, [budgetLimits.min, budgetLimits.max, budgetLimits.default]);

  const handleMagicFill = (promptToUse = formData.ai_prompt) => {
    // Safety check if an event object was passed by mistake
    if (typeof promptToUse !== 'string') {
       promptToUse = formData.ai_prompt;
    }

    if (!promptToUse || typeof promptToUse !== 'string' || promptToUse.trim() === '') {
      alert("Please enter a prompt first (e.g., 'A relaxed 5-day trip to Bali')");
      return;
    }
    
    let foundCity = "";
    
    // First try: look for "in [City]" or "to [City]"
    const match = promptToUse.match(/(?:in|to)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)*)/i);
    if (match && match[1]) {
       foundCity = match[1].trim();
       // Stop at keywords that usually follow a city
       foundCity = foundCity.split(/\s+(mostly|and|with|for|under|cheap|luxury)\s+/i)[0];
    } else {
       // Fallback: Just take the first 1-2 words
       const words = promptToUse.split(' ').filter(w => w.length > 0);
       foundCity = words.slice(0, 2).join(' ').replace(/[^a-zA-Z\s]/g, '');
    }
    
    // Capitalize properly
    if (!foundCity || foundCity.trim() === '') foundCity = "Mystery Destination";
    foundCity = foundCity.split(' ').map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '').join(' ').trim();
    
    let days = 5;
    const dayMatch = promptToUse.match(/(\d+)\s*(?:day|night|wk|week)/i);
    if (dayMatch && dayMatch[1]) {
       days = parseInt(dayMatch[1], 10);
    }
    
    let newAdults = formData.adults || 1;
    let newChildren = formData.children || 0;
    
    if (promptToUse.match(/family/i)) {
      newAdults = 2;
      newChildren = 2;
    } else if (promptToUse.match(/couple|romantic|for 2|two/i)) {
      newAdults = 2;
      newChildren = 0;
    } else if (promptToUse.match(/solo/i)) {
      newAdults = 1;
      newChildren = 0;
    }
    
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date();
    end.setDate(end.getDate() + days); 
    
    setFormData(prev => ({
      ...prev,
      title: `${foundCity} Trip`,
      cities: foundCity,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      adults: newAdults,
      children: newChildren,
      ai_prompt: promptToUse
    }));
  };

  useEffect(() => {
    if (initialPrompt) {
      handleMagicFill(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    const fetchCities = async () => {
      // Don't fetch if it looks like a full address (contains comma) to prevent refetching after selection
      if (formData.cities.length < 3 || formData.cities.includes(',')) {
        setSuggestions([]);
        return;
      }
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(formData.cities)}&count=5&language=en&format=json`);
        const data = await res.json();
        if (data.results) {
          setSuggestions(data.results);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Geocoding error", error);
      }
    };

    const timerId = setTimeout(() => {
      fetchCities();
    }, 500);

    return () => clearTimeout(timerId);
  }, [formData.cities]);

  useEffect(() => {
    if (formData.cities.length < 3) {
      setLiveWeather(null);
      return;
    }
    
    const fetchWeather = async () => {
      try {
        const cityName = formData.cities.split(',')[0].trim();
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();
        
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude } = geoData.results[0];
          const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const weatherData = await weatherRes.json();
          
          if (weatherData.current_weather) {
             const code = weatherData.current_weather.weathercode;
             let desc = 'Clear/Sunny';
             if (code >= 51 && code <= 67) desc = 'Rainy';
             else if (code >= 71 && code <= 77) desc = 'Snowy';
             else if (code >= 1 && code <= 3) desc = 'Cloudy';
             
             setLiveWeather({
               temp: weatherData.current_weather.temperature,
               desc: desc,
               city: cityName
             });
          }
        }
      } catch (e) {
        console.error("Weather fetch failed", e);
      }
    };

    const timerId = setTimeout(() => {
      fetchWeather();
    }, 1200); // Wait 1.2s after user stops typing

    return () => clearTimeout(timerId);
  }, [formData.cities]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalPrompt = formData.ai_prompt;
      if (styles.length > 0) {
        finalPrompt += ` [Preferences: ${styles.join(', ')}]`;
      }
      if (formData.adults > 1 || formData.children > 0) {
        finalPrompt += ` [Travelers: ${formData.adults} Adults, ${formData.children} Children]`;
      }

      // Send to backend
      const res = await apiCall('/create-trip', {
        method: 'POST',
        body: JSON.stringify({ ...formData, ai_prompt: finalPrompt, user_id: session.user.id })
      });
      // Redirect to trip details
      navigate(`/trip/${res.id || 1}`); // fallback to 1 for mock
    } catch (error) {
      console.log('Mocking creation since backend might not be up');
      setTimeout(() => navigate(`/trip/1`), 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] animate-fade-in">
      {/* Left Form Side */}
      <div className="w-full lg:w-[55%] p-8 lg:p-12 overflow-y-auto">
        <div className="max-w-xl mx-auto">
          <div className="text-center md:text-left mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Where to next?</h1>
            <p className="text-gray-500 text-lg">Plan your dream trip with a little help from AI.</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            
            {/* AI Prompt First for easy Magic Fill */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-brand-50 border border-brand-200 shadow-sm relative overflow-hidden group">
              <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-110 transition-transform duration-700"><Sparkles className="w-32 h-32 text-brand-600"/></div>
              <div className="relative z-10 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-extrabold text-brand-800 flex items-center gap-2 uppercase tracking-wide"><Sparkles className="w-4 h-4"/> AI Auto-Pilot</label>
                  <button type="button" onClick={() => handleMagicFill(formData.ai_prompt)} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-full font-bold hover:bg-brand-700 hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-sm">
                    <Wand2 className="w-3.5 h-3.5" /> Magic Auto-Fill
                  </button>
                </div>
                <textarea name="ai_prompt" value={formData.ai_prompt} onChange={handleChange} placeholder="e.g. 5 days in Bali, mostly beaches and food for 2 adults" rows="2" className="w-full px-5 py-4 rounded-xl border-2 border-transparent focus:border-brand-300 focus:ring-4 focus:ring-brand-100 bg-white/90 backdrop-blur-sm transition-all text-gray-800 text-lg shadow-inner placeholder:text-gray-400"></textarea>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Type className="w-4 h-4 text-brand-500"/> Trip Name</label>
                <input name="title" value={formData.title} onChange={handleChange} required placeholder="e.g. Summer Eurotrip" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 bg-white shadow-sm transition-all text-gray-900 font-medium" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Users className="w-4 h-4 text-brand-500"/> Adults</label>
                <input type="number" name="adults" min="1" max="20" value={formData.adults} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 bg-white shadow-sm transition-all text-gray-900 font-bold" />
              </div>
              <div className="space-y-2 md:col-span-1">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 opacity-80"><Users className="w-4 h-4"/> Kids (&lt;18)</label>
                <input type="number" name="children" min="0" max="20" value={formData.children} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 bg-white shadow-sm transition-all text-gray-900 font-bold" />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-500"/> Destinations</label>
              <input 
                name="cities" 
                value={formData.cities} 
                onChange={(e) => { handleChange(e); setShowSuggestions(true); }} 
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                required 
                placeholder="e.g. Paris, Rome, Barcelona" 
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 bg-white shadow-sm transition-all text-gray-900 font-medium" 
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-2xl overflow-hidden top-full">
                  {suggestions.map((place, idx) => (
                    <div 
                      key={idx} 
                      className="px-4 py-3 hover:bg-brand-50 cursor-pointer flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                      onClick={() => {
                        const locationStr = `${place.name}, ${place.admin1 ? place.admin1 + ', ' : ''}${place.country}`;
                        setFormData(prev => ({ ...prev, cities: locationStr }));
                        setShowSuggestions(false);
                      }}
                    >
                      <MapPin className="w-4 h-4 text-brand-400" />
                      <div>
                        <p className="text-sm font-bold text-gray-800">{place.name}</p>
                        <p className="text-xs text-gray-500">{place.admin1 ? place.admin1 + ', ' : ''}{place.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {liveWeather && (
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 animate-fade-in pl-1">
                  <CloudSun className="w-4 h-4 text-brand-500" />
                  <span>Currently <strong>{liveWeather.temp}°C</strong> and {liveWeather.desc} in {liveWeather.city}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-500"/> Start Date</label>
                <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 bg-white shadow-sm transition-all text-gray-900 font-medium" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Calendar className="w-4 h-4 text-brand-500"/> End Date</label>
                <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 bg-white shadow-sm transition-all text-gray-900 font-medium" />
              </div>
            </div>

            {/* Travel Style Chips */}
            <div className="space-y-2 mt-2">
              <label className="text-sm font-semibold text-gray-700">Travel Vibe (Optional)</label>
              <div className="flex flex-wrap gap-2">
                {availableStyles.map(style => (
                   <button 
                     type="button" 
                     key={style}
                     onClick={() => toggleStyle(style)}
                     className={`px-4 py-2 rounded-full text-sm font-medium transition-all border shadow-sm ${styles.includes(style) ? 'bg-brand-600 text-white border-brand-600 scale-105' : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:bg-brand-50'}`}
                   >
                     {style}
                   </button>
                ))}
              </div>
            </div>

            {/* Interactive Budget Slider */}
            <div className="space-y-2 mt-2">
               <div className="flex justify-between items-center">
                 <label className="text-sm font-semibold text-gray-700 flex items-center gap-2"><Wallet className="w-4 h-4"/> Budget Limit</label>
                 <span className="font-bold text-xl text-brand-600">{currencySymbol}{parseInt(formData.budget).toLocaleString()}</span>
               </div>
               <input 
                 type="range" 
                 name="budget" 
                 min={budgetLimits.min} 
                 max={budgetLimits.max} 
                 step={budgetLimits.step} 
                 value={formData.budget} 
                 onChange={handleChange} 
                 className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-600"
               />
               <div className="flex justify-between text-xs text-gray-400 font-medium px-1">
                 <span>Economy ({currencySymbol}{budgetLimits.min.toLocaleString()})</span>
                 <span>Luxury ({currencySymbol}{budgetLimits.maxLabel})</span>
               </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-brand-900 hover:bg-brand-950 text-white font-black py-4 rounded-xl transition-all hover:shadow-2xl hover:-translate-y-1 disabled:opacity-70 mt-4 flex justify-center items-center gap-2 text-lg uppercase tracking-wide">
              {loading ? 'Creating Magic...' : 'Generate Itinerary ✨'}
            </button>
          </form>
        </div>
      </div>

      {/* Right Image Side (Split Screen) */}
      <div className="hidden lg:flex lg:w-[45%] relative bg-gray-900 overflow-hidden flex-col justify-end p-16 sticky top-16 h-[calc(100vh-4rem)]">
        <img 
          src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?q=80&w=2000&auto=format&fit=crop" 
          alt="Travel Inspiration" 
          className="absolute inset-0 w-full h-full object-cover opacity-60 hover:scale-105 transition-transform duration-1000" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        
        {/* Live Weather Floating Widget */}
        {liveWeather && (
          <div className="absolute top-8 right-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 text-white shadow-2xl animate-fade-in z-20">
             <CloudSun className="w-8 h-8 text-yellow-300" />
             <div>
               <p className="text-xs uppercase tracking-wider text-white/70 font-bold mb-1">Live from {liveWeather.city}</p>
               <p className="font-medium text-lg leading-none">{liveWeather.temp}°C • {liveWeather.desc}</p>
             </div>
          </div>
        )}

        <div className="relative z-10 mb-8">
          <div className="bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold px-4 py-2 rounded-full inline-block mb-6 shadow-lg">
            AI-Powered Planning
          </div>
          <h2 className="text-5xl font-extrabold text-white mb-6 leading-tight drop-shadow-lg">Let AI craft your perfect journey.</h2>
          <p className="text-xl text-gray-200 drop-shadow-md">Say goodbye to hours of research. Enter your preferences and watch magic happen instantly.</p>
        </div>
      </div>
    </div>
  );
}

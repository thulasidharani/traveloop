# Traveloop AI 🌍✈️

Traveloop AI is a next-generation intelligent travel planner built for hackathons and beyond. It leverages Generative AI and real-time geocoding to automatically craft customized itineraries, budget breakdowns, packing checklists, and interactive maps in seconds.

## ✨ Key Features
- **AI-Powered Itineraries:** Instantly generates day-by-day travel plans based on your destination, budget, and travel vibe using **Google Gemini 1.5 Flash**.
- **Smart GPS Mapping:** Dynamically plots destinations on an interactive map. If AI fails, a robust fallback uses **Open-Meteo Geocoding** to ensure locations are mapped precisely.
- **Live Expense Tracking:** Auto-generates a detailed budget breakdown (Accommodation, Food, Activities) visualized via Recharts. Add manual activities, and the pie charts update live!
- **Global Currency Sync:** Dynamically displays the correct currency symbol based on the chosen destination (e.g., ₹ for India, € for Europe, ฿ for Thailand).
- **Eco-Impact Analytics:** Suggests eco-friendly travel tips and tracks estimated CO2 footprints.

## 🛠️ Tech Stack
- **Frontend:** React.js (Vite), Tailwind CSS, Lucide Icons, Recharts, Leaflet (React-Leaflet).
- **Backend:** Python, FastAPI, Uvicorn.
- **AI & Data APIs:** Google Generative AI (Gemini 1.5 Flash), Open-Meteo Geocoding API.
- **Database / Auth:** Supabase.

## 🚀 Quick Start Guide

### 1. Clone the repository
```bash
git clone https://github.com/hemnath0929/travel_loop_pent.git
cd travel_loop_pent
```

### 2. Setup the Backend (FastAPI)
```bash
cd backend
# Create a virtual environment
python -m venv .venv
source .venv/Scripts/activate # On Windows

# Install dependencies
pip install -r requirements.txt

# Create a .env file based on the environment variables needed
# Add your GEMINI_API_KEY, SUPABASE_URL, and SUPABASE_SERVICE_KEY
```

Run the backend server:
```bash
python main.py
# The API will be available at http://localhost:8000
```

### 3. Setup the Frontend (React)
Open a new terminal window:
```bash
cd frontend
# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

Navigate to `http://localhost:5173` to start planning your dream trip!

## 🛡️ Fallback Systems
Traveloop is engineered for stability during live demonstrations. If the Gemini AI API encounters quota limits or networking issues, the backend automatically switches to a robust fallback engine that:
1. Generates dynamic mock data tailored perfectly to the user's budget slider.
2. Skips AI mapping and instead pulls real, accurate latitude/longitude coordinates directly from the Open-Meteo Geocoding API.

---
*Built with ❤️ for Hackathons.*

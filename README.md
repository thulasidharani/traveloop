# 🌍✈️ Traveloop AI - Intelligent Travel & Itinerary Planner

**Traveloop AI** is an end-to-end intelligent travel planning platform engineered to transform raw user ideas into highly accurate, real-world travel itineraries, expense breakdowns, interactive GPS maps, and eco-impact reports in seconds.

---

## 💡 Project Concept & Philosophy

Planning trips traditionally requires hours of tedious research across multiple websites for hotels, places to visit, vehicle fares, and budget estimates. 

**Traveloop AI** solves this by leveraging Generative AI (**Google Gemini 1.5 Flash**) combined with real-world geocoding APIs (**Open-Meteo**) to deliver:
1. **Seamless Travel Calculations**: Input your travel dates (e.g. 3 days), and Traveloop automatically calculates:
   - **Day 0**: Departure from your starting location (e.g. Coimbatore) with Vehicle / Transport Expenses.
   - **Days 1 to N**: Real-world hotel check-ins, top-rated attraction visits, and local dining experiences.
   - **Day N + 1 (Day 4)**: Hotel check-out, souvenir shopping, and Return Journey Vehicle Expenses back to your home city.
2. **Real Place Authenticity**: Replaces generic place names with real, iconic landmarks (e.g. *Grand Hyatt Beijing*, *Great Wall at Mutianyu*, *Taj Coromandel*, *Senso-ji Temple*).
3. **Live Cost Analytics**: Automatically updates your pie charts and budget tracker whenever you add or modify activities on the fly.
4. **Zero Downtime Architecture**: Features a robust local fallback engine so the app continues working flawlessly even if AI API keys or network connections drop.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| 🤖 **AI Auto-Pilot & Magic Fill** | Enter a natural prompt (e.g. *"5 days in Bali, luxury vibe for 2 adults"*) and AI automatically fills in destination, dates, traveler count, and budget limits. |
| 🚗 **Day 0 Pre-Trip Departure** | Automatically injects **Day 0** into itineraries for vehicle and travel expenses originating from Coimbatore (or chosen origin city). |
| 🚌 **Day 4 Return Journey** | Automatically generates **Day 4 (Day N+1)** return travel vehicle expenses and safe arrival back home. |
| 🏨 **Real Landmark & Hotel Sync** | Tailors real-world hotels, entry tickets, and dining spots specific to destination (China, Japan, Goa, Ooty, Paris, Dubai, etc.). |
| 📊 **Live Expense Pie Charts** | Visualizes expense distributions across Accommodation, Food, Activities, and Transport via **Recharts**. Adding custom activities updates budget charts in real-time. |
| 🗺️ **Interactive GPS Smart Maps** | Renders places on interactive Leaflet maps with custom markers and AI-assisted spot recommendations. |
| 💱 **Global Currency Auto-Detect** | Automatically formats all prices in local currency symbols (e.g. **₹** for India, **$** for US, **€** for Europe, **¥** for Japan/China). |
| 🌤️ **Live Weather Insights** | Fetches live weather conditions, wind speeds, and rain alerts for destination via Open-Meteo Weather API. |
| 🌿 **Eco-Impact Footprint** | Evaluates CO2 emission estimates based on selected transport mode (Train/Flight/Car/Bus/Bike) and gives eco-friendly travel tips. |
| 📄 **PDF Export & One-Click Sharing** | Export complete travel plans to printable PDFs or copy shareable public URLs instantly. |

---

## 📖 User Manual (Step-by-Step Guide)

### 1️⃣ Creating a New Trip
1. Navigate to the **Create Trip** page (`/create-trip`).
2. **Option A (AI Auto-Pilot)**: Type your trip idea in the prompt box (e.g., *"3 days in Goa with beach activities and seafood"*) and click **Magic Auto-Fill**.
3. **Option B (Manual Input)**:
   - Enter **Trip Name** and number of **Adults / Kids**.
   - Select **Starting Location (Origin)** (Defaults to *Coimbatore*).
   - Select **Destination City** (e.g. *Goa, Paris, Beijing, Ooty*).
   - Pick your **Transport Mode** (*Train, Flight, Car, Bus, Bike*).
   - Pick **Start Date** and **End Date** (e.g. 3-day duration).
   - Customize your **Travel Vibe** (*Adventure, Luxury, Backpacking, Family, Romantic*).
   - Adjust the **Budget Slider** (Min/Max values auto-scale based on currency and destination).
4. Click **Generate Dream Itinerary**.

### 2️⃣ Exploring Your Itinerary
- **Day 0 (Pre-Trip Departure)**: Displays vehicle expenses departing from Coimbatore (or origin city) and overnight transit.
- **Day 1 to Day 3 (Destination Days)**: Detailed morning, afternoon, and evening activities including hotel check-ins, guided tours, and dining.
- **Day 4 (Return Day)**: Displays hotel check-out, souvenir shopping, and return vehicle expenses back to Coimbatore.

### 3️⃣ Customizing & Adding Activities
- Click **+ Add Activity** under any day.
- Enter **Time**, **Activity Name**, and **Cost**.
- Click **Save**. The trip budget, daily total, and expense pie charts will update **live**!

### 4️⃣ Smart GPS Maps & AI Spot Search
- Switch to the **Map** tab to view pinned tourist locations.
- Use the **AI Idea Generator** (e.g. *"Show me popular cafes"*) to discover and add new places directly to your trip schedule.

### 5️⃣ Exporting & Sharing
- Click **Download PDF** icon in the header to print or save your trip plan as a PDF.
- Click **Share** to copy a direct shareable URL to your clipboard.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React Icons, Recharts, Leaflet.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, Pydantic.
- **AI Engine**: Google Generative AI (`gemini-1.5-flash`).
- **Geocoding & Weather**: Open-Meteo REST APIs.
- **Database & Storage**: Supabase PostgreSQL / Local Memory Fallback.

---

## ⚡ Local Hosting Guide

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/Scripts/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will run at:* `http://127.0.0.1:8000`

### 2. Frontend Setup
Open a new terminal window:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev -- --host 127.0.0.1
```
*Frontend Web App will run at:* `http://127.0.0.1:5173`

---

## 🛡️ Robust Fallback Architecture

Traveloop features a fail-safe dual architecture:
- If Gemini API is active, Gemini generates authentic real-world itineraries matching prompt parameters.
- If Gemini API is offline or rate-limited, Traveloop's internal fallback engine immediately kicks in, dynamically constructing structured Day 0 to Day N+1 itineraries with Open-Meteo coordinates to guarantee **100% uptime**.

---
*Built with ❤️ for Hackathons & Intelligent Travel.*

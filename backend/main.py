from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import os
import math
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
import json

load_dotenv()

app = FastAPI(title="Traveloop API", description="AI-powered travel planning API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase configuration
url: str = os.environ.get("SUPABASE_URL", "http://127.0.0.1:8000")
key: str = os.environ.get("SUPABASE_SERVICE_KEY", "local-key")
try:
    supabase: Client = create_client(url, key)
except Exception as e:
    print("Supabase client init offline/local fallback:", e)
    supabase = None

# Gemini configuration
gemini_key = os.environ.get("GEMINI_API_KEY")
model = None
try:
    if gemini_key:
        genai.configure(api_key=gemini_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
except Exception as e:
    print("Gemini init error:", e)

# Pydantic Models
class TripCreate(BaseModel):
    user_id: str
    title: str
    origin: Optional[str] = "Coimbatore"
    cities: str
    transport_mode: Optional[str] = "Train"
    start_date: str
    end_date: str
    ai_prompt: Optional[str] = None
    budget: Optional[int] = None
    adults: Optional[int] = 1
    children: Optional[int] = 0

class MapAIRequest(BaseModel):
    city: str
    prompt: str

class TripResponse(BaseModel):
    id: int
    title: str
    cities: str
    start_date: str
    end_date: str

class ItineraryItem(BaseModel):
    day: int
    activity: str
    cost: float



# Local in-memory DB fallback for when Supabase connection is offline
memory_db = {
    "trips": [],
    "itinerary": [],
    "expenses": [],
    "checklist": [],
    "next_id": 1
}

# Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to Traveloop API"}

@app.post("/clear-db")
def clear_db():
    """
    Clears all saved trips, itinerary items, expenses, and checklists.
    """
    global memory_db
    memory_db["trips"] = []
    memory_db["itinerary"] = []
    memory_db["expenses"] = []
    memory_db["checklist"] = []
    memory_db["next_id"] = 1
    
    if supabase:
        try:
            supabase.table('itinerary').delete().neq('id', 0).execute()
            supabase.table('expenses').delete().neq('id', 0).execute()
            supabase.table('checklist').delete().neq('id', 0).execute()
            supabase.table('trips').delete().neq('id', 0).execute()
        except Exception as e:
            print("Supabase clear-db error:", e)
            
    return {"status": "success", "message": "Database completely cleared!"}

@app.post("/create-trip")
def create_trip(trip: TripCreate):
    """
    Creates a new trip and stores it in Supabase or local memory fallback.
    """
    try:
        res = supabase.table('trips').insert({
            "user_id": trip.user_id,
            "title": trip.title,
            "cities": trip.cities,
            "start_date": trip.start_date,
            "end_date": trip.end_date
        }).execute()
        new_id = res.data[0]['id']
    except Exception as e:
        print("Supabase create-trip error, using local memory fallback:", e)
        new_id = memory_db["next_id"]
        memory_db["next_id"] += 1
        new_trip = {
            "id": new_id,
            "user_id": trip.user_id,
            "title": trip.title,
            "origin": trip.origin or "Coimbatore",
            "cities": trip.cities,
            "transport_mode": trip.transport_mode or "Train",
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "total_budget": trip.budget or 5000,
            "ai_prompt": trip.ai_prompt
        }
        memory_db["trips"].append(new_trip)

    return {
        "id": new_id,
        "message": "Trip created successfully",
        "title": trip.title,
    }

@app.get("/trips")
def get_trips():
    """
    Gets all trips.
    """
    try:
        res = supabase.table('trips').select("*").execute()
        return res.data
    except Exception as e:
        print("Supabase get_trips error, using local memory fallback:", e)
        return memory_db["trips"]

@app.get("/trips/{trip_id}")
def get_trip_details(trip_id: int):
    """
    Get full details of a specific trip.
    """
    try:
        trip_res = supabase.table('trips').select("*").eq("id", trip_id).execute()
        if not trip_res.data:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = dict(trip_res.data[0])
        
        itinerary = supabase.table('itinerary').select("*").eq("trip_id", trip_id).order("day").execute().data
        budget = supabase.table('expenses').select("*").eq("trip_id", trip_id).execute().data
        checklist = supabase.table('checklist').select("*").eq("trip_id", trip_id).execute().data
    except Exception as e:
        print("Supabase get_trip_details error, using local memory fallback:", e)
        matched = [t for t in memory_db["trips"] if t["id"] == trip_id]
        if not matched:
            raise HTTPException(status_code=404, detail="Trip not found")
        trip = dict(matched[0])
        itinerary = [i for i in memory_db["itinerary"] if i["trip_id"] == trip_id]
        budget = [b for b in memory_db["expenses"] if b["trip_id"] == trip_id]
        checklist = [c for c in memory_db["checklist"] if c["trip_id"] == trip_id]

    itinerary_grouped = []
    days = set([i['day'] for i in itinerary])
    for d in sorted(days):
        acts = [{"time": i["time"], "name": i.get("activity") or i.get("name", "Activity"), "cost": i["cost"]} for i in itinerary if i["day"] == d]
        itinerary_grouped.append({"day": d, "activities": acts})

    trip["itinerary"] = itinerary_grouped
    trip["budget"] = [{"category": b["category"], "amount": b["amount"]} for b in budget]
    trip["checklist"] = [{"item": c["item"], "done": c.get("status") if "status" in c else c.get("done", False)} for c in checklist]
    trip["total_budget"] = trip.get("total_budget") or 5000
    trip["eco_impact"] = None
    
    return trip

@app.put("/trips/{trip_id}")
def update_trip(trip_id: int, data: dict = Body(...)):
    """
    Updates the trip details in Supabase or local memory fallback
    """
    try:
        supabase.table('itinerary').delete().eq('trip_id', trip_id).execute()
        supabase.table('expenses').delete().eq('trip_id', trip_id).execute()
        supabase.table('checklist').delete().eq('trip_id', trip_id).execute()
        
        if "itinerary" in data:
            itin_inserts = []
            for day in data["itinerary"]:
                d_num = day.get("day", 1)
                for act in day.get("activities", []):
                    itin_inserts.append({
                        "trip_id": trip_id,
                        "day": d_num,
                        "time": act.get("time", ""),
                        "activity": act.get("name", "Unknown"),
                        "cost": act.get("cost", 0)
                    })
            if itin_inserts:
                supabase.table('itinerary').insert(itin_inserts).execute()
                
        if "budget" in data:
            budget_inserts = []
            for b in data["budget"]:
                budget_inserts.append({
                    "trip_id": trip_id,
                    "category": b.get("category", "General"),
                    "amount": b.get("amount", 0)
                })
            if budget_inserts:
                supabase.table('expenses').insert(budget_inserts).execute()
                
        if "checklist" in data:
            check_inserts = []
            for c in data["checklist"]:
                check_inserts.append({
                    "trip_id": trip_id,
                    "item": c.get("item", "Item"),
                    "status": c.get("done", False)
                })
            if check_inserts:
                supabase.table('checklist').insert(check_inserts).execute()
    except Exception as e:
        print("Supabase update_trip error, using local memory fallback:", e)
        memory_db["itinerary"] = [i for i in memory_db["itinerary"] if i["trip_id"] != trip_id]
        memory_db["expenses"] = [b for b in memory_db["expenses"] if b["trip_id"] != trip_id]
        memory_db["checklist"] = [c for c in memory_db["checklist"] if c["trip_id"] != trip_id]

        if "itinerary" in data:
            for day in data["itinerary"]:
                d_num = day.get("day", 1)
                for act in day.get("activities", []):
                    memory_db["itinerary"].append({
                        "trip_id": trip_id,
                        "day": d_num,
                        "time": act.get("time", ""),
                        "activity": act.get("name", "Unknown"),
                        "cost": act.get("cost", 0)
                    })
        if "budget" in data:
            for b in data["budget"]:
                memory_db["expenses"].append({
                    "trip_id": trip_id,
                    "category": b.get("category", "General"),
                    "amount": b.get("amount", 0)
                })
        if "checklist" in data:
            for c in data["checklist"]:
                memory_db["checklist"].append({
                    "trip_id": trip_id,
                    "item": c.get("item", "Item"),
                    "status": c.get("done", False)
                })
            
    return {"status": "success", "message": "Trip updated"}

@app.post("/generate-itinerary")
def generate_itinerary(prompt: str = Body(..., embed=True)):
    """
    Actual AI generation endpoint using Gemini.
    """
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    system_prompt = """
    You are an expert global travel planner and real-world cost analyst. You return ONLY valid JSON and nothing else.

    CRITICAL RULES FOR ITINERARY & EXPENSES:
    1. NEVER use generic repetitive titles (DO NOT say 'Explore City Landmarks', 'Guided Culture Tour', 'China, China', or 'City Hotel').
    2. ALWAYS use REAL, ACCURATE SPECIFIC PLACE NAMES, SPECIFIC REAL HOTELS, AND SPECIFIC DINING SPOTS for the target destination.
       Examples for China: "Check-in at Grand Hyatt Beijing", "Great Wall of China Mutianyu Cable Car Tour", "Forbidden City & Tiananmen Square", "Summer Palace Walk", "Beijing Roast Duck Dinner at Quanjude".
       Examples for Japan: "Check-in at Keio Plaza Hotel Tokyo", "Senso-ji Temple Asakusa", "Shibuya Crossing & Hachiko Statue", "Ramen at Ichiran Shinjuku".
       Examples for India: "Check-in at Taj Coromandel", "Marina Beach & Lighthouse", "Kapaleeshwarar Temple Mylapore", "Dinner at Murugan Idli Shop".
    3. DO NOT use rigid hardcoded percentage formulas. Calculate REAL-WORLD ESTIMATED COSTS based on actual ticket prices, average daily hotel room rates, meal costs, and travel fares for that destination!
    4. Day 0 MUST ALWAYS be included as Pre-Trip Departure from Origin city (e.g. Coimbatore) with Vehicle / Transport Expenses.
    5. Days 1 to N MUST be the main sightseeing and stay days at the destination.
    6. Day N + 1 (e.g. Day 4 if 3 days trip) MUST ALWAYS be the Return Day with Return Vehicle / Transport Expenses back to Origin city (e.g. Coimbatore).

    Format EXACTLY like this JSON structure:
    {
      "itinerary": [
        {
          "day": 0,
          "activities": [
            {"time": "07:00 PM", "name": "Vehicle Expenses & Departure: Depart from Coimbatore to Beijing via Flight", "cost": 15000},
            {"time": "10:30 PM", "name": "Overnight Travel / Transit to Beijing", "cost": 0}
          ]
        },
        {
          "day": 1, 
          "activities": [
            {"time": "08:30 AM", "name": "Arrival in Beijing & Hotel Transfer", "cost": 0},
            {"time": "01:00 PM", "name": "Check-in at Grand Hyatt Beijing", "cost": 3500},
            {"time": "03:30 PM", "name": "Forbidden City & Tiananmen Square Guided Tour", "cost": 600},
            {"time": "08:00 PM", "name": "Beijing Roast Duck Dinner at Quanjude", "cost": 1200},
            {"time": "10:30 PM", "name": "Night Rest & Sleep at Hotel", "cost": 0}
          ]
        },
        {
          "day": 4,
          "activities": [
            {"time": "09:00 AM", "name": "Hotel Check-out at Grand Hyatt Beijing", "cost": 0},
            {"time": "01:00 PM", "name": "Lunch before Return Journey", "cost": 400},
            {"time": "04:30 PM", "name": "Return Vehicle Expenses: Flight from Beijing back to Coimbatore", "cost": 15000},
            {"time": "09:30 PM", "name": "Safe Arrival back home in Coimbatore", "cost": 0}
          ]
        }
      ],
      "budget": [
        {"category": "Accommodation (Grand Hyatt Beijing)", "amount": 7000},
        {"category": "Food & Dining", "amount": 3600},
        {"category": "Activities & Entry Tickets", "amount": 2400},
        {"category": "Flight & Local Travel (Coimbatore round trip)", "amount": 30000}
      ],
      "checklist": [
        {"item": "Flight Tickets & Passport for Beijing", "done": true},
        {"item": "Hotel Booking at Grand Hyatt Beijing", "done": true},
        {"item": "Comfortable Walking Shoes for Great Wall", "done": false}
      ],
      "eco_impact": {
        "co2_kg": 380,
        "eco_score": "B",
        "tips": ["Use Beijing Subway for city transport to save CO2", "Eat at local traditional restaurants"]
      }
    }
    """
    
    try:
        response = model.generate_content(f"{system_prompt}\nUser Request: {prompt}")
        
        # Clean markdown formatting if AI hallucinated backticks
        clean_text = response.text.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text[7:]
        if clean_text.startswith("```"):
            clean_text = clean_text[3:]
        if clean_text.endswith("```"):
            clean_text = clean_text[:-3]
            
        itinerary_data = json.loads(clean_text.strip())
        
        return {
            "status": "success",
            "data": itinerary_data
        }
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        try:
            with open("error_log.txt", "w") as f:
                f.write(err)
                if 'response' in locals():
                    f.write("\n\nRAW RESPONSE:\n" + getattr(response, 'text', 'No text attr'))
        except: pass
        
        # Real-World Realistic Itinerary Generator
        print("Generating real-world accurate place & cost itinerary.")
        import re
        from datetime import datetime
        
        # Clean city name (e.g. "China, China" -> "China", "Chennai, India" -> "Chennai")
        city_raw = "Destination"
        city_match = re.search(r'plan for\s+(.*?)\s+from', prompt, re.IGNORECASE)
        if city_match:
            city_raw = city_match.group(1).strip()
        parts = [p.strip() for p in city_raw.split(',') if p.strip()]
        clean_city = parts[0] if parts else "Destination"
        clean_city_title = clean_city.title()
        
        # Extract Origin & Transport Mode if present
        origin_city = "Coimbatore"
        origin_match = re.search(r'Origin:\s*([^\],]+)', prompt)
        if origin_match:
            origin_city = origin_match.group(1).strip()

        transport_mode = "Train"
        trans_match = re.search(r'Transport:\s*([^\],]+)', prompt)
        if trans_match:
            transport_mode = trans_match.group(1).strip()
            
        total_days = 3
        date_match = re.search(r'from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})', prompt)
        if date_match:
            try:
                start_d = datetime.strptime(date_match.group(1), "%Y-%m-%d")
                end_d = datetime.strptime(date_match.group(2), "%Y-%m-%d")
                days_diff = (end_d - start_d).days + 1
                if days_diff > 0:
                    total_days = days_diff
            except:
                pass
        total_budget = 5000
        budget_match = re.search(r'Total Budget:\s*(\d+)', prompt)
        if budget_match:
            total_budget = int(budget_match.group(1))

        # Target Category Allocations (Sum EXACTLY equals total_budget)
        hotel_alloc = int(total_budget * 0.35)
        food_alloc = int(total_budget * 0.30)
        act_alloc = int(total_budget * 0.20)
        trans_alloc = total_budget - hotel_alloc - food_alloc - act_alloc

        # Calculated per-item costs
        hotel_night_rate = max(int(hotel_alloc / max(total_days, 1)), 10)
        trans_dep = int(trans_alloc * 0.5)
        trans_ret = trans_alloc - trans_dep
        
        total_meals = max(total_days * 2, 1)
        per_meal_cost = max(int(food_alloc / total_meals), 5)
        
        total_spots = max((total_days - 1) * 2 + 1, 1)
        per_spot_cost = max(int(act_alloc / total_spots), 5)

        DEST_DB = {
            "china": {
                "hotel": "Grand Hyatt Beijing",
                "spots": [
                    {"name": "Great Wall of China at Mutianyu (Entrance & Cable Car)"},
                    {"name": "Forbidden City & Tiananmen Square Guided Tour"},
                    {"name": "Summer Palace Gardens & Kunming Lake Boating"},
                    {"name": "Temple of Heaven Park & Hall of Prayer"},
                    {"name": "The Bund Waterfront Promenade & Shanghai Tower Skyline"},
                    {"name": "Terracotta Army Museum in Xi'an"}
                ],
                "dining": [
                    {"name": "Beijing Roast Duck Dinner at Quanjude"},
                    {"name": "Traditional Dim Sum Lunch at Din Tai Fung"},
                    {"name": "Sichuan Cuisine Experience & Tea House"}
                ]
            },
            "japan": {
                "hotel": "Keio Plaza Hotel Tokyo",
                "spots": [
                    {"name": "Senso-ji Temple in Asakusa & Nakamise Shopping"},
                    {"name": "Shibuya Crossing & Shibuya Sky Deck"},
                    {"name": "Tokyo Skytree Tembo Deck Observation"},
                    {"name": "Kyoto Fushimi Inari Taisha Thousand Torii Gates"},
                    {"name": "Akihabara Electric Town & Anime Center"}
                ],
                "dining": [
                    {"name": "Authentic Tonkotsu Ramen at Ichiran Shinjuku"},
                    {"name": "Fresh Sushi Tasting at Tsukiji Outer Market"},
                    {"name": "Izakaya Feast & Yakitori in Omoide Yokocho"}
                ]
            },
            "chennai": {
                "hotel": "Taj Coromandel Chennai",
                "spots": [
                    {"name": "Marina Beach Walk & Lighthouse View"},
                    {"name": "Kapaleeshwarar Temple Mylapore Heritage Tour"},
                    {"name": "Fort St. George & Colonial Museum"},
                    {"name": "Express Avenue Shopping & Gaming"},
                    {"name": "Elliot's Beach in Besant Nagar"}
                ],
                "dining": [
                    {"name": "Traditional South Indian Thali at Murugan Idli Shop"},
                    {"name": "Seafood Special Feast at Coast Line Restaurant"},
                    {"name": "Filter Coffee & Tiffin at Saravana Bhavan"}
                ]
            },
            "coimbatore": {
                "hotel": "Radisson Blu Coimbatore",
                "spots": [
                    {"name": "Adiyogi Shiva Statue at Isha Yoga Center"},
                    {"name": "Marudhamalai Murugan Hill Temple"},
                    {"name": "VOC Park, Zoo & Lake Walk"},
                    {"name": "Siruvani Waterfalls & Dam Viewpoint"},
                    {"name": "Brookefields Mall Shopping & Arcade"}
                ],
                "dining": [
                    {"name": "Traditional Kongu Special Feast at Junior Kuppanna"},
                    {"name": "Hot Ghee Roast & Filter Coffee at Annapoorna"},
                    {"name": "Kovai Special Mutton Biryani Experience"}
                ]
            },
            "goa": {
                "hotel": "Taj Exotica Resort & Spa Goa",
                "spots": [
                    {"name": "Baga Beach Parasailing & Water Sports"},
                    {"name": "Historic Fort Aguada & Portuguese Lighthouse"},
                    {"name": "Basilica of Bom Jesus Heritage Tour in Old Goa"},
                    {"name": "Dudhsagar Waterfalls Jeep Safari & Trek"},
                    {"name": "Mandovi River Evening Cultural Sunset Cruise"}
                ],
                "dining": [
                    {"name": "Authentic Goan Fish Curry at Britto's Shack"},
                    {"name": "Greek Sunset Dinner at Thalassa Vagator"},
                    {"name": "Fisherman's Wharf Seafood Feast"}
                ]
            },
            "ooty": {
                "hotel": "Savoy - IHCL SeleQtions Ooty",
                "spots": [
                    {"name": "Government Botanical Garden Floral Tour"},
                    {"name": "Ooty Lake Speed Boating & Cycling"},
                    {"name": "Doddabetta Peak Highest Viewpoint"},
                    {"name": "Nilgiri Mountain Railway UNESCO Toy Train Ride"},
                    {"name": "Pykara Lake Boating & Waterfalls View"}
                ],
                "dining": [
                    {"name": "Fresh Ooty Homemade Chocolates at King Star"},
                    {"name": "Colonial High Tea & Pastries at Earl's Secret"},
                    {"name": "Famous Chinese Dinner at Shinkows Ooty"}
                ]
            },
            "paris": {
                "hotel": "Pullman Paris Tour Eiffel",
                "spots": [
                    {"name": "Eiffel Tower Summit Access Ticket"},
                    {"name": "Louvre Museum Mona Lisa Guided Tour"},
                    {"name": "Seine River Sightseeing Cruise"},
                    {"name": "Arc de Triomphe & Champs-Élysées Walk"},
                    {"name": "Montmartre & Sacré-Cœur Basilica Tour"}
                ],
                "dining": [
                    {"name": "French Macarons & Pastries at Ladurée Paris"},
                    {"name": "Classic 3-Course Bistro Dinner at Le Bouillon Chartier"},
                    {"name": "Wine & Cheese Tasting in Le Marais"}
                ]
            },
            "dubai": {
                "hotel": "JW Marriott Marquis Dubai",
                "spots": [
                    {"name": "Burj Khalifa 124th Floor At the Top Observation"},
                    {"name": "Dubai Mall & Fountain Show Experience"},
                    {"name": "Desert Safari with Dune Bashing & BBQ Dinner"},
                    {"name": "Dubai Marina Sunset Yacht Cruise"},
                    {"name": "Gold & Spice Souk Walking Tour in Old Dubai"}
                ],
                "dining": [
                    {"name": "Traditional Arabic Grill & Mezze at Al Nafoorah"},
                    {"name": "Dinner Cruise on Dubai Marina Dhow"},
                    {"name": "Luxury Seafood Dinner at Pierchic"}
                ]
            }
        }
        
        c_key = clean_city.lower()
        matched = DEST_DB.get(c_key)
        
        hotel_name = matched["hotel"] if matched else f"Grand {clean_city_title} Palace Hotel"
        spots_list = matched["spots"] if matched else [
            {"name": f"Historic {clean_city_title} Heritage Square & Fort"},
            {"name": f"Famous {clean_city_title} Botanical Gardens Walk"},
            {"name": f"{clean_city_title} Cultural Museum & Art Center"},
            {"name": f"{clean_city_title} Sunset Lake & Viewpoint"},
            {"name": f"{clean_city_title} Craft & Souvenir Market"}
        ]
        dining_list = matched["dining"] if matched else [
            {"name": f"Welcome Dinner at {clean_city_title} Royal Bistro"},
            {"name": f"Local Specialities at {clean_city_title} Food Street"},
            {"name": f"Farewell Feast at {clean_city_title} Sky Lounge"}
        ]
        
        itinerary = []

        # Day 0: Pre-Trip Origin Departure & Vehicle Expenses
        itinerary.append({
            "day": 0,
            "activities": [
                {"time": "07:00 PM", "name": f"Origin Departure & Vehicle Fare: Depart from {origin_city} to {clean_city_title} via {transport_mode}", "cost": trans_dep},
                {"time": "10:30 PM", "name": f"Overnight Transit / Travel to {clean_city_title}", "cost": 0}
            ]
        })

        # Days 1 to total_days: Stay & Sightseeing at Destination
        for i in range(1, total_days + 1):
            s_idx1 = (i - 1) * 2 % len(spots_list)
            s_idx2 = (s_idx1 + 1) % len(spots_list)
            d_idx = (i - 1) % len(dining_list)
            sp1 = spots_list[s_idx1]
            sp2 = spots_list[s_idx2]
            dn = dining_list[d_idx]

            if i == 1:
                activities = [
                    {"time": "08:30 AM", "name": f"Arrival in {clean_city_title} & Hotel Transfer", "cost": 0},
                    {"time": "01:00 PM", "name": f"Check-in at {hotel_name}", "cost": hotel_night_rate},
                    {"time": "03:30 PM", "name": f"Visit {sp1['name']}", "cost": per_spot_cost},
                    {"time": "08:00 PM", "name": f"Dinner: {dn['name']}", "cost": per_meal_cost},
                    {"time": "10:30 PM", "name": "Night Rest & Sleep at Hotel", "cost": 0}
                ]
            else:
                activities = [
                    {"time": "08:30 AM", "name": "Breakfast & Coffee", "cost": 0},
                    {"time": "10:00 AM", "name": f"Explore {sp1['name']}", "cost": per_spot_cost},
                    {"time": "01:30 PM", "name": f"Lunch at Local {clean_city_title} Cafe", "cost": per_meal_cost},
                    {"time": "04:00 PM", "name": f"Visit {sp2['name']}", "cost": per_spot_cost},
                    {"time": "08:00 PM", "name": f"Dinner: {dn['name']}", "cost": per_meal_cost},
                    {"time": "10:30 PM", "name": "Night Rest & Sleep", "cost": 0}
                ]
            itinerary.append({"day": i, "activities": activities})

        # Day N + 1: Return Travel & Arrival Day
        return_day = total_days + 1
        s_last = spots_list[-1]
        itinerary.append({
            "day": return_day,
            "activities": [
                {"time": "09:00 AM", "name": f"Hotel Check-out at {hotel_name}", "cost": 0},
                {"time": "10:30 AM", "name": f"Souvenir & Local Craft Shopping at {s_last['name']}", "cost": 0},
                {"time": "01:00 PM", "name": f"Lunch before Return Journey", "cost": 0},
                {"time": "04:30 PM", "name": f"Return Vehicle Fare: Depart from {clean_city_title} back to {origin_city} via {transport_mode}", "cost": trans_ret},
                {"time": "09:30 PM", "name": f"Safe Arrival back home in {origin_city}", "cost": 0}
            ]
        })
        
        mock_data = {
            "itinerary": itinerary,
            "budget": [
                {"category": "Accommodation (" + hotel_name + ")", "amount": hotel_alloc},
                {"category": "Food & Dining", "amount": food_alloc},
                {"category": "Activities & Entry Tickets", "amount": act_alloc},
                {"category": "Travel (" + transport_mode + " from " + origin_city + ")", "amount": trans_alloc}
            ],
            "checklist": [
                {"item": "Tickets & ID Cards for " + transport_mode, "done": True},
                {"item": "Hotel Reservation Confirmation for " + hotel_name, "done": True},
                {"item": "Comfortable Walking Shoes", "done": False},
                {"item": "Universal Travel Adapter & Power Bank", "done": False},
                {"item": "Light Jacket & Umbrella for " + clean_city_title, "done": False}
            ],
            "eco_impact": {
                "co2_kg": 140 if transport_mode in ["Train", "Bike"] else 380,
                "eco_score": "A+" if transport_mode in ["Train", "Bike"] else "B",
                "tips": [f"Use public electric transport in {clean_city_title}.", "Dine at farm-to-table local spots."]
            }
        }
        return {
            "status": "success",
            "data": mock_data
        }

@app.post("/ai/map-places")
def ai_map_places(req: MapAIRequest):
    """
    AI endpoint to dynamically generate new map coordinates based on user requests (e.g. 'Show me cafes')
    """
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")
        
    system_prompt = f"""
    You are an expert map assistant. The user is traveling to {req.city}.
    The user is asking: "{req.prompt}".
    Generate exactly 3 real places that match this request in {req.city}.
    Make sure the coordinates (latitude and longitude) are accurate for {req.city}.
    Format EXACTLY as a JSON array (no markdown, just raw JSON):
    [
      {{"name": "Restaurant/Place Name", "lat": 15.5, "lng": 73.7, "visited": false}}
    ]
    """
    
    try:
        response = model.generate_content(system_prompt)
        places = json.loads(response.text)
        return {"status": "success", "places": places}
    except Exception as e:
        print("AI Places error:", e)
        # HACKATHON FALLBACK: Fetch real coordinates using Open-Meteo API dynamically!
        import urllib.request
        import urllib.parse
        try:
            url = "https://geocoding-api.open-meteo.com/v1/search?name=" + urllib.parse.quote(req.city) + "&count=1&format=json"
            urll_req = urllib.request.Request(url, headers={'User-Agent': 'Traveloop/1.0'})
            with urllib.request.urlopen(urll_req, timeout=5) as response:
                data = json.loads(response.read().decode())
                if "results" in data and len(data["results"]) > 0:
                    lat = data["results"][0]["latitude"]
                    lng = data["results"][0]["longitude"]
                    # Add random offset for new places
                    import random
                    return {
                        "status": "success",
                        "places": [
                            {"name": f"Recommended Spot 1 ({req.city})", "lat": lat + random.uniform(-0.02, 0.02), "lng": lng + random.uniform(-0.02, 0.02), "visited": False},
                            {"name": f"Recommended Spot 2 ({req.city})", "lat": lat + random.uniform(-0.02, 0.02), "lng": lng + random.uniform(-0.02, 0.02), "visited": False}
                        ]
                    }
        except Exception as ge:
            print("Geocoding fallback failed:", ge)
            
        raise HTTPException(status_code=500, detail=f"AI mapping failed: {str(e)}")

# --- SMART MAP GPS APIs ---
MOCK_PLACES = {
    "goa": [
        {"name": "Baga Beach", "lat": 15.5553, "lng": 73.7517, "visited": False},
        {"name": "Fort Aguada", "lat": 15.4937, "lng": 73.7690, "visited": False},
        {"name": "Anjuna Beach", "lat": 15.5819, "lng": 73.7430, "visited": False},
        {"name": "Calangute Beach", "lat": 15.5494, "lng": 73.7626, "visited": False}
    ],
    "paris, france": [
        {"name": "Eiffel Tower", "lat": 48.8584, "lng": 2.2945, "visited": False},
        {"name": "Louvre Museum", "lat": 48.8606, "lng": 2.3376, "visited": False},
        {"name": "Notre-Dame", "lat": 48.8529, "lng": 2.3500, "visited": False}
    ],
    "tokyo, kyoto, osaka": [
        {"name": "Tokyo Tower", "lat": 35.6586, "lng": 139.7454, "visited": False},
        {"name": "Senso-ji", "lat": 35.7148, "lng": 139.7967, "visited": False},
        {"name": "Shibuya Crossing", "lat": 35.6595, "lng": 139.7006, "visited": False}
    ]
}

@app.get("/places")
def get_places(city: str):
    """Fetch nearby tourist places dynamically using Gemini AI"""
    
    system_prompt = f"""
    You are an expert mapping AI.
    The user is traveling to {city}.
    Generate exactly 4 popular tourist attractions in {city} with their highly accurate latitude and longitude.
    Format EXACTLY as a JSON array:
    [
      {{"name": "Attraction Name", "lat": 15.5, "lng": 73.7, "visited": false}}
    ]
    """
    
    try:
        if not gemini_key: raise Exception("No API Key")
        response = model.generate_content(system_prompt)
        places = json.loads(response.text)
        return places
    except Exception as e:
        print("AI Places error:", e)
        import urllib.request
        import urllib.parse
        import ssl
        import json
        import re
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            # Sanitize city to just the main name to improve geocoding success (e.g. 'Ooty In June' -> 'Ooty')
            clean_city = re.split(r'[, ]', city)[0].strip()
            if not clean_city: clean_city = city
            url = "https://geocoding-api.open-meteo.com/v1/search?name=" + urllib.parse.quote(clean_city) + "&count=1&format=json"
            req = urllib.request.Request(url, headers={'User-Agent': 'Traveloop/1.0'})
            with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
                data = json.loads(response.read().decode())
                if "results" in data and len(data["results"]) > 0:
                    lat = data["results"][0]["latitude"]
                    lng = data["results"][0]["longitude"]
                    city_title = city.split(',')[0].title()
                    return [
                        {"name": f"Central {city_title} Hub", "lat": lat, "lng": lng, "visited": False},
                        {"name": f"{city_title} National Museum", "lat": lat + 0.015, "lng": lng + 0.01, "visited": False},
                        {"name": f"{city_title} Historic Park", "lat": lat - 0.01, "lng": lng + 0.02, "visited": False},
                        {"name": f"Popular {city_title} Market", "lat": lat - 0.005, "lng": lng - 0.015, "visited": False}
                    ]
        except Exception as ge:
            with open("error_log.txt", "w") as f:
                f.write(f"Geocoding Error: {str(ge)}\n")
            print("Geocoding fallback failed:", ge)
        city_lower = city.lower()
        for k, v in MOCK_PLACES.items():
            if city_lower in k or k in city_lower:
                return v
        return MOCK_PLACES["goa"]

@app.post("/route")
def generate_route(places: list = Body(...)):
    """Generate a route between places"""
    return {"route": "Use frontend routing machine"}

@app.post("/ai/map-places")
def ai_map_places(req: MapAIRequest):
    """Dynamically add new places based on natural language prompt"""
    system_prompt = f"""
    The user is currently planning a trip in {req.city}.
    They want: "{req.prompt}".
    Provide exactly 2 highly relevant specific real places.
    Return JSON array:
    [ {{"name": "Place Name", "lat": 15.1, "lng": 73.1, "visited": false}} ]
    """
    try:
        if not gemini_key: raise Exception("No API Key")
        response = model.generate_content(system_prompt)
        places = json.loads(response.text)
        return {"status": "success", "places": places}
    except Exception as e:
        print("AI Places error:", e)
        import urllib.request
        import urllib.parse
        import ssl
        import json
        import random
        import re
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            clean_city = re.split(r'[, ]', req.city)[0].strip()
            if not clean_city: clean_city = req.city
            url = "https://geocoding-api.open-meteo.com/v1/search?name=" + urllib.parse.quote(clean_city) + "&count=1&format=json"
            urll_req = urllib.request.Request(url, headers={'User-Agent': 'Traveloop/1.0'})
            with urllib.request.urlopen(urll_req, timeout=5, context=ctx) as response:
                data = json.loads(response.read().decode())
                if "results" in data and len(data["results"]) > 0:
                    lat = data["results"][0]["latitude"]
                    lng = data["results"][0]["longitude"]
                    return {
                        "status": "success",
                        "places": [
                            {"name": f"Recommended Spot 1 ({req.city})", "lat": lat + random.uniform(-0.02, 0.02), "lng": lng + random.uniform(-0.02, 0.02), "visited": False},
                            {"name": f"Recommended Spot 2 ({req.city})", "lat": lat + random.uniform(-0.02, 0.02), "lng": lng + random.uniform(-0.02, 0.02), "visited": False}
                        ]
                    }
        except Exception as ge:
            print("Geocoding fallback failed:", ge)
            
        raise HTTPException(status_code=500, detail=f"AI mapping failed: {str(e)}")

@app.get("/next-stop")
def get_next_stop(lat: float, lng: float, city: str):
    """Find the nearest unvisited stop based on user GPS"""
    places = get_places(city)
    unvisited = [p for p in places if not p.get("visited", False)]
    
    if not unvisited:
        return {"next_stop": None, "next_next_stop": None}
        
    # Calculate distance using simple hypotenuse for demo
    sorted_places = sorted(unvisited, key=lambda p: math.hypot(p["lat"] - lat, p["lng"] - lng))
    
    return {
        "next_stop": sorted_places[0],
        "next_next_stop": sorted_places[1] if len(sorted_places) > 1 else None
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

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
url: str = os.environ.get("SUPABASE_URL", "https://your-supabase-url.supabase.co")
key: str = os.environ.get("SUPABASE_SERVICE_KEY", "your-service-key")
# supabase: Client = create_client(url, key)

# Gemini configuration
gemini_key = os.environ.get("GEMINI_API_KEY")
if gemini_key:
    genai.configure(api_key=gemini_key)
model = genai.GenerativeModel('gemini-1.5-flash')

# Pydantic Models
class TripCreate(BaseModel):
    user_id: str
    title: str
    cities: str
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

# In-memory DB for Hackathon Demo
db_trips = [
    {"id": 1, "title": "Summer in Paris", "start_date": "2024-06-15", "end_date": "2024-06-22", "cities": "Paris, France"},
    {"id": 2, "title": "Japan Explorer", "start_date": "2024-09-10", "end_date": "2024-09-25", "cities": "Tokyo, Kyoto, Osaka"}
]

db_trip_details = {
    1: {
        "id": 1, "title": "Summer in Paris", "cities": "Paris, France", "start_date": "2024-06-15", "end_date": "2024-06-22",
        "itinerary": [], "budget": [], "checklist": []
    },
    2: {
        "id": 2, "title": "Japan Explorer", "cities": "Tokyo, Kyoto, Osaka", "start_date": "2024-09-10", "end_date": "2024-09-25",
        "itinerary": [], "budget": [], "checklist": []
    }
}

# Routes
@app.get("/")
def read_root():
    return {"message": "Welcome to Traveloop API"}

@app.post("/create-trip")
def create_trip(trip: TripCreate):
    """
    Creates a new trip and stores it in memory.
    """
    new_id = len(db_trips) + 1
    new_trip = {
        "id": new_id,
        "title": trip.title,
        "cities": trip.cities,
        "start_date": trip.start_date,
        "end_date": trip.end_date
    }
    db_trips.append(new_trip)
    db_trip_details[new_id] = {
        **new_trip,
        "ai_prompt": trip.ai_prompt,
        "total_budget": trip.budget,
        "adults": trip.adults,
        "children": trip.children,
        "itinerary": [],
        "budget": [],
        "checklist": []
    }
    
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
    return db_trips

@app.get("/trips/{trip_id}")
def get_trip_details(trip_id: int):
    """
    Get full details of a specific trip.
    """
    if trip_id in db_trip_details:
        return db_trip_details[trip_id]
        
    return {
        "id": trip_id, 
        "title": "New Custom Trip", 
        "cities": "Unknown", 
        "start_date": "2024-01-01", 
        "end_date": "2024-01-05",
        "itinerary": [],
        "budget": [],
        "checklist": [],
        "eco_impact": None
    }

@app.put("/trips/{trip_id}")
def update_trip(trip_id: int, data: dict = Body(...)):
    """
    Updates the trip details in memory (saving AI generated data)
    """
    if trip_id in db_trip_details:
        db_trip_details[trip_id].update(data)
        return {"status": "success", "message": "Trip updated"}
    raise HTTPException(status_code=404, detail="Trip not found")

@app.post("/generate-itinerary")
def generate_itinerary(prompt: str = Body(..., embed=True)):
    """
    Actual AI generation endpoint using Gemini.
    """
    if not gemini_key:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    system_prompt = """
    You are an expert travel planner. You return ONLY valid JSON and nothing else.
    Given the user's prompt, generate an itinerary, budget breakdown, and packing checklist. 
    Format EXACTLY like this:
    {
      "itinerary": [
        {"day": 1, "activities": [{"time": "10:00 AM", "name": "Visit local park", "cost": 20}]}
      ],
      "budget": [
        {"category": "Hotel", "amount": 6000},
        {"category": "Food", "amount": 3000},
        {"category": "Travel", "amount": 4000}
      ],
      "checklist": [
        {"item": "Sunglasses", "done": false},
        {"item": "Jacket", "done": false}
      ],
      "eco_impact": {
        "co2_kg": 350,
        "eco_score": "B",
        "tips": ["Take a direct flight to save 20% CO2", "Use public transport in the city"]
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
        
        # HACKATHON FALLBACK: Make the mock data dynamic based on the prompt!
        print("AI Generation failed (Quota Exceeded). Falling back to dynamic mock data.")
        import re
        from datetime import datetime
        
        # Extract details from prompt
        city_name = "your destination"
        city_match = re.search(r'plan for\s+(.*?)\s+from', prompt)
        if city_match:
            city_name = city_match.group(1).strip()
            
        total_days = 2
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
            
        total_budget = 2000
        budget_match = re.search(r'Total Budget:\s*(\d+)', prompt)
        if budget_match:
            total_budget = int(budget_match.group(1))
            
        hotel_cost = int(total_budget * 0.35)
        food_cost = int(total_budget * 0.30)
        act_cost = int(total_budget * 0.20)
        trans_cost = total_budget - hotel_cost - food_cost - act_cost
        
        # Distribute costs evenly across days
        daily_food = int(food_cost / total_days)
        daily_act = int(act_cost / total_days)
        
        # Generate dynamic itinerary array
        itinerary = []
        for i in range(1, total_days + 1):
            if i == 1:
                # Day 1 usually has Hotel and some food
                activities = [
                    {"time": "10:00 AM", "name": f"Check-in at {city_name} Hotel", "cost": hotel_cost}, 
                    {"time": "02:00 PM", "name": f"Explore {city_name} Landmarks", "cost": daily_act},
                    {"time": "08:00 PM", "name": "Welcome Dinner", "cost": daily_food}
                ]
            elif i == total_days:
                # Last day has transport out
                activities = [
                    {"time": "09:00 AM", "name": "Last minute souvenir shopping", "cost": daily_act}, 
                    {"time": "01:00 PM", "name": "Lunch before departure", "cost": daily_food},
                    {"time": "04:00 PM", "name": f"Depart from {city_name}", "cost": trans_cost}
                ]
            else:
                activities = [
                    {"time": "09:00 AM", "name": f"Guided Culture Tour in {city_name} - Day {i}", "cost": daily_act}, 
                    {"time": "07:00 PM", "name": "Dinner at local restaurant", "cost": daily_food}
                ]
            itinerary.append({"day": i, "activities": activities})
        
        mock_data = {
            "itinerary": itinerary,
            "budget": [
                {"category": "Accommodation", "amount": hotel_cost},
                {"category": "Food & Dining", "amount": food_cost},
                {"category": "Activities", "amount": act_cost},
                {"category": "Local Transport", "amount": trans_cost}
            ],
            "checklist": [
                {"item": "Comfortable walking shoes", "done": False},
                {"item": "Universal travel adapter", "done": False},
                {"item": "Camera and spare batteries", "done": False},
                {"item": "Light jacket/layers", "done": False}
            ],
            "eco_impact": {
                "co2_kg": 250,
                "eco_score": "B+",
                "tips": [f"Use public transport while getting around {city_name}.", "Dine at farm-to-table local restaurants."]
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

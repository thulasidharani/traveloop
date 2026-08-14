/**
 * Transport feasibility utility.
 * Determines if a route between origin and destination requires overseas flight
 * or permits ground transport modes (Train, Car, Bus, Bike).
 */

const OVERSEAS_COUNTRIES = [
  'japan', 'tokyo', 'kyoto', 'osaka', 'sapporo',
  'uk', 'united kingdom', 'london', 'england', 'scotland',
  'france', 'paris', 'italy', 'rome', 'germany', 'berlin', 'spain', 'barcelona', 'madrid',
  'netherlands', 'amsterdam', 'greece', 'athens', 'portugal', 'lisbon', 'europe',
  'switzerland', 'zurich', 'geneva',
  'usa', 'america', 'united states', 'new york', 'los angeles', 'chicago', 'miami', 'vegas', 'san francisco', 'hawaii',
  'canada', 'toronto', 'vancouver',
  'australia', 'sydney', 'melbourne',
  'dubai', 'uae', 'abu dhabi', 'saudi', 'qatar',
  'singapore', 'bali', 'indonesia', 'jakarta', 'malaysia', 'kuala lumpur',
  'thailand', 'bangkok', 'phuket', 'korea', 'seoul', 'vietnam'
];

const INDIAN_ORIGINS = [
  'coimbatore', 'chennai', 'madurai', 'trichy', 'salem', 'bangalore', 'bengaluru',
  'hyderabad', 'kochi', 'trivandrum', 'mumbai', 'pune', 'delhi', 'new delhi',
  'kolkata', 'goa', 'ooty', 'kodaikanal', 'jaipur', 'kerala', 'india', 'ind'
];

export const isOverseasRoute = (originStr, destinationStr) => {
  if (!destinationStr) return false;
  const dest = String(destinationStr).toLowerCase().trim();
  const orig = String(originStr || 'Coimbatore').toLowerCase().trim();

  // If origin is in India and destination is an overseas country/city
  const isOrigIndian = INDIAN_ORIGINS.some(k => orig.includes(k));
  const isDestOverseas = OVERSEAS_COUNTRIES.some(k => dest.includes(k));

  if (isOrigIndian && isDestOverseas) {
    return true;
  }

  // If destination contains an overseas country and origin is different country
  if (isDestOverseas && !orig.includes(dest)) {
    return true;
  }

  return false;
};

export const getFeasibleTransportModes = (originStr, destinationStr) => {
  if (isOverseasRoute(originStr, destinationStr)) {
    return {
      Flight: { feasible: true, reason: 'Recommended for overseas routes' },
      Train: { feasible: false, reason: 'Not feasible for overseas ocean routes' },
      Car: { feasible: false, reason: 'Not feasible for overseas ocean routes' },
      Bus: { feasible: false, reason: 'Not feasible for overseas ocean routes' },
      Bike: { feasible: false, reason: 'Not feasible for overseas ocean routes' }
    };
  }

  // Domestic / Land-connected routes: all modes are allowed
  return {
    Flight: { feasible: true, reason: 'Fastest aerial route' },
    Train: { feasible: true, reason: 'Scenic & comfortable rail route' },
    Car: { feasible: true, reason: 'Flexible road drive' },
    Bus: { feasible: true, reason: 'Budget road transit' },
    Bike: { feasible: true, reason: 'Adventurous motor ride' }
  };
};

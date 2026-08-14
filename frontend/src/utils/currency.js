/**
 * Robust currency symbol detection based on destination city or country name.
 * Automatically defaults to ₹ (INR) for Indian cities/states.
 */
export const getCurrencySymbol = (locationStr) => {
  if (!locationStr || typeof locationStr !== 'string') return '₹';
  
  const c = locationStr.toLowerCase().trim();

  // Indian Cities & States
  const indianKeywords = [
    'india', 'ind', 'coimbatore', 'chennai', 'madurai', 'trichy', 'salem', 'tirupur',
    'ooty', 'kodaikanal', 'pondicherry', 'puducherry', 'bangalore', 'bengaluru', 'mysore',
    'hyderabad', 'vizag', 'kochi', 'trivandrum', 'thiruvananthapuram', 'calicut', 'kerala',
    'tamil nadu', 'karnataka', 'andhra', 'telangana', 'mumbai', 'pune', 'delhi', 'new delhi',
    'jaipur', 'udaipur', 'goa', 'kolkata', 'ahmedabad', 'surat', 'agra', 'varanasi', 'shimla',
    'manali', 'dharamshala', 'leh', 'ladakh', 'kashmir', 'srinagar', 'guwahati', 'gangtok'
  ];

  for (const keyword of indianKeywords) {
    if (c.includes(keyword)) return '₹';
  }

  // Global Currency Mappings
  if (c.includes('japan') || c.includes('tokyo') || c.includes('kyoto') || c.includes('osaka') || c.includes('sapporo')) return '¥';
  if (c.includes('uk') || c.includes('united kingdom') || c.includes('london') || c.includes('england') || c.includes('scotland') || c.includes('manchester')) return '£';
  if (c.includes('europe') || c.includes('france') || c.includes('paris') || c.includes('italy') || c.includes('rome') || c.includes('germany') || c.includes('berlin') || c.includes('spain') || c.includes('barcelona') || c.includes('madrid') || c.includes('netherlands') || c.includes('amsterdam') || c.includes('greece') || c.includes('athens') || c.includes('portugal') || c.includes('lisbon') || c.includes('austria') || c.includes('vienna') || c.includes('belgium')) return '€';
  if (c.includes('swiss') || c.includes('switzerland') || c.includes('zurich') || c.includes('geneva') || c.includes('lucerne') || c.includes('bern')) return 'CHF ';
  if (c.includes('dubai') || c.includes('uae') || c.includes('abu dhabi') || c.includes('sharjah')) return 'AED ';
  if (c.includes('saudi') || c.includes('riyadh') || c.includes('jeddah')) return 'SAR ';
  if (c.includes('thailand') || c.includes('thai') || c.includes('bangkok') || c.includes('phuket') || c.includes('chiang mai') || c.includes('pattaya')) return '฿';
  if (c.includes('indonesia') || c.includes('bali') || c.includes('jakarta') || c.includes('ubud')) return 'Rp ';
  if (c.includes('singapore')) return 'S$';
  if (c.includes('malaysia') || c.includes('kuala lumpur') || c.includes('penang')) return 'RM ';
  if (c.includes('australia') || c.includes('sydney') || c.includes('melbourne') || c.includes('brisbane')) return 'A$';
  if (c.includes('canada') || c.includes('toronto') || c.includes('vancouver') || c.includes('montreal')) return 'C$';
  if (c.includes('korea') || c.includes('seoul') || c.includes('busan')) return '₩';
  if (c.includes('vietnam') || c.includes('hanoi') || c.includes('ho chi minh')) return '₫';
  if (c.includes('china') || c.includes('beijing') || c.includes('shanghai')) return '¥';
  if (c.includes('usa') || c.includes('america') || c.includes('united states') || c.includes('new york') || c.includes('los angeles') || c.includes('chicago') || c.includes('miami') || c.includes('vegas') || c.includes('san francisco') || c.includes('hawaii')) return '$';

  // Fallback: If no country matched and location name contains typical Indian formatting, return ₹
  return '₹';
};

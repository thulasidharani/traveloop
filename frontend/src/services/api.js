export const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const apiCall = async (endpoint, options = {}) => {
  const { session } = await import('./supabase').then(m => m.supabase.auth.getSession()).then(r => r.data);
  const token = session?.access_token;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
};

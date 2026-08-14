export const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000');

export const apiCall = async (endpoint, options = {}) => {
  let token = null;
  try {
    const { supabase } = await import('./supabase');
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token;
  } catch (e) {
    console.warn("Session retrieval failed in apiCall:", e);
  }
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.warn(`API call to ${endpoint} failed:`, err?.message || err);
    throw err;
  }
};

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isLocal ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

export async function fetchApi(endpoint, options = {}, activeRole = 'INVESTIGATOR') {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'x-demo-role': activeRole
  };

  const token = localStorage.getItem('cyber_token');
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Server Response Error: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status} Request Failed`);
  }

  return data;
}

export async function uploadMeetingAudio(formData, activeRole = 'INVESTIGATOR') {
  const token = localStorage.getItem('cyber_token');
  const headers = {
    'Content-Type': 'application/json',
    'x-demo-role': activeRole
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Convert FormData to JSON object for 100% Vercel Serverless Function compatibility
  const payload = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === 'string') {
      payload[key] = value;
    }
  }

  const response = await fetch(`${API_BASE_URL}/meetings/upload`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`Server Response Error: ${response.status} ${response.statusText}`);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Audio processing upload failed');
  }

  return data;
}

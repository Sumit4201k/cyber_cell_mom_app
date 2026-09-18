const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (isLocal ? 'http://localhost:5000/api' : `${window.location.origin}/api`);

function extractHumanReadableError(text, status) {
  if (!text || typeof text !== 'string') {
    return `Server communication error (HTTP ${status || 500}). Please ensure the service is running.`;
  }

  // 1. Try parsing JSON
  try {
    const data = JSON.parse(text);
    if (data && (data.message || data.error)) {
      return data.message || data.error;
    }
  } catch (e) {}

  // 2. If response is HTML, extract title or body text cleanly
  if (text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('<body')) {
    const titleMatch = text.match(/<title>(.*?)<\/title>/i);
    const preMatch = text.match(/<pre>(.*?)<\/pre>/i);
    if (preMatch && preMatch[1] && !preMatch[1].includes('Error:')) {
      return preMatch[1].trim();
    }
    if (titleMatch && titleMatch[1]) {
      const title = titleMatch[1].trim();
      if (title.toLowerCase() !== 'error') {
        return `Server returned: ${title} (HTTP ${status || 500})`;
      }
    }
    if (status === 500) {
      return 'Internal server error: The server encountered an issue processing your request. Please try again.';
    }
    if (status === 503) {
      return 'Service Unavailable: AI ML engine or backend is offline. Please check connection.';
    }
    if (status === 404) {
      return 'Requested resource or API route could not be found.';
    }
    return `Server error (${status || 500}): Unable to process request.`;
  }

  // 3. Clean raw text snippet
  const cleanSnippet = text.replace(/<[^>]*>?/gm, '').trim();
  if (cleanSnippet.length > 0 && cleanSnippet.length < 120) {
    return cleanSnippet;
  }

  return `Server request failed with status HTTP ${status || 500}.`;
}

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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch (netErr) {
    throw new Error(`Unable to connect to State Cyber Cell server at ${API_BASE_URL}. Ensure the backend service is running.`);
  }

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    const readableMsg = extractHumanReadableError(text, response.status);
    throw new Error(readableMsg);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Request failed with status HTTP ${response.status}`);
  }

  return data;
}

export async function uploadMeetingAudio(formData, activeRole = 'INVESTIGATOR') {
  const token = localStorage.getItem('cyber_token');
  const headers = {
    'x-demo-role': activeRole
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== 'undefined' && formData instanceof FormData;

  let body;
  if (isFormData) {
    body = formData; // Browser automatically sets multipart/form-data boundary
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(formData);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/meetings/upload`, {
      method: 'POST',
      headers,
      body
    });
  } catch (netErr) {
    throw new Error(`Unable to connect to audio processing service. Ensure the server is online.`);
  }

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (err) {
    const readableMsg = extractHumanReadableError(text, response.status);
    throw new Error(readableMsg);
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `Audio processing failed with HTTP ${response.status}`);
  }

  return data;
}

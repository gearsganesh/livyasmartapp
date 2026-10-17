const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const API_URL = (configuredApiUrl || (import.meta.env.PROD ? 'https://api.livyacurehub.com' : 'http://localhost:4000')).replace(/\/$/, '');

export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      credentials: 'include',
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    const error = new Error(
      import.meta.env.PROD
        ? 'Unable to reach LIVYA services. Please try again later.'
        : 'Unable to reach the LIVYA API. Check that the local server is running.'
    );
    error.code = 'API_UNREACHABLE';
    throw error;
  }

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('livya:unauthorized'));
    }
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.fields = data.fields;
    throw error;
  }
  return data;
}

export const authApi = {
  login: (email, password) => api('/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password, fullName) => api('/auth/register', { method: 'POST', body: { email, password, fullName } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => api('/auth/me'),
};

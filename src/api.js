const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'grudge.token';
const USER_KEY = 'grudge.user';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token, user) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getCurrentUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function request(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const token = getToken();
  const config = { method, headers: { ...headers } };

  if (body !== undefined) {
    config.headers['Content-Type'] = 'application/json';
    config.body = JSON.stringify(body);
  }

  if (auth && token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, config);
  const text = await res.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `Request failed with status ${res.status}`;

    if (res.status === 401 && auth) {
      clearSession();
    }

    throw new ApiError(message, res.status, data);
  }

  return data;
}

export const api = {
  get: (path, options = {}) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options = {}) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options = {}) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options = {}) => request(path, { ...options, method: 'DELETE' })
};

async function sessionRequest(path, payload) {
  const data = await api.post(path, payload, { auth: false });

  if (data?.token) {
    setSession(data.token, data.user);
  }

  return data;
}

export const auth = {
  register: (payload) => sessionRequest('/auth/register', payload),
  login: (payload) => sessionRequest('/auth/login', payload),
  me: () => api.get('/auth/me')
};

export const ledgers = {
  list: () => api.get('/ledgers'),
  get: (id) => api.get(`/ledgers/${encodeURIComponent(id)}`),
  create: (payload) => api.post('/ledgers', payload),
  invite: (id) => api.post(`/ledgers/${encodeURIComponent(id)}/invite`),
  join: (code) => api.post('/ledgers/join', { code })
};

export const debts = {
  log: (payload) => api.post('/debts', payload),
  pay: (id, payload = {}) => api.post(`/debts/${encodeURIComponent(id)}/pay`, payload)
};

export const reports = {
  weekly: (ledgerId) => api.get(`/reports/weekly?ledgerId=${encodeURIComponent(ledgerId)}`)
};

export default api;
/**
 * API client for communicating with the Express backend.
 * Automatically attaches the Cognito ID token to every request.
 */
import { fetchAuthSession } from 'aws-amplify/auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function getAuthHeaders() {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request(method, path, body = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await getAuthHeaders()),
  };

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || 'Request failed');
  }

  return data;
}

// ─── Convenience Methods ─────────────────────────────────
export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  delete: (path) => request('DELETE', path),
};

// ─── Typed API Modules ───────────────────────────────────

export const tasksApi = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/api/tasks${query ? `?${query}` : ''}`);
  },
  get: (taskId) => api.get(`/api/tasks/${taskId}`),
  create: (data) => api.post('/api/tasks', data),
  update: (taskId, data) => api.put(`/api/tasks/${taskId}`, data),
  delete: (taskId) => api.delete(`/api/tasks/${taskId}`),
};

export const projectsApi = {
  list: () => api.get('/api/projects'),
  get: (id) => api.get(`/api/projects/${id}`),
  create: (data) => api.post('/api/projects', data),
  update: (id, data) => api.put(`/api/projects/${id}`, data),
  delete: (id) => api.delete(`/api/projects/${id}`),
};

export const teamsApi = {
  list: () => api.get('/api/teams'),
  get: (id) => api.get(`/api/teams/${id}`),
  members: (id) => api.get(`/api/teams/${id}/members`),
  create: (data) => api.post('/api/teams', data),
  delete: (id) => api.delete(`/api/teams/${id}`),
};

export const commentsApi = {
  listByTask: (taskId) => api.get(`/api/comments/${taskId}`),
  create: (data) => api.post('/api/comments', data),
  delete: (id) => api.delete(`/api/comments/${id}`),
};

export const uploadApi = {
  getPresignedUrl: (data) => api.post('/api/upload/presigned-url', data),
};

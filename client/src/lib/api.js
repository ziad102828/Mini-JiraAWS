/**
 * Centralized API Client
 * Uses the proxy defined in vite.config.js for /api requests
 */

async function request(path, options = {}, token) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || err.message || 'Request failed');
  }

  return res.json();
}

export const api = {
  // --- Tasks ---
  getTasks: (token, teamId) => 
    request(`/api/tasks${teamId ? `?teamId=${teamId}` : ''}`, {}, token),
  
  getTask: (token, taskId) => 
    request(`/api/tasks/${taskId}`, {}, token),
  
  createTask: (token, body) => 
    request('/api/tasks', { method: 'POST', body: JSON.stringify(body) }, token),
  
  updateTaskStatus: (token, taskId, status) => 
    request(`/api/tasks/${taskId}`, { 
      method: 'PUT', // Fixed from PATCH to PUT based on our backend implementation
      body: JSON.stringify({ status }) 
    }, token),
  
  // --- Comments ---
  getComments: (token, taskId) => 
    request(`/api/comments/${taskId}`, {}, token), // Correct route
  
  createComment: (token, taskId, content) => 
    request(`/api/comments`, { // Correct route
      method: 'POST', 
      body: JSON.stringify({ taskId, content }) 
    }, token),
  
  // --- Upload (Presigned S3 URLs) ---
  getPresignedUrl: (token, fileName, fileType, taskId) => 
    request('/api/upload/presigned-url', { 
      method: 'POST', 
      body: JSON.stringify({ fileName, fileType, taskId }) 
    }, token),

  // --- Audit Log ---
  getAuditLog: (token, taskId) =>
    request(`/api/tasks/${taskId}/audit`, {}, token),

  // --- Teams ---
  getTeams: (token) =>
    request('/api/teams', {}, token),

  createTeam: (token, name) =>
    request('/api/teams', { method: 'POST', body: JSON.stringify({ name }) }, token),

  deleteTeam: (token, teamId) =>
    request(`/api/teams/${teamId}`, { method: 'DELETE' }, token),

  getTeamMembers: (token, teamId) =>
    request(`/api/teams/${teamId}/members`, {}, token),

  getUsers: (token) =>
    request('/api/users', {}, token),
};

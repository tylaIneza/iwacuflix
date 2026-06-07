import axios from 'axios';
import { getToken, removeToken } from './auth';

// Empty = same origin. Works for both local dev (Next.js API routes on :3000)
// and VPS (nginx on same domain). No separate backend process needed.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export const api = axios.create({ baseURL: BASE });

// Auto-attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401: clear stale token and send back to admin login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      const isAdminRoute = window.location.pathname.startsWith('/admin') &&
                           window.location.pathname !== '/admin';
      if (isAdminRoute) {
        removeToken();
        window.location.href = '/admin';
      }
    }
    return Promise.reject(err);
  }
);

// ── Public ──────────────────────────────────────────────────
export const fetchContent = (params?: Record<string, string>) =>
  api.get('/api/content', { params }).then((r) => r.data);

export const fetchContentById = (id: string) =>
  api.get(`/api/content/${id}`).then((r) => r.data);

export const recordView = (id: string) =>
  api.post(`/api/content/${id}/view`).catch(() => {});

export const recordVisit = (path: string) =>
  api.post('/api/visit', { path }).catch(() => {});

// ── Auth ─────────────────────────────────────────────────────
export const login = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password }).then((r) => r.data);

export const verifyToken = (token: string) =>
  api.get('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.data);

// ── Admin ─────────────────────────────────────────────────────
export const adminFetchStats = () =>
  api.get('/api/admin/stats').then((r) => r.data);

export const adminFetchContent = (params?: Record<string, string>) =>
  api.get('/api/admin/content', { params }).then((r) => r.data);

export const adminCreateContent = (data: object) =>
  api.post('/api/admin/content', data).then((r) => r.data);

export const adminUpdateContent = (id: string, data: object) =>
  api.put(`/api/admin/content/${id}`, data).then((r) => r.data);

export const adminTogglePublish = (id: string) =>
  api.put(`/api/admin/content/${id}/publish`).then((r) => r.data);

export const adminDeleteContent = (id: string) =>
  api.delete(`/api/admin/content/${id}`).then((r) => r.data);

export const adminUploadThumbnail = (file: File) => {
  const form = new FormData();
  form.append('thumbnail', file);
  return api.post('/api/admin/upload', form).then((r) => r.data);
};

// ── User management ──────────────────────────────────────────
export const adminFetchUsers = () =>
  api.get('/api/admin/users').then((r) => r.data);

export const adminCreateUser = (email: string, password: string) =>
  api.post('/api/admin/users', { email, password }).then((r) => r.data);

export const adminChangePassword = (id: number, password: string) =>
  api.patch(`/api/admin/users/${id}`, { password }).then((r) => r.data);

export const adminDeleteUser = (id: number) =>
  api.delete(`/api/admin/users/${id}`).then((r) => r.data);

// ── Categories ────────────────────────────────────────────
export const adminFetchCategories = () =>
  api.get('/api/admin/categories').then((r) => r.data);

export const adminCreateCategory = (name: string) =>
  api.post('/api/admin/categories', { name }).then((r) => r.data);

export const adminDeleteCategory = (id: number) =>
  api.delete(`/api/admin/categories/${id}`).then((r) => r.data);

// ── Admin Analytics ───────────────────────────────────────
export const adminFetchAnalytics = (params?: Record<string, string>) =>
  api.get('/api/admin/analytics', { params }).then((r) => r.data);

export const adminFetchVideoAnalytics = (id: string | number) =>
  api.get(`/api/admin/analytics/video/${id}`).then((r) => r.data);

export const adminFetchUserAnalytics = (id: string | number) =>
  api.get(`/api/admin/analytics/user/${id}`).then((r) => r.data);

export const adminExportAnalytics = (params?: Record<string, string>) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : '';
  window.open(`/api/admin/analytics/export${qs}`, '_blank');
};

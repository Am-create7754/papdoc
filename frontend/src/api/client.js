import axios from 'axios';
import i18n from '../i18n';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  // Without a timeout a request on a dropped mobile connection can hang forever with the button
  // stuck on "Saving...". Uploads override this with a longer limit.
  timeout: 30000,
  // ngrok's free tier puts a "you are visiting…" page in front of browser requests; this header
  // skips it for API calls when the app is opened through an ngrok test URL. No effect elsewhere.
  headers: window.location.hostname.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {},
});

export const UPLOAD_TIMEOUT_MS = 120000;

// Requests that never reached the server have no `response`. Give them one carrying a readable
// message so every page's existing `err.response?.data?.message` fallback shows something useful.
function withNetworkMessage(error) {
  if (!error.response && !axios.isCancel(error)) {
    const key = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' ? 'errors.timeout' : 'errors.network';
    error.response = { status: 0, data: { success: false, message: i18n.t(key) } };
  }
  return error;
}

let accessToken = null;

export function setAccessToken(token) {
  accessToken = token;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise = null;

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/refresh') &&
      !originalRequest.url?.includes('/login')
    ) {
      originalRequest._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = apiClient.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const { data } = await refreshPromise;
        setAccessToken(data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(withNetworkMessage(error));
  }
);

export default apiClient;

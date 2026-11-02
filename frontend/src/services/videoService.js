import apiClient from '../api/client';

export async function fetchVideoAvailability() {
  const { data } = await apiClient.get('/video/availability');
  return data.data;
}

export async function fetchMyVideoSession() {
  const { data } = await apiClient.get('/video/my');
  return data.data;
}

export async function fetchVideoSessionById(sessionId) {
  const { data } = await apiClient.get(`/video/${sessionId}`);
  return data.data;
}

export async function fetchDoctorVideoQueue() {
  const { data } = await apiClient.get('/video/doctor/queue');
  return data.data;
}

export async function fetchVideoSummaryByConsultation(consultationId) {
  const { data } = await apiClient.get(`/video/by-consultation/${consultationId}`);
  return data.data;
}

export async function requestVideoToken(sessionId) {
  const { data } = await apiClient.post(`/video/${sessionId}/token`);
  return data.data;
}

export async function reportVideoJoined(sessionId) {
  const { data } = await apiClient.post(`/video/${sessionId}/joined`);
  return data.data;
}

export async function cancelVideoSession(sessionId) {
  const { data } = await apiClient.post(`/video/${sessionId}/cancel`);
  return data.data;
}

export async function endVideoSession(sessionId) {
  const { data } = await apiClient.post(`/video/${sessionId}/end`);
  return data.data;
}

export async function markVideoNoShow(sessionId, reason) {
  const { data } = await apiClient.post(`/video/${sessionId}/no-show`, { reason });
  return data.data;
}

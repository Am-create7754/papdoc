import apiClient from '../api/client';

export async function registerPatient(payload) {
  const { data } = await apiClient.post('/auth/patient/register', payload);
  return data.data;
}

export async function loginPatient(payload) {
  const { data } = await apiClient.post('/auth/patient/login', payload);
  return data.data;
}

export async function loginPatientWithGoogle(credential) {
  const { data } = await apiClient.post('/auth/patient/google', { credential });
  return data.data;
}

export async function loginDoctor(payload) {
  const { data } = await apiClient.post('/auth/doctor/login', payload);
  return data.data;
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me');
  return data.data;
}

export async function refreshSession() {
  const { data } = await apiClient.post('/auth/refresh');
  return data.data;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}

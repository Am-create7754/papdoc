import apiClient from '../api/client';

export async function fetchMyPatientProfile() {
  const { data } = await apiClient.get('/patient/me');
  return data.data;
}

export async function updateMyPatientProfile(payload) {
  const { data } = await apiClient.patch('/patient/me', payload);
  return data.data;
}

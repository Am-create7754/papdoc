import apiClient from '../api/client';

export async function fetchMyDoctorProfile() {
  const { data } = await apiClient.get('/doctor/me');
  return data.data;
}

export async function updateMyDoctorProfile(payload) {
  const { data } = await apiClient.patch('/doctor/me', payload);
  return data.data;
}

export async function fetchPublicDoctorProfile() {
  const { data } = await apiClient.get('/doctor/profile');
  return data.data;
}

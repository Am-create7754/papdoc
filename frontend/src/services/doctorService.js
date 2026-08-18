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

export async function uploadDoctorSignature(file) {
  const formData = new FormData();
  formData.append('signature', file);
  const { data } = await apiClient.post('/doctor/me/signature', formData);
  return data.data;
}

// signatureImage is either a bare filename (uploaded via Healthify) or a full external URL.
export function signatureImageUrl(signatureImage) {
  if (!signatureImage) return null;
  if (/^https?:\/\//i.test(signatureImage)) return signatureImage;
  return `${import.meta.env.VITE_API_URL}/doctor/signature/${signatureImage}`;
}

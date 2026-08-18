import apiClient from '../api/client';

export async function createConsultation(formData) {
  const { data } = await apiClient.post('/consultations', formData);
  return data.data;
}

export async function fetchMyConsultations() {
  const { data } = await apiClient.get('/consultations/my');
  return data.data;
}

export async function fetchMyConsultationById(id) {
  const { data } = await apiClient.get(`/consultations/${id}`);
  return data.data;
}

export async function fetchDoctorConsultations() {
  const { data } = await apiClient.get('/doctor/consultations');
  return data.data;
}

export async function fetchDoctorConsultationById(id) {
  const { data } = await apiClient.get(`/doctor/consultations/${id}`);
  return data.data;
}

export async function fetchAttachmentBlob(consultationId, attachmentId) {
  const { data, headers } = await apiClient.get(
    `/consultations/${consultationId}/attachments/${attachmentId}`,
    { responseType: 'blob' }
  );
  return { blob: data, mimeType: headers['content-type'] };
}

export async function fetchPrescriptionBlob(consultationId, lang = 'en') {
  const { data } = await apiClient.get(`/consultations/${consultationId}/prescription`, {
    params: { lang },
    responseType: 'blob',
  });
  return data;
}

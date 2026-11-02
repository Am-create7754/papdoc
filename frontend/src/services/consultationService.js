import apiClient, { UPLOAD_TIMEOUT_MS } from '../api/client';

export async function createConsultation(formData) {
  const { data } = await apiClient.post('/consultations', formData, { timeout: UPLOAD_TIMEOUT_MS });
  return data.data;
}

// Backend is authoritative for both input safety and video eligibility — this is a lightweight
// check the wizard calls incrementally for immediate feedback, never a decision the frontend
// makes on its own. The exact same rules run again, unavoidably, at actual submission time.
export async function precheckConsultationInput(payload) {
  const { data } = await apiClient.post('/consultations/precheck', payload);
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

export async function submitManualDoctorReply(consultationId, reply) {
  const { data } = await apiClient.post(`/doctor/consultations/${consultationId}/manual-reply`, { reply });
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

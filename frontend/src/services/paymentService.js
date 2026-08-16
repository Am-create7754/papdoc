import apiClient from '../api/client';

export async function createPaymentOrder(consultationId) {
  const { data } = await apiClient.post('/payments/create-order', { consultationId });
  return data.data;
}

export async function verifyPayment(payload) {
  const { data } = await apiClient.post('/payments/verify', payload);
  return data.data;
}

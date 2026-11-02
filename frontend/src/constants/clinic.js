// Single source for the clinic's physical details, shared by the landing map, the doctor card
// and the footer. Update here and every place that shows them follows.
export const CLINIC_LOCATION =
  'Sahay Clinics, Flat 4/115-E, VIP Road, Obra Sector 5, Sonebhadra, Uttar Pradesh 231219';

export const CLINIC_MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(CLINIC_LOCATION)}&z=15&output=embed`;
export const CLINIC_DIRECTIONS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLINIC_LOCATION)}`;

export const CLINIC_PHONES = ['8400712522', '8009590800'];

export function formatPhone(phone) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

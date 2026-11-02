// Video consultations stay "Coming soon" until the Twilio video call has been tested end to end.
// Set VITE_VIDEO_CONSULTATIONS=true in frontend/.env to switch every video entry point back on.
export const VIDEO_CONSULTATIONS_LIVE = import.meta.env.VITE_VIDEO_CONSULTATIONS === 'true';

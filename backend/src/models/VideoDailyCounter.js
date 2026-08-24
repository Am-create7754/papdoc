const mongoose = require('mongoose');

// One document per calendar day. `count` is only ever mutated through atomic $inc guarded by
// a query filter (see videoService.reserveDailySlot/releaseDailySlot) — never read-modify-write
// from application code — so concurrent bookings cannot push it past the daily cap.
const videoDailyCounterSchema = new mongoose.Schema({
  dayKey: { type: String, required: true, unique: true }, // YYYY-MM-DD
  count: { type: Number, required: true, default: 0, min: 0 },
});

module.exports = mongoose.model('VideoDailyCounter', videoDailyCounterSchema);

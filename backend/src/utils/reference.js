function consultationReferenceCode(consultation) {
  return `HF-${consultation._id.toString().slice(-6).toUpperCase()}`;
}

module.exports = { consultationReferenceCode };

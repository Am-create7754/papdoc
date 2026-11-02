// Deterministic, explainable consultation-MODE routing — never diagnosis. This decides only
// whether Video Consultation is offered; Normal and Priority Consultation are never affected.
//
// Design principle (deliberate): red-flag detection uses a BLOCKLIST (any match keeps video
// available), but low-acuity classification uses an ALLOWLIST, not a blocklist. A bare symptom
// word like "headache" or "fever" never triggers low-acuity on its own — only an explicit
// mild/routine/administrative qualifier does. Anything that doesn't confidently match the
// allowlist falls through to "uncertain", which always keeps video available. This asymmetry is
// intentional: it is far safer to under-restrict (a low-acuity case still gets to pick video)
// than to over-restrict (a serious case gets steered away from a doctor).

const RED_FLAG_PATTERNS = [
  /\bchest\s*pain\b/i,
  /\b(difficulty|trouble|can'?t)\s*breath(e|ing)\b/i,
  /\bshort(ness)?\s*of\s*breath\b/i,
  /\b(fainted|fainting|passed out|loss of consciousness|unconscious)\b/i,
  /\bseizure|convulsion\b/i,
  /\b(heavy|severe|uncontrolled)\s*bleeding\b/i,
  /\bsevere\s*(injury|accident|trauma|burn)\b/i,
  /\bconfus(ed|ion)|disoriented\b/i,
  /\bpersistent\s*vomiting|can'?t\s*keep\s*(anything|food|water)\s*down\b/i,
  /\bdehydrat(ed|ion)\b/i,
  /\bsevere\s*allerg(y|ic)|anaphyla/i,
  /\b(rapidly|suddenly)\s*(worsening|getting worse|deteriorating)\b/i,
  /\bsudden(ly)?\s*(severe|worst|blurred|weak|numb)/i,
  /\b(slurred speech|one side (of|of the) (body|face)|facial droop|paraly[sz]ed|paralysis)\b/i,
  /\bworst\s*headache\s*of\s*my\s*life\b/i,
  /\bswelling\s*(of|in)\s*(the\s*)?(face|throat|lips)\b/i,
  /\bblue\s*(lips|face)\b/i,
  /\bchoking\b/i,
  /\bsuicid(e|al)|self\s*harm\b/i,
  /\bsevere\s*(pain|headache|stomach ache|abdominal pain)\b/i,
  /\bhigh\s*fever\b.*\b(baby|infant|newborn)\b/i,
];

// Every entry requires an explicit mild/routine/administrative qualifier alongside the symptom —
// never a bare symptom name — per the critical safety rule that headache/fever/cough/etc. can
// never be assumed minor on their own.
const LOW_ACUITY_PATTERNS = [
  /\b(mild|slight|minor)\s*(cold|common cold|sore throat|cough|runny nose|congestion|headache|body ache)\b/i,
  /\bcommon\s*cold\b/i,
  /\b(prescription\s*refill|repeat\s*prescription|renew(?:ing)?\s*(?:my\s*)?prescription|refill\s*(?:my\s*)?medication)\b/i,
  /\broutine\s*follow[- ]?up\b/i,
  /\b(seasonal\s*allergy|mild\s*allergy)\b/i,
  /\bmild\s*acne\b/i,
  /\breview\s*(?:my\s*)?(?:reports|test results|lab results)\b/i,
  /\bgeneral\s*(wellness|health)\s*check(-?up)?\b/i,
];

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const diffMs = Date.now() - new Date(dateOfBirth).getTime();
  return Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
}

function combinedText({ chiefComplaint, symptoms, duration, additionalNotes }) {
  const symptomsText = Array.isArray(symptoms) ? symptoms.join(' ') : String(symptoms || '');
  return [chiefComplaint, symptomsText, duration, additionalNotes].filter(Boolean).join(' ');
}

/**
 * @returns {{ videoEligible: boolean, reasonCode: 'AGE_UNDER_10'|'RED_FLAG_PRESENT'|'LOW_ACUITY_NO_RED_FLAGS'|'UNCERTAIN' }}
 */
function checkVideoEligibility({ dateOfBirth, chiefComplaint, symptoms, duration, additionalNotes }) {
  const age = calculateAge(dateOfBirth);

  // Age exception is absolute — checked before anything else, per the explicit requirement that
  // it applies "regardless of low-acuity classification".
  if (age != null && age < 10) {
    return { videoEligible: true, reasonCode: 'AGE_UNDER_10' };
  }

  const text = combinedText({ chiefComplaint, symptoms, duration, additionalNotes });

  if (RED_FLAG_PATTERNS.some((re) => re.test(text))) {
    return { videoEligible: true, reasonCode: 'RED_FLAG_PRESENT' };
  }

  if (LOW_ACUITY_PATTERNS.some((re) => re.test(text))) {
    return { videoEligible: false, reasonCode: 'LOW_ACUITY_NO_RED_FLAGS' };
  }

  // Default: not confidently anything — keep video available.
  return { videoEligible: true, reasonCode: 'UNCERTAIN' };
}

module.exports = { checkVideoEligibility, calculateAge };

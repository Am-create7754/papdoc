// Deterministic, explainable rules layer for the patient-facing "What's bothering you?" field —
// deliberately NOT an LLM call per submission. Two failure modes are checked: clearly abusive/
// threatening/harassing language, and clearly meaningless/spam input. Both checks are written to
// fail toward ACCEPTING real medical language: anatomy, sexual/reproductive health, urination/
// bowel symptoms, injuries, and mental-health terms are never on the blocklist, and the blocklist
// only contains words/phrases with no legitimate clinical use.

const PROFANITY_WORDS = [
  'fuck', 'fucking', 'fucker', 'motherfucker', 'shit', 'bullshit', 'bitch', 'bastard', 'cunt',
  'whore', 'slut', 'asshole', 'dumbass', 'jackass', 'dipshit', 'douchebag', 'prick', 'twat',
  'faggot', 'nigger', 'nigga', 'retard', 'retarded', 'chutiya', 'madarchod', 'behenchod',
  'bhosdike', 'randi', 'saala kutta', 'harami',
];

// Word-boundary matched so clinical terms are never caught — e.g. "assessment" or "class" never
// match "ass" because there is no "ass" entry at all; the list only has whole abusive words.
const PROFANITY_REGEX = new RegExp(`\\b(${PROFANITY_WORDS.join('|')})\\b`, 'i');

const THREAT_PATTERNS = [
  /\bi\s*(will|'ll|am going to)\s*(kill|hurt|beat|stab|shoot)\s*(you|u|ur|your)\b/i,
  /\byou\s*(will|'ll)\s*(pay|regret|die)\b/i,
  /\bi\s*know\s*where\s*you\s*live\b/i,
  /\bwatch\s*your\s*back\b/i,
  /\bi\s*will\s*find\s*you\b/i,
];

const HARASSMENT_SEXUAL_PATTERNS = [
  /\bsend\s*(me\s*)?nudes\b/i,
  /\bwant\s*to\s*fuck\s*you\b/i,
  /\bshow\s*me\s*your\s*(boobs|tits|body)\b/i,
  /\bare\s*you\s*single\b.*\bdoctor\b/i,
];

// Spam / meaningless input — kept conservative: only flags patterns with essentially zero
// chance of being genuine medical text, per the instruction to avoid aggressive keyword-only
// blocking. A short, oddly-worded but real sentence is never rejected by these checks.
function isMeaninglessSpam(text) {
  const trimmed = text.trim();
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');

  if (lettersOnly.length < 3) return true; // essentially just punctuation/numbers/symbols
  if (/(.)\1{4,}/.test(trimmed)) return true; // same character repeated 5+ times, e.g. "aaaaaaa"

  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;

  // A real English/Hindi(-transliterated) sentence has a healthy mix of vowels. Pure keyboard
  // mashing ("asdkjfhgk", "qwertyuiop") almost always has a very low vowel ratio over a longer
  // run of letters — short words are exempt so real short complaints are never penalized.
  if (lettersOnly.length >= 10) {
    const vowelCount = (lettersOnly.match(/[aeiouAEIOU]/g) || []).length;
    if (vowelCount / lettersOnly.length < 0.15) return true;
  }

  return false;
}

const REJECTION_MESSAGE =
  "We couldn't accept that description. Please rewrite your concern using respectful, medically relevant language.";

/**
 * @param {string} text - the raw chief-complaint text as submitted.
 * @returns {{ accepted: boolean, reasonCode: string, message?: string }}
 */
function checkComplaintText(text) {
  const value = String(text || '');

  if (PROFANITY_REGEX.test(value)) {
    return { accepted: false, reasonCode: 'PROFANITY_DETECTED', message: REJECTION_MESSAGE };
  }
  if (THREAT_PATTERNS.some((re) => re.test(value))) {
    return { accepted: false, reasonCode: 'THREAT_DETECTED', message: REJECTION_MESSAGE };
  }
  if (HARASSMENT_SEXUAL_PATTERNS.some((re) => re.test(value))) {
    return { accepted: false, reasonCode: 'HARASSMENT_DETECTED', message: REJECTION_MESSAGE };
  }
  if (isMeaninglessSpam(value)) {
    return { accepted: false, reasonCode: 'SPAM_OR_MEANINGLESS', message: REJECTION_MESSAGE };
  }

  return { accepted: true, reasonCode: 'OK' };
}

module.exports = { checkComplaintText };

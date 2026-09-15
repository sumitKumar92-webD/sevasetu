export const LANGUAGES = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    speechCode: "en-IN",
  },
  {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
    speechCode: "as-IN",
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    speechCode: "bn-IN",
  },
  {
    code: "brx",
    name: "Bodo",
    nativeName: "बड़ो",
    speechCode: "hi-IN",
  },
  {
    code: "doi",
    name: "Dogri",
    nativeName: "डोगरी",
    speechCode: "hi-IN",
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    speechCode: "gu-IN",
  },
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    speechCode: "hi-IN",
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    speechCode: "kn-IN",
  },
  {
    code: "ks",
    name: "Kashmiri",
    nativeName: "کٲشُر",
    speechCode: "ur-IN",
  },
  {
    code: "kok",
    name: "Konkani",
    nativeName: "कोंकणी",
    speechCode: "mr-IN",
  },
  {
    code: "mai",
    name: "Maithili",
    nativeName: "मैथिली",
    speechCode: "hi-IN",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    speechCode: "ml-IN",
  },
  {
    code: "mni",
    name: "Manipuri",
    nativeName: "মৈতৈলোন্",
    speechCode: "bn-IN",
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    speechCode: "mr-IN",
  },
  {
    code: "ne",
    name: "Nepali",
    nativeName: "नेपाली",
    speechCode: "ne-NP",
  },
  {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    speechCode: "or-IN",
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    speechCode: "pa-IN",
  },
  {
    code: "sa",
    name: "Sanskrit",
    nativeName: "संस्कृतम्",
    speechCode: "hi-IN",
  },
  {
    code: "sat",
    name: "Santali",
    nativeName: "ᱥᱟᱱᱛᱟᱲᱤ",
    speechCode: "hi-IN",
  },
  {
    code: "sd",
    name: "Sindhi",
    nativeName: "سنڌي",
    speechCode: "ur-IN",
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    speechCode: "ta-IN",
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    speechCode: "te-IN",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    speechCode: "ur-IN",
  },
];

export const LANGUAGE_CODES = LANGUAGES.map(
  (language) => language.code
);

export function getLanguage(languageCode) {
  return (
    LANGUAGES.find(
      (language) => language.code === languageCode
    ) || LANGUAGES[0]
  );
}

export function speechCodeFor(languageCode) {
  return getLanguage(languageCode).speechCode;
}

export function isRightToLeft(languageCode) {
  return ["ur", "ks", "sd"].includes(languageCode);
}
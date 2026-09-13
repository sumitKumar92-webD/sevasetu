// Central catalogue of services offered on SevaSetu.
export const SERVICES = [
  { key: "electrician", en: "Electrician", hi: "इलेक्ट्रीशियन", icon: "💡", base: 350 },
  { key: "plumber", en: "Plumber", hi: "प्लंबर", icon: "🚰", base: 300 },
  { key: "carpenter", en: "Carpenter", hi: "बढ़ई", icon: "🪚", base: 400 },
  { key: "cleaner", en: "Home Cleaning", hi: "घर की सफाई", icon: "🧹", base: 250 },
  { key: "painter", en: "Painter", hi: "पेंटर", icon: "🎨", base: 380 },
  { key: "ac_repair", en: "AC Repair", hi: "एसी मरम्मत", icon: "❄️", base: 500 },
  { key: "appliance", en: "Appliance Repair", hi: "उपकरण मरम्मत", icon: "🔧", base: 450 },
  { key: "driver", en: "Driver", hi: "ड्राइवर", icon: "🚗", base: 280 },
  { key: "cook", en: "Cook", hi: "रसोइया", icon: "🍲", base: 320 },
  { key: "tutor", en: "Home Tutor", hi: "गृह शिक्षक", icon: "📚", base: 300 },
];

export function serviceLabel(key, lang = "en") {
  const s = SERVICES.find((x) => x.key === key);
  if (!s) return key;
  return lang === "hi" ? s.hi : s.en;
}

export function serviceIcon(key) {
  const s = SERVICES.find((x) => x.key === key);
  return s ? s.icon : "🛠️";
}

export const STATUS_FLOW = ["searching", "assigned", "on_the_way", "completed"];

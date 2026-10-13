export const LANGS = ["en", "fr", "ar"] as const;
export type Lang = (typeof LANGS)[number];

const en = {
  call: "Call",
  whatsapp: "WhatsApp",
  directions: "Directions",
  website: "Website",
  email: "Email",
  saveContact: "Save contact",
  contactSaved: "Contact card ready — open it to add to your contacts",
  contactFailed: "Could not create the contact card",
  offers: "Current offers",
  services: "Services",
  gallery: "Gallery",
  hours: "Opening hours",
  location: "Find us",
  social: "Follow us",
  reviewsTitle: "Your opinion matters",
  reviewsBody: "Had an experience with us? Share an honest review — it helps others and helps us improve.",
  leaveGoogle: "Leave a Google review",
  leaveOther: "Leave a review",
  validUntil: "Valid until",
  poweredBy: "Powered by",
  openMap: "Open in Google Maps",
  days: {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday", thursday: "Thursday",
    friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  } as Record<string, string>,
};
type Dict = typeof en;

const fr: Dict = {
  call: "Appeler",
  whatsapp: "WhatsApp",
  directions: "Itinéraire",
  website: "Site web",
  email: "E-mail",
  saveContact: "Enregistrer le contact",
  contactSaved: "Fiche contact prête — ouvrez-la pour l'ajouter à vos contacts",
  contactFailed: "Impossible de créer la fiche contact",
  offers: "Offres du moment",
  services: "Services",
  gallery: "Galerie",
  hours: "Horaires d'ouverture",
  location: "Nous trouver",
  social: "Suivez-nous",
  reviewsTitle: "Votre avis compte",
  reviewsBody: "Vous avez fait appel à nous ? Partagez un avis sincère — cela aide les autres et nous aide à progresser.",
  leaveGoogle: "Laisser un avis Google",
  leaveOther: "Laisser un avis",
  validUntil: "Valable jusqu'au",
  poweredBy: "Propulsé par",
  openMap: "Ouvrir dans Google Maps",
  days: {
    monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi",
    friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche",
  },
};

const ar: Dict = {
  call: "اتصال",
  whatsapp: "واتساب",
  directions: "الاتجاهات",
  website: "الموقع",
  email: "البريد",
  saveContact: "حفظ جهة الاتصال",
  contactSaved: "بطاقة الاتصال جاهزة — افتحها لإضافتها إلى جهات اتصالك",
  contactFailed: "تعذر إنشاء بطاقة الاتصال",
  offers: "العروض الحالية",
  services: "الخدمات",
  gallery: "معرض الصور",
  hours: "أوقات العمل",
  location: "موقعنا",
  social: "تابعونا",
  reviewsTitle: "رأيك يهمنا",
  reviewsBody: "هل تعاملت معنا؟ شاركنا تقييمك الصادق، فهو يساعد الآخرين ويساعدنا على التحسن.",
  leaveGoogle: "اترك تقييمًا على Google",
  leaveOther: "اترك تقييمًا",
  validUntil: "صالح حتى",
  poweredBy: "مدعوم من",
  openMap: "فتح في خرائط Google",
  days: {
    monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس",
    friday: "الجمعة", saturday: "السبت", sunday: "الأحد",
  },
};

export const DICTS: Record<Lang, Dict> = { en, fr, ar };
export const LANG_LABEL: Record<Lang, string> = { en: "EN", fr: "FR", ar: "ع" };

/** Polite, reward-free review request templates for owners to copy. */
export const REVIEW_REQUEST: Record<Lang, (name: string, url: string) => string> = {
  en: (n, u) => `Hello! Thank you for choosing ${n}. If you have a moment, we'd really appreciate an honest review of your experience: ${u}`,
  fr: (n, u) => `Bonjour ! Merci d'avoir choisi ${n}. Si vous avez un instant, un avis sincère sur votre expérience nous serait précieux : ${u}`,
  ar: (n, u) => `مرحبًا! شكرًا لاختيارك ${n}. إذا سمح وقتك، يسعدنا أن تشاركنا تقييمًا صادقًا لتجربتك: ${u}`,
};

"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en";
import as from "./locales/as";
import bn from "./locales/bn";
import brx from "./locales/brx";
import doi from "./locales/doi";
import gu from "./locales/gu";
import hi from "./locales/hi";
import kn from "./locales/kn";
import ks from "./locales/ks";
import kok from "./locales/kok";
import mai from "./locales/mai";
import ml from "./locales/ml";
import mni from "./locales/mni";
import mr from "./locales/mr";
import ne from "./locales/ne";
import orLocale from "./locales/or";
import pa from "./locales/pa";
import sa from "./locales/sa";
import sat from "./locales/sat";
import sd from "./locales/sd";
import ta from "./locales/ta";
import te from "./locales/te";
import ur from "./locales/ur";

const resources = {
  en: {
    translation: en,
  },
  as: {
    translation: as,
  },
  bn: {
    translation: bn,
  },
  brx: {
    translation: brx,
  },
  doi: {
    translation: doi,
  },
  gu: {
    translation: gu,
  },
  hi: {
    translation: hi,
  },
  kn: {
    translation: kn,
  },
  ks: {
    translation: ks,
  },
  kok: {
    translation: kok,
  },
  mai: {
    translation: mai,
  },
  ml: {
    translation: ml,
  },
  mni: {
    translation: mni,
  },
  mr: {
    translation: mr,
  },
  ne: {
    translation: ne,
  },
  or: {
    translation: orLocale,
  },
  pa: {
    translation: pa,
  },
  sa: {
    translation: sa,
  },
  sat: {
    translation: sat,
  },
  sd: {
    translation: sd,
  },
  ta: {
    translation: ta,
  },
  te: {
    translation: te,
  },
  ur: {
    translation: ur,
  },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,

      supportedLngs:
        Object.keys(resources),

      lng: "en",

      fallbackLng: "en",

      interpolation: {
        escapeValue: false,
      },

      returnEmptyString: false,

      react: {
        useSuspense: false,
      },
    });
}

export default i18n;
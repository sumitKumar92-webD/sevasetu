"use client";

import { useCallback, useEffect, useState } from "react";

const DEFAULT = { lat: 28.6139, lng: 77.209 }; // New Delhi fallback

/** Ask the browser for the user's coordinates (falls back to New Delhi). */
export default function useGeo(auto = true) {
  const [coords, setCoords] = useState(DEFAULT);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setReady(true);
      return Promise.resolve(DEFAULT);
    }
    setLocating(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(next);
          setReady(true);
          setLocating(false);
          resolve(next);
        },
        () => {
          setReady(true);
          setLocating(false);
          resolve(DEFAULT);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    });
  }, []);

  useEffect(() => {
    if (!auto) return;
    // Deferred so we never call setState synchronously inside the effect body.
    const timer = setTimeout(() => {
      locate();
    }, 0);
    return () => clearTimeout(timer);
  }, [auto, locate]);

  return { coords, setCoords, locate, ready, locating };
}

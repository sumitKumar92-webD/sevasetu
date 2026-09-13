// Distance helpers + the "smart worker assignment" scoring engine.

export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // earth radius km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export function avgRating(worker) {
  if (!worker.ratingCount) return 4.2; // friendly default for new workers
  return Math.round((worker.ratingSum / worker.ratingCount) * 10) / 10;
}

/**
 * Smart score: closer + better rated + online workers win.
 * Score is 0-100, higher is better.
 */
export function smartScore(worker, distance) {
  const distanceScore = Math.max(0, 50 - distance * 4); // 0-50
  const ratingScore = (avgRating(worker) / 5) * 35; // 0-35
  const availabilityScore = worker.isOnline ? 10 : 0; // 0-10
  const experienceScore = Math.min(worker.experienceYears || 0, 5); // 0-5
  return Math.round(distanceScore + ratingScore + availabilityScore + experienceScore);
}

/** Decorate + sort a list of workers for a given user location. */
export function rankWorkers(list, lat, lng, sortBy = "smart") {
  const decorated = list.map((w) => {
    const distance = distanceKm(lat, lng, w.lat, w.lng);
    return {
      ...w,
      distance,
      rating: avgRating(w),
      score: smartScore(w, distance),
    };
  });

  const sorters = {
    distance: (a, b) => a.distance - b.distance,
    rating: (a, b) => b.rating - a.rating,
    availability: (a, b) => Number(b.isOnline) - Number(a.isOnline) || a.distance - b.distance,
    price: (a, b) => a.pricePerHour - b.pricePerHour,
    smart: (a, b) => b.score - a.score,
  };

  return decorated.sort(sorters[sortBy] || sorters.smart);
}

/** Move a point a small step towards a target (used for live tracking demo). */
export function stepTowards(lat, lng, targetLat, targetLng, fraction = 0.18) {
  return {
    lat: lat + (targetLat - lat) * fraction,
    lng: lng + (targetLng - lng) * fraction,
  };
}

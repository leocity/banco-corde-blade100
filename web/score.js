// Stessa regola di pipeline/derive.py: profile_score e conversione kg -> lbs.
export const DEFAULT_WEIGHTS = { spin: 35, control: 25, durability: 20, power: 20 };
export const DISLIKED_THRESHOLD = 75;
export const DISLIKED_PENALTY = 15;

export function profileScore(sub, weights, dislikedSim) {
  let num = 0, den = 0;
  for (const k of Object.keys(weights)) {
    if (sub[k] === null || sub[k] === undefined) continue;
    num += weights[k] * sub[k];
    den += weights[k];
  }
  if (!den) return null;
  let score = Math.floor(num / den + 0.5);
  if (dislikedSim !== null && dislikedSim !== undefined && dislikedSim > DISLIKED_THRESHOLD) score -= DISLIKED_PENALTY;
  return Math.max(0, Math.min(100, score));
}

export function kgToLbs(kg) {
  return Math.round(kg * 2.2046 * 2) / 2;
}

export function dislikedFlag(bestLiked, worstDisliked) {
  if (worstDisliked === null || worstDisliked === undefined || worstDisliked <= DISLIKED_THRESHOLD) return false;
  return bestLiked === null || bestLiked === undefined || worstDisliked > bestLiked;
}

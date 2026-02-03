/**
 * Clamps value to a given range
 *
 * @returns a value or (min, max) if out of range
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/**
 * Maps a raw sensor value to a normalized sub-score (0–100),
 * where LOWER sensor values represent BETTER air quality.
 *
 * The mapping is linear between two thresholds:
 * - `good` → score = 100
 * - `bad`  → score = 0
 *
 * @param {number} x
 *   Raw sensor value.
 * @param {number} good
 *   Values ≤ `good` yield a score of 100.
 * @param {number} bad
 *   Values ≥ `bad` yield a score of 0.
 * @returns {number}
 *   Normalized sub-score in the range 0–100 (higher is better),
 */
export const scoreLowerIsBetter = (
  x: number,
  good: number,
  bad: number,
): number => {
  if (!Number.isFinite(x)) return 0;
  const t = (x - good) / (bad - good);
  return clamp(100 * (1 - clamp(t, 0, 1)), 0, 100);
};

/**
 *  Maps a raw sensor value to a normalized sub-score (0–100)
 *  where value between optMin and optMap represents BEST air quality
 *  score is changing linearly if value is out of optimal range
 *
 *  * The mapping is linear between two thresholds:
 * - `maxBad` → score = 100
 * - `minBad` → score = 0
 *
 * @param {number} x
 *   Raw sensor value.
 * @param {number} minBad
 *   Values ≥ `minBad` yield a score of 0.
 * @param {number} optMin
 *   Values ≥ `optMin` && ≤ `optMax` yield a score of 100.
 * @param {number} optMax
 *   Values ≤ `optMax` && ≥ `optMin` yield a score of 100.
 * @param {number} maxBad
 *   Values ≥ `maxBad` yield a score of 0.
 * @returns {number}
 *   Normalized sub-score in the range 0–100 (higher is better),
 */
export const scoreBand = (
  x: number,
  minBad: number,
  optMin: number,
  optMax: number,
  maxBad: number,
): number => {
  if (!Number.isFinite(x)) return 0;

  // return 100 if value is in optimal range
  if (x >= optMin && x < optMax) return 100;

  // Score is decreasing linearly if value is less than optimal
  if (x < optMin) {
    // 0 на minBad, 100 на optMin
    const t = (x - minBad) / (optMin - minBad);
    return clamp(100 * clamp(t, 0, 1), 0, 100);
  }

  // Score is increasing linearly if value is more than optimal
  const t = (x - optMax) / (maxBad - optMax);
  return clamp(100 * (1 - clamp(t, 0, 1)), 0, 100);
};

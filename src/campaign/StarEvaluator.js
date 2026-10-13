/**
 * StarEvaluator.js
 * Pure, deterministic evaluation engine for Tron Disc Arena (SPEC-CAMP-001).
 * Calculates 1 to 3 Stars from active trial performance telemetry against level thresholds:
 * - Star 1 (De-Rez): All hostile sub-routines eliminated.
 * - Star 2 (Integrity): Clear trial with >= 75% Program Integrity (HP).
 * - Star 3 (Mastery): Clear within target time limit OR achieve >= N confirmed Curve/Ricochet hits.
 */

export const DEFAULT_STAR_THRESHOLDS = Object.freeze({
  minIntegrityRatio: 0.75,
  targetTimeSeconds: 60,
  minPrecisionHits: 3
});

export class StarEvaluator {
  /**
   * Evaluates trial telemetry against level star criteria.
   * Pure deterministic function: produces identical output for identical inputs with zero side effects.
   *
   * @param {object} levelConfig Level configuration or star thresholds
   * @param {object} [levelConfig.starThresholds]
   * @param {number} [levelConfig.starThresholds.minIntegrityRatio=0.75]
   * @param {number} [levelConfig.starThresholds.targetTimeSeconds=60]
   * @param {number} [levelConfig.starThresholds.minPrecisionHits=3]
   * @param {object} telemetry Observed combat trial telemetry
   * @param {boolean} [telemetry.cleared=false] True if all wave enemies were de-rezzed
   * @param {number} [telemetry.finalHp] Remaining player health at trial completion
   * @param {number} [telemetry.maxHp=100] Maximum player health
   * @param {number} [telemetry.finalIntegrity] Direct integrity ratio [0.0 - 1.0] if pre-computed
   * @param {number} [telemetry.elapsedSeconds=0] Total elapsed time of the trial
   * @param {number} [telemetry.curveHits=0] Confirmed hits using curved disc throws
   * @param {number} [telemetry.ricochetHits=0] Confirmed hits after wall/floor/pillar bounces
   * @param {number} [telemetry.precisionHits] Combined curve + ricochet hits if pre-aggregated
   * @returns {object} Detailed evaluation outcome with star count and boolean breakdown
   */
  static evaluate(levelConfig = {}, telemetry = {}) {
    const thresholds = levelConfig?.starThresholds || levelConfig || DEFAULT_STAR_THRESHOLDS;
    const minIntegrityRatio = typeof thresholds.minIntegrityRatio === 'number' && Number.isFinite(thresholds.minIntegrityRatio)
      ? thresholds.minIntegrityRatio
      : DEFAULT_STAR_THRESHOLDS.minIntegrityRatio;
    const targetTimeSeconds = typeof thresholds.targetTimeSeconds === 'number' && Number.isFinite(thresholds.targetTimeSeconds)
      ? thresholds.targetTimeSeconds
      : DEFAULT_STAR_THRESHOLDS.targetTimeSeconds;
    const minPrecisionHits = typeof thresholds.minPrecisionHits === 'number' && Number.isFinite(thresholds.minPrecisionHits)
      ? thresholds.minPrecisionHits
      : DEFAULT_STAR_THRESHOLDS.minPrecisionHits;

    const cleared = Boolean(telemetry?.cleared);

    // Compute integrity ratio defensively
    let integrityRatio = 0;
    if (typeof telemetry?.finalIntegrity === 'number' && Number.isFinite(telemetry.finalIntegrity)) {
      integrityRatio = Math.max(0, Math.min(1, telemetry.finalIntegrity));
    } else if (typeof telemetry?.finalHp === 'number' && Number.isFinite(telemetry.finalHp)) {
      const maxHp = typeof telemetry?.maxHp === 'number' && Number.isFinite(telemetry.maxHp) && telemetry.maxHp > 0
        ? telemetry.maxHp
        : 100;
      integrityRatio = Math.max(0, Math.min(1, telemetry.finalHp / maxHp));
    }

    const elapsedSeconds = typeof telemetry?.elapsedSeconds === 'number' && Number.isFinite(telemetry.elapsedSeconds)
      ? Math.max(0, telemetry.elapsedSeconds)
      : 0;

    const curveHits = typeof telemetry?.curveHits === 'number' && Number.isFinite(telemetry.curveHits)
      ? Math.max(0, Math.floor(telemetry.curveHits))
      : 0;
    const ricochetHits = typeof telemetry?.ricochetHits === 'number' && Number.isFinite(telemetry.ricochetHits)
      ? Math.max(0, Math.floor(telemetry.ricochetHits))
      : 0;
    const combinedPrecisionHits = typeof telemetry?.precisionHits === 'number' && Number.isFinite(telemetry.precisionHits)
      ? Math.max(0, Math.floor(telemetry.precisionHits))
      : (curveHits + ricochetHits);

    // Condition evaluations
    // If not cleared (e.g. player died or void drop), zero stars are earned
    if (!cleared) {
      return {
        stars: 0,
        star1: false,
        star2: false,
        star3: false,
        breakdown: {
          deRez: false,
          integrity: false,
          mastery: false,
          masteryViaTime: false,
          masteryViaPrecision: false
        },
        metrics: {
          cleared: false,
          integrityRatio,
          integrityPercent: Math.round(integrityRatio * 100),
          elapsedSeconds,
          precisionHits: combinedPrecisionHits,
          curveHits,
          ricochetHits
        },
        thresholds: {
          minIntegrityRatio,
          targetTimeSeconds,
          minPrecisionHits
        }
      };
    }

    // Star 1: De-Rez (eliminated all enemies)
    const star1 = true;

    // Star 2: Program Integrity >= threshold (default 75% with floating point epsilon guard)
    const star2 = integrityRatio >= (minIntegrityRatio - 1e-4);

    // Star 3: Mastery (cleared within target time limit OR achieved >= required precision hits)
    const masteryViaTime = elapsedSeconds <= targetTimeSeconds;
    const masteryViaPrecision = combinedPrecisionHits >= minPrecisionHits;
    const star3 = masteryViaTime || masteryViaPrecision;

    let starCount = 1;
    if (star2) starCount += 1;
    if (star3) starCount += 1;

    return {
      stars: starCount,
      star1,
      star2,
      star3,
      breakdown: {
        deRez: star1,
        integrity: star2,
        mastery: star3,
        masteryViaTime,
        masteryViaPrecision
      },
      metrics: {
        cleared: true,
        integrityRatio,
        integrityPercent: Math.round(integrityRatio * 100),
        elapsedSeconds,
        precisionHits: combinedPrecisionHits,
        curveHits,
        ricochetHits
      },
      thresholds: {
        minIntegrityRatio,
        targetTimeSeconds,
        minPrecisionHits
      }
    };
  }

  /**
   * Instance wrapper delegating to static evaluator.
   */
  evaluate(levelConfig, telemetry) {
    return StarEvaluator.evaluate(levelConfig, telemetry);
  }
}

export const starEvaluator = new StarEvaluator();

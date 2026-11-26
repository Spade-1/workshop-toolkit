// Pure thread calculations – no UI code. Mirrors tools/build_threads.py.
// All inputs/outputs in mm unless named otherwise.
(function (root) {
  const IN = 25.4;
  // Full-form engagement depth factors
  const K60 = 1.299038; // ISO metric / Unified (60 deg)
  const K55 = 1.280654; // Whitworth / BSP (55 deg)

  /** % thread engagement for a given drill. */
  function engagement(majorMm, pitchMm, drillMm, form) {
    const k = form === 55 ? K55 : K60;
    return ((majorMm - drillMm) / (k * pitchMm)) * 100;
  }

  /** Ideal drill for a target % engagement (thread-cutting tap). */
  function drillForEngagement(majorMm, pitchMm, pct, form) {
    const k = form === 55 ? K55 : K60;
    return majorMm - (pct / 100) * k * pitchMm;
  }

  /** Thread-forming (fluteless) tap drill, ~70% thread. */
  function formingDrill(majorMm, pitchMm) {
    return majorMm - (0.70 * pitchMm) / 1.4706;
  }

  const tpiToPitch = (tpi) => IN / tpi;
  const pitchToTpi = (p) => IN / p;

  root.ThreadCalc = { IN, engagement, drillForEngagement, formingDrill, tpiToPitch, pitchToTpi };
})(typeof window !== 'undefined' ? window : globalThis);

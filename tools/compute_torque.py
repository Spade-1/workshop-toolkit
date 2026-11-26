#!/usr/bin/env python3
"""Reproducible computed torque table for the workshop app.

Method (short-form torque equation, as used by Fastenal and most distributor tables):
    As      = (pi/4) * (d - 0.9382*P)^2                  [mm^2]  (ISO 898-1 tensile stress area)
    proof_N = As * Sp                                     [N]     steel, Sp = stress under proof load (ISO 898-1)
            = As * Rp0.2                                  [N]     stainless (ISO 3506-1 has no Sp; 0.2% proof used)
    F       = 0.75 * proof_N                              [N]     target preload
    T       = K * F * d / 1000                            [N.m]   d = nominal diameter in mm
    K       = 0.20 dry/plain, 0.18 zinc plated + light oil, 0.15 lubricated / anti-seize

For As we use the ISO 898-1 tabulated As,nom (3 significant figures) so proof loads line up
with the standard; the unrounded formula value is shown in stress_areas.csv for verification.

Outputs (same folder): stress_areas.csv, torque_computed.csv, torque_comparison.csv
Run: python3 -I compute_torque.py
"""
import csv
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))

ISO_SRC = "ISO 898-1 As,nom via Optimas table https://optimas.com/technical-resources/iso-metric-thread-proof-loads/"

# (size label, d mm, pitch mm, ISO tabulated As,nom mm^2)
COARSE = [
    ("M3", 3, 0.5, 5.03), ("M4", 4, 0.7, 8.78), ("M5", 5, 0.8, 14.2), ("M6", 6, 1.0, 20.1),
    ("M7", 7, 1.0, 28.9), ("M8", 8, 1.25, 36.6), ("M10", 10, 1.5, 58.0), ("M12", 12, 1.75, 84.3),
    ("M14", 14, 2.0, 115), ("M16", 16, 2.0, 157), ("M18", 18, 2.5, 192), ("M20", 20, 2.5, 245),
    ("M22", 22, 2.5, 303), ("M24", 24, 3.0, 353), ("M27", 27, 3.0, 459), ("M30", 30, 3.5, 561),
    ("M33", 33, 3.5, 694), ("M36", 36, 4.0, 817),
]
FINE = [
    ("M8x1", 8, 1.0, 39.2), ("M10x1.25", 10, 1.25, 61.2), ("M10x1", 10, 1.0, 64.5),
    ("M12x1.5", 12, 1.5, 88.1), ("M12x1.25", 12, 1.25, 92.1), ("M14x1.5", 14, 1.5, 125),
    ("M16x1.5", 16, 1.5, 167), ("M18x1.5", 18, 1.5, 216), ("M20x1.5", 20, 1.5, 272),
    ("M22x1.5", 22, 1.5, 333), ("M24x2", 24, 2.0, 384),
]

# ISO 898-1 stress under proof load Sp (MPa) - Bossard F.004 reproduction of ISO 898-1
def sp_steel(cls, d):
    if cls == "8.8":
        return 580 if d <= 16 else 600
    return {"4.6": 225, "5.8": 380, "10.9": 830, "12.9": 970}[cls]

# ISO 3506-1 Rp0.2 min (MPa) - Bossard F.021
RP02_SS = {"A2-70/A4-70": 450, "A2-80/A4-80": 600}

K = {"dry": 0.20, "zinc": 0.18, "lube": 0.15}


def as_formula(d, p):
    return math.pi / 4 * (d - 0.9382 * p) ** 2


def r(x, sig=3):
    """Round to 3 significant figures (no false precision)."""
    if x == 0:
        return 0
    v = round(x, -int(math.floor(math.log10(abs(x)))) + (sig - 1))
    return int(v) if v >= 100 else v


def main():
    # stress areas
    with open(os.path.join(HERE, "stress_areas.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["size", "pitch", "As_mm2", "As_formula_mm2", "diff_pct", "source_or_formula"])
        for size, d, p, a_iso in COARSE + FINE:
            af = as_formula(d, p)
            w.writerow([size, p, a_iso, round(af, 2), round((a_iso - af) / af * 100, 2),
                        f"{ISO_SRC}; check As=(pi/4)(d-0.9382P)^2"])

    computed = {}
    with open(os.path.join(HERE, "torque_computed.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["class", "size", "pitch", "As", "stress_used_MPa", "stress_basis", "proof_N",
                    "preload_N", "T_dry_K0.20", "T_zinc_K0.18", "T_lube_K0.15"])
        steel_sizes = [c for c in COARSE if c[1] <= 24] + FINE
        ss_sizes = [c for c in COARSE if c[1] <= 24]
        jobs = [(c, s, "steel") for c in ("8.8", "10.9", "12.9") for s in steel_sizes]
        jobs += [(c, s, "ss") for c in RP02_SS for s in ss_sizes]
        for cls, (size, d, p, a), kind in jobs:
            if kind == "steel":
                stress, basis = sp_steel(cls, d), "Sp ISO 898-1"
            else:
                stress, basis = RP02_SS[cls], "Rp0.2 min ISO 3506-1"
            proof = a * stress
            F = 0.75 * proof
            t = {k: K[k] * F * d / 1000 for k in K}
            computed[(cls, size)] = t
            w.writerow([cls, size, p, a, stress, basis, round(proof), round(F),
                        r(t["dry"]), r(t["zinc"]), r(t["lube"])])

    # comparison against published
    pub_path = os.path.join(HERE, "torque_published.csv")
    if not os.path.exists(pub_path):
        print("torque_published.csv missing - run build_published.py first")
        return
    cmap = {"8.8": "8.8", "10.9": "10.9", "12.9": "12.9", "A2-70/A4-70": "A2-70/A4-70",
            "A2/A4-70": "A2-70/A4-70", "A2-70": "A2-70/A4-70", "A2/A4-80": "A2-80/A4-80",
            "A4-80": "A2-80/A4-80"}
    with open(pub_path) as f, open(os.path.join(HERE, "torque_comparison.csv"), "w", newline="") as g:
        w = csv.writer(g)
        w.writerow(["source", "basis", "class", "size", "published_nm", "computed_K0.20", "computed_K0.18",
                    "computed_K0.15", "pub_over_K0.20", "pub_over_K0.15"])
        for row in csv.DictReader(f):
            key = (cmap[row["class"]], row["size"])
            if key not in computed:
                continue
            t = computed[key]
            pv = float(row["torque_nm"])
            w.writerow([row["source"], row["basis"], row["class"], row["size"], pv, r(t["dry"]), r(t["zinc"]),
                        r(t["lube"]), round(pv / t["dry"], 2), round(pv / t["lube"], 2)])
    print("wrote stress_areas.csv, torque_computed.csv, torque_comparison.csv")


if __name__ == "__main__":
    main()

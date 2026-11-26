#!/usr/bin/env python3
"""Generate thread / tap drill reference data for Workshop Toolkit.

All geometry is computed from the published thread standards; nothing is
copied from a reference book. Tap drill choices follow the stated rules
below and every drill carries its computed % thread engagement so the
user can judge it.

Standards / formulas
- ISO metric (ISO 68-1, ISO 261, ISO 724): H = 0.866025P,
  basic minor dia (internal) D1 = D - 1.082532P, pitch dia D2 = D - 0.649519P.
- Unified (ASME B1.1): same 60 deg form, P = 1/TPI.
- Whitworth BSW/BSF (BS 84) and BSP (ISO 228 / ISO 7): 55 deg form,
  thread depth h = 0.640327P, minor = D - 1.280654P.
- % engagement (60 deg forms) = (D - drill) / (1.299038 * P) * 100
  (equivalent to the 76.98/P and 0.0130xTPI shop formulas).
- % engagement (55 deg forms)  = (D - drill) / (1.280654 * P) * 100
"""
import json, math, os

OUT = os.path.join(os.path.dirname(__file__), "..", "data", "threads")
os.makedirs(OUT, exist_ok=True)
IN = 25.4

# ---------------------------------------------------------------- drills
NUMBER = {1:.2280,2:.2210,3:.2130,4:.2090,5:.2055,6:.2040,7:.2010,8:.1990,9:.1960,10:.1935,
 11:.1910,12:.1890,13:.1850,14:.1820,15:.1800,16:.1770,17:.1730,18:.1695,19:.1660,20:.1610,
 21:.1590,22:.1570,23:.1540,24:.1520,25:.1495,26:.1470,27:.1440,28:.1405,29:.1360,30:.1285,
 31:.1200,32:.1160,33:.1130,34:.1110,35:.1100,36:.1065,37:.1040,38:.1015,39:.0995,40:.0980,
 41:.0960,42:.0935,43:.0890,44:.0860,45:.0820,46:.0810,47:.0785,48:.0760,49:.0730,50:.0700,
 51:.0670,52:.0635,53:.0595,54:.0550,55:.0520,56:.0465,57:.0430,58:.0420,59:.0410,60:.0400,
 61:.0390,62:.0380,63:.0370,64:.0360,65:.0350,66:.0330,67:.0320,68:.0310,69:.0292,70:.0280,
 71:.0260,72:.0250,73:.0240,74:.0225,75:.0210,76:.0200,77:.0180,78:.0160,79:.0145,80:.0135}
LETTER = dict(zip("ABCDEFGHIJKLMNOPQRSTUVWXYZ",
 [.234,.238,.242,.246,.250,.257,.261,.266,.272,.277,.281,.290,.295,.302,.316,.323,.332,.339,
  .348,.358,.368,.377,.386,.397,.404,.413]))

def frac_name(n64):
    whole, rem = divmod(n64, 64)
    if rem == 0:
        return f'{whole}"'
    num, den = rem, 64
    while num % 2 == 0:
        num //= 2; den //= 2
    return (f'{whole}-{num}/{den}"' if whole else f'{num}/{den}"')

def imperial_drills():
    d = [{"name": f"#{k}", "in": v, "mm": round(v*IN, 3), "series": "number"} for k, v in NUMBER.items()]
    d += [{"name": k, "in": v, "mm": round(v*IN, 3), "series": "letter"} for k, v in LETTER.items()]
    d += [{"name": frac_name(n), "in": n/64, "mm": round(n/64*IN, 3), "series": "fraction"} for n in range(1, 129)]
    return sorted(d, key=lambda x: x["in"])

def metric_drills():
    """Commonly stocked metric jobber sizes: 0.05 steps to 3 mm, 0.1 to 13 mm, 0.25 to 40 mm, 0.5 above."""
    s = set()
    v = 0.30
    while v <= 3.0001: s.add(round(v, 2)); v += 0.05
    v = 3.1
    while v <= 13.0001: s.add(round(v, 2)); v += 0.1
    v = 13.25
    while v <= 40.0001: s.add(round(v, 2)); v += 0.25
    v = 40.5
    while v <= 100.0001: s.add(round(v, 2)); v += 0.5
    return sorted(s)

IMP = imperial_drills()
MET = metric_drills()

def eng60(D, P, drill):  # all mm
    return round((D - drill) / (1.299038 * P) * 100, 1)

def eng55(D, P, drill):
    return round((D - drill) / (1.280654 * P) * 100, 1)

def best(D, P, eng, target=75.0, lo=60.0, hi=85.0, metric_only=False):
    """Nearest-to-target drill within lo..hi % from metric and imperial sets, plus one size either side."""
    ideal = D - target/100 * (1.299038 if eng is eng60 else 1.280654) * P
    def pick(cands, key):
        ok = [c for c in cands if lo <= eng(D, P, key(c)) <= hi]
        pool = ok or cands
        c = min(pool, key=lambda c: (abs(key(c) - ideal), key(c)))
        i = cands.index(c)
        alts = [cands[j] for j in (i - 1, i + 1) if 0 <= j < len(cands)]
        return c, alts
    m, malts = pick(MET, lambda x: x)
    res = {"ideal_mm": round(ideal, 3),
           "metric": {"mm": m, "engagement_pct": eng(D, P, m)},
           "metric_alts": [{"mm": a, "engagement_pct": eng(D, P, a)} for a in malts]}
    if not metric_only:
        i, ialts = pick(IMP, lambda x: x["mm"])
        f = lambda x: {"name": x["name"], "in": round(x["in"], 4), "mm": x["mm"], "engagement_pct": eng(D, P, x["mm"])}
        res["imperial"] = f(i)
        res["imperial_alts"] = [f(a) for a in ialts]
    return res

# ---------------------------------------------------------------- ISO metric
# ISO 273 clearance holes (fine / medium / coarse), mm
ISO273 = {1:(1.1,1.2,1.3),1.2:(1.3,1.4,1.5),1.4:(1.5,1.6,1.8),1.6:(1.7,1.8,2.0),1.8:(2.0,2.1,2.2),
 2:(2.2,2.4,2.6),2.5:(2.7,2.9,3.1),3:(3.2,3.4,3.6),3.5:(3.7,3.9,4.2),4:(4.3,4.5,4.8),4.5:(4.8,5.0,5.3),
 5:(5.3,5.5,5.8),6:(6.4,6.6,7.0),7:(7.4,7.6,8.0),8:(8.4,9.0,10.0),10:(10.5,11.0,12.0),12:(13.0,13.5,14.5),
 14:(15.0,15.5,16.5),16:(17.0,17.5,18.5),18:(19.0,20.0,21.0),20:(21.0,22.0,24.0),22:(23.0,24.0,26.0),
 24:(25.0,26.0,28.0),27:(28.0,30.0,32.0),30:(31.0,33.0,35.0),33:(34.0,36.0,38.0),36:(37.0,39.0,42.0),
 39:(40.0,42.0,45.0),42:(43.0,45.0,48.0),45:(46.0,48.0,52.0),48:(50.0,52.0,56.0),52:(54.0,56.0,62.0),
 56:(58.0,62.0,66.0)}

COARSE = [(1,.25),(1.1,.25),(1.2,.25),(1.4,.3),(1.6,.35),(1.8,.35),(2,.4),(2.2,.45),(2.5,.45),(3,.5),
 (3.5,.6),(4,.7),(4.5,.75),(5,.8),(6,1),(7,1),(8,1.25),(9,1.25),(10,1.5),(11,1.5),(12,1.75),(14,2),
 (16,2),(18,2.5),(20,2.5),(22,2.5),(24,3),(27,3),(30,3.5),(33,3.5),(36,4),(39,4),(42,4.5),(45,4.5),
 (48,5),(52,5),(56,5.5)]
FINE = [(2,.25),(2.5,.35),(3,.35),(3.5,.35),(4,.5),(5,.5),(6,.75),(7,.75),(8,.75),(8,1),(10,.75),(10,1),
 (10,1.25),(12,1),(12,1.25),(12,1.5),(14,1),(14,1.25),(14,1.5),(16,1),(16,1.5),(18,1),(18,1.5),(18,2),
 (20,1),(20,1.5),(20,2),(22,1),(22,1.5),(22,2),(24,1),(24,1.5),(24,2),(27,1.5),(27,2),(30,1.5),(30,2),
 (33,2),(36,1.5),(36,2),(36,3),(39,3),(42,3),(45,3),(48,3)]

# Recommended tap drills that differ from plain D - P (ISO 2306 / common practice)
METRIC_OVERRIDE = {}

def metric_tap_drill(D, P):
    if (D, P) in METRIC_OVERRIDE:
        return METRIC_OVERRIDE[(D, P)]
    d = round(D - P, 3)
    if D <= 3:
        return round(round(d / 0.05) * 0.05, 2)
    # 0.05 remainders: round half to even tenth (6.75->6.8, 5.25->5.2, 10.25->10.2), matching ISO 2306 practice
    from decimal import Decimal, ROUND_HALF_EVEN
    return float(Decimal(str(d)).quantize(Decimal("0.1"), rounding=ROUND_HALF_EVEN))

def metric_rows(table, series):
    rows = []
    for D, P in table:
        td = metric_tap_drill(D, P)
        cl = ISO273.get(D)
        rows.append({
            "id": f"M{D:g}x{P:g}", "series": series, "label": f"M{D:g} × {P:g}",
            "major_mm": D, "pitch_mm": P, "tpi": round(IN / P, 2),
            "pitch_dia_mm": round(D - 0.649519*P, 3),
            "minor_int_mm": round(D - 1.082532*P, 3),
            "minor_ext_mm": round(D - 1.226869*P, 3),
            "tap_drill_mm": td, "tap_drill_engagement_pct": eng60(D, P, td),
            "forming_drill_mm": round(math.ceil(round((D - 0.70*P/1.4706) / 0.05, 6)) * 0.05, 2),
            "clearance_mm": ({"close": cl[0], "normal": cl[1], "loose": cl[2]} if cl else None),
            "nearest_imperial_drill": best(D, P, eng60)["imperial"],
        })
    return rows

# ---------------------------------------------------------------- Unified
NUMSIZE = {"#0":.060,"#1":.073,"#2":.086,"#3":.099,"#4":.112,"#5":.125,"#6":.138,"#8":.164,"#10":.190,"#12":.216}
def size_in(s):
    if s in NUMSIZE: return NUMSIZE[s]
    s = s.replace('"', '')
    if "-" in s:
        w, f = s.split("-"); a, b = f.split("/"); return int(w) + int(a)/int(b)
    if "/" in s:
        a, b = s.split("/"); return int(a)/int(b)
    return float(s)

UNC = [("#1",64),("#2",56),("#3",48),("#4",40),("#5",40),("#6",32),("#8",32),("#10",24),("#12",24),
 ('1/4"',20),('5/16"',18),('3/8"',16),('7/16"',14),('1/2"',13),('9/16"',12),('5/8"',11),('3/4"',10),
 ('7/8"',9),('1"',8),('1-1/8"',7),('1-1/4"',7),('1-3/8"',6),('1-1/2"',6),('1-3/4"',5),('2"',4.5)]
UNF = [("#0",80),("#1",72),("#2",64),("#3",56),("#4",48),("#5",44),("#6",40),("#8",36),("#10",32),
 ("#12",28),('1/4"',28),('5/16"',24),('3/8"',24),('7/16"',20),('1/2"',20),('9/16"',18),('5/8"',18),
 ('3/4"',16),('7/8"',14),('1"',12),('1-1/8"',12),('1-1/4"',12),('1-3/8"',12),('1-1/2"',12)]

def unified_rows(table, series):
    rows = []
    for s, tpi in table:
        Din = size_in(s); D = Din*IN; P = IN/tpi
        b = best(D, P, eng60)
        rows.append({
            "id": f"{s.replace(chr(34),'')}-{tpi:g}{series}", "series": series,
            "label": f"{s}-{tpi:g} {series}", "major_in": round(Din, 4), "major_mm": round(D, 3),
            "tpi": tpi, "pitch_mm": round(P, 4),
            "pitch_dia_mm": round(D - 0.649519*P, 3), "minor_int_mm": round(D - 1.082532*P, 3),
            "tap_drill": b,
        })
    return rows

# ---------------------------------------------------------------- Whitworth
BSW = [("1/8",40),("3/16",24),("1/4",20),("5/16",18),("3/8",16),("7/16",14),("1/2",12),("9/16",12),
 ("5/8",11),("3/4",10),("7/8",9),("1",8),("1-1/8",7),("1-1/4",7),("1-1/2",6),("1-3/4",5),("2",4.5)]
BSF = [("3/16",32),("7/32",28),("1/4",26),("5/16",22),("3/8",20),("7/16",18),("1/2",16),("9/16",16),
 ("5/8",14),("3/4",12),("7/8",11),("1",10),("1-1/8",9),("1-1/4",9),("1-1/2",8)]

def whit_rows(table, series):
    rows = []
    for s, tpi in table:
        Din = size_in(s); D = Din*IN; P = IN/tpi
        rows.append({
            "id": f"{s}-{tpi:g}{series}", "series": series, "label": f'{s}" {series} ({tpi:g} TPI)',
            "major_in": round(Din, 4), "major_mm": round(D, 3), "tpi": tpi, "pitch_mm": round(P, 4),
            "minor_mm": round(D - 1.280654*P, 3), "tap_drill": best(D, P, eng55),
        })
    return rows

# ---------------------------------------------------------------- Pipe
# ISO 228-1 / ISO 7-1 major diameters (mm) and TPI
BSP = [("1/16",28,7.723),("1/8",28,9.728),("1/4",19,13.157),("3/8",19,16.662),("1/2",14,20.955),
 ("5/8",14,22.911),("3/4",14,26.441),("7/8",14,30.201),("1",11,33.249),("1-1/4",11,41.910),
 ("1-1/2",11,47.803),("2",11,59.614)]
# Commonly published tap drills (no single standard governs these – see notes)
BSP_DRILLS = {  # size: (G parallel, Rp parallel, Rc taper)
 "1/16":(6.8,6.6,6.4),"1/8":(8.8,8.6,8.4),"1/4":(11.8,11.5,11.2),"3/8":(15.25,15.0,14.75),
 "1/2":(19.0,18.5,18.25),"5/8":(21.0,20.5,None),"3/4":(24.5,24.0,23.75),"7/8":(28.25,27.75,None),
 "1":(30.75,30.25,30.0),"1-1/4":(39.5,39.0,38.5),"1-1/2":(45.5,45.0,44.5),"2":(57.0,56.5,56.0)}

# ASME B1.20.1 NPT: size, TPI, pipe OD (in); tap drill without reamer (ANSI common practice)
NPT = [("1/16",27,.3125,"C",.242),("1/8",27,.405,"R",.339),("1/4",18,.540,'7/16"',.4375),
 ("3/8",18,.675,'37/64"',.5781),("1/2",14,.840,'23/32"',.7188),("3/4",14,1.050,'59/64"',.9219),
 ("1",11.5,1.315,'1-5/32"',1.1563),("1-1/4",11.5,1.660,'1-1/2"',1.5),("1-1/2",11.5,1.900,'1-47/64"',1.7344),
 ("2",11.5,2.375,'2-7/32"',2.2188)]

def pipe():
    rows = []
    for s, tpi, D in BSP:
        g, rp, rc = BSP_DRILLS[s]
        rows.append({"id": f"BSP{s}", "series": "BSP", "label": f'{s}" BSP ({tpi} TPI)', "tpi": tpi,
            "major_mm": D, "minor_mm": round(D - 1.280654*IN/tpi, 3),
            "drill_G_mm": g, "drill_Rp_mm": rp, "drill_Rc_mm": rc})
    for s, tpi, od, dname, din in NPT:
        rows.append({"id": f"NPT{s}", "series": "NPT", "label": f'{s}" NPT ({tpi:g} TPI)', "tpi": tpi,
            "pipe_od_in": od, "pipe_od_mm": round(od*IN, 2),
            "drill": {"name": dname, "in": din, "mm": round(din*IN, 2)}})
    return rows

data = {
 "meta": {"generated_by": "tools/build_threads.py",
   "notes": ["Engagement % uses the full-form thread depth (60 deg: 1.299P, 55 deg: 1.281P).",
             "Metric tap drill = D - P; where that lands on a 0.05 it is rounded half-to-even to a stocked 0.1 mm drill (6.75 -> 6.8, 10.25 -> 10.2).",
             "Imperial/Whitworth: drill nearest 75% engagement, chosen within 60-85% where possible.",
             "Forming (fluteless) drill = D - 0.476P (70% thread), rounded up to 0.05 mm (undersize holes break forming taps).",
             "Clearance holes: ISO 273 close (H12) / normal (H13) / loose (H14).",
             "Pipe tap drills are common-practice values; NPT figures are without taper reamer."]},
 "metric_coarse": metric_rows(COARSE, "Metric coarse"),
 "metric_fine": metric_rows(FINE, "Metric fine"),
 "unc": unified_rows(UNC, "UNC"),
 "unf": unified_rows(UNF, "UNF"),
 "bsw": whit_rows(BSW, "BSW"),
 "bsf": whit_rows(BSF, "BSF"),
 "pipe": pipe(),
}
with open(os.path.join(OUT, "threads.json"), "w") as f:
    json.dump(data, f, indent=1)
with open(os.path.join(OUT, "drills.json"), "w") as f:
    json.dump({"imperial": IMP, "metric_mm": MET}, f, indent=1)
print({k: len(v) for k, v in data.items() if isinstance(v, list)})

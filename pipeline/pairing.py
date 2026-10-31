"""Pairing con le corde "mi piace": somiglianza con la preferita più vicina, sulle dimensioni di laboratorio.
Stesse regole e parametri in web/pairing.js (parità verificata da tests/fixtures/pairing_cases.json)."""
from pipeline.dims import DIM_KEYS

WEIGHTS = {"spin": 30, "durability": 20, "stiffness": 20, "elasticity": 15}  # il controllo non è una misura: tolto (2026-10-31)
UP_ONLY = ("spin", "durability")  # sopra il riferimento non si penalizza: più è meglio
TOL, FALLOFF = 5, 20
PENALTY, PENALTY_THRESHOLD = 15, 75
MIN_DIMS = 3
BANDS = ((80, "Ottimo"), (60, "Buono"), (40, "Attenzione"), (0, "Poco adatta"))


def band_for(score):
    return next(name for floor, name in BANDS if score >= floor)


def _fit(v, x, dim):
    d = v - x
    if d > 0 and dim in UP_ONLY:
        return 100.0
    a = abs(d)
    return 100.0 if a <= TOL else max(0.0, 100.0 * (1 - (a - TOL) / FALLOFF))


def fit_to(dims, ref, weights=WEIGHTS):
    """Media pesata dei fit sulle dimensioni in cui la corda e il riferimento hanno un valore."""
    num = den = 0.0
    for dim, w in weights.items():
        v, x = dims.get(dim), ref.get(dim)
        if v is None or x is None:
            continue
        num += w * _fit(v, x, dim)
        den += w
    return num / den if den else None


def _round(x):
    return int(max(0, min(100, int(x + 0.5))))


def _dir(v, x):
    return "above" if v - x > TOL else "below" if v - x < -TOL else "in"


def pairing(dims, liked, disliked, penalize=True):
    present = [k for k in DIM_KEYS if dims.get(k) is not None]
    out = {"score": None, "band": None, "n_dims": len(present), "missing": [k for k in DIM_KEYS if dims.get(k) is None],
           "no_spin": dims.get("spin") is None, "best_ref": None, "penalized": False,
           "fits": {k: {"fit": None, "dir": None} for k in DIM_KEYS}}
    if len(present) < MIN_DIMS:
        out["band"] = "Non valutabile"
        return out
    scored = [(fit_to(dims, r["dims"]), r) for r in liked]
    scored = [(s, r) for s, r in scored if s is not None]
    if not scored:
        out["band"] = "Senza riferimenti"
        return out
    best, ref = max(scored, key=lambda sr: sr[0])
    out["best_ref"] = ref["id"]
    for k in present:
        if ref["dims"].get(k) is not None:
            out["fits"][k] = {"fit": round(_fit(dims[k], ref["dims"][k], k), 1), "dir": _dir(dims[k], ref["dims"][k])}
    worst = max([s for s in (fit_to(dims, r["dims"]) for r in disliked) if s is not None], default=None)
    if penalize and worst is not None and worst >= PENALTY_THRESHOLD and worst > best:
        out["penalized"] = True
        best -= PENALTY
    out["score"] = _round(best)
    out["band"] = band_for(out["score"])
    return out

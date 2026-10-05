"""Metriche derivate: sotto-punteggi, somiglianze, tensione suggerita, metriche discriminanti (spec §6)."""
import math

DEFAULT_WEIGHTS = {"spin": 35, "control": 25, "durability": 20, "power": 20}
DISLIKED_PENALTY_THRESHOLD = 75
DISLIKED_PENALTY = 15
KG_TO_LBS = 2.2046
ANCHOR_TENSIONS = {"solinco-confidential-16l": [22, 21], "toroline-o-toro-17": [23, 22]}
DISLIKED_GROUPS = {"confidential_soft": ("Solinco", "Confidential Soft"), "rpm_blast": ("Babolat", "RPM Blast")}


def _get(d, *path):
    for p in path:
        if d is None:
            return None
        if isinstance(d, dict):
            d = d.get(p, d.get(str(p)))
        else:
            return None
    return d


METRICS = {
    "twu_stiffness": lambda r: _get(r, "twu", "stiffness_lbin"),
    "twu_tension_loss": lambda r: _get(r, "twu", "tension_loss_pct"),
    "twu_spin": lambda r: _get(r, "twu", "spin_potential"),
    "excel_stiff_index": lambda r: _get(r, "excel", "stiff_index_avg"),
    "excel_stretch50": lambda r: _get(r, "excel", "stretch_pct", 50),
    "excel_tl6": lambda r: _get(r, "excel", "tl6"),
    "excel_creep": lambda r: _get(r, "excel", "static_24h_creep"),
    "rpedia_static": lambda r: _get(r, "rpedia", "static_stiffness_kgmm"),
}
SIMILARITY_FEATURES = ("twu_stiffness", "twu_tension_loss", "twu_spin", "excel_stiff_index")


def population(records):
    return {k: [v for v in (f(r) for r in records) if v is not None] for k, f in METRICS.items()}


def percentile(value, pop):
    if value is None or not pop:
        return None
    less = sum(v < value for v in pop)
    eq = sum(v == value for v in pop)
    return round((less + 0.5 * eq) / len(pop) * 100, 1)


def _mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 1) if xs else None


def _inv(p):
    return None if p is None else 100 - p


def subscores(rec, pop):
    pct = lambda k: percentile(METRICS[k](rec), pop[k])
    comfort_src = "rpedia_static" if METRICS["rpedia_static"](rec) is not None else "twu_stiffness"
    return {
        "spin": pct("twu_spin"),
        "control": _mean([pct("twu_stiffness"), _inv(pct("excel_stretch50"))]),
        "power": _mean([_inv(pct("twu_stiffness")), pct("excel_stretch50")]),
        "durability": _mean([_inv(pct("twu_tension_loss")), _inv(pct("excel_tl6"))]),
        "comfort": _inv(pct(comfort_src)),
    }


def _stats(xs):
    m = sum(xs) / len(xs)
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs)) or 1.0
    return m, sd


def similarity(a, b, pop):
    diffs = []
    for k in SIMILARITY_FEATURES:
        va, vb = METRICS[k](a), METRICS[k](b)
        if va is None or vb is None or len(pop[k]) < 2:
            continue
        _, sd = _stats(pop[k])
        diffs.append(((va - vb) / sd) ** 2)
    if len(diffs) < 2:
        return None
    d = math.sqrt(sum(diffs) / len(diffs))
    sim = round(100 * math.exp(-d * d / 2))
    if a.get("shape") and a.get("shape") == b.get("shape"):
        sim += 5
    return min(sim, 100)


def profile_score(sub, weights=DEFAULT_WEIGHTS, disliked_sim=None):
    num = sum(weights[k] * sub[k] for k in weights if sub.get(k) is not None)
    den = sum(weights[k] for k in weights if sub.get(k) is not None)
    if not den:
        return None
    score = math.floor(num / den + 0.5)
    if disliked_sim is not None and disliked_sim > DISLIKED_PENALTY_THRESHOLD:
        score -= DISLIKED_PENALTY
    return int(max(0, min(100, score)))


def _half(x):
    return round(x * 2) / 2


def tension_start(rec, anchors):
    anchor = max(anchors, key=lambda a: -1 if a.get("sim") is None else a["sim"])
    st = _get(rec, "twu", "stiffness_lbin")
    if st is None or anchor.get("stiffness") is None:
        kg = list(anchor["kg"])
        note = f"tensione della preferita più simile ({anchor['id']}), senza dati TWU per correggerla"
    else:
        delta = max(-2.0, min(2.0, _half(-0.75 * (st - anchor["stiffness"]) / 15)))
        kg = [anchor["kg"][0] + delta, anchor["kg"][1] + delta]
        note = f"da {anchor['id']} corretta di {delta:+.1f} kg per la differenza di rigidità TWU"
    return {"kg": kg, "lbs": [_half(k * KG_TO_LBS) for k in kg], "from": anchor["id"],
            "indicative": True, "note": note}


def discriminant_metrics(records, pop):
    out = []
    for k, f in METRICS.items():
        liked = [f(r) for r in records if r.get("preference") == "liked" and f(r) is not None]
        disl = [f(r) for r in records if r.get("preference") == "disliked" and f(r) is not None]
        if not liked or not disl or len(pop[k]) < 2:
            continue
        _, sd = _stats(pop[k])
        ml, md = sum(liked) / len(liked), sum(disl) / len(disl)
        out.append({"metric": k, "liked_mean": round(ml, 2), "disliked_mean": round(md, 2),
                    "separation": round(abs(ml - md) / sd, 2), "liked_higher": ml > md})
    return sorted(out, key=lambda x: x["separation"], reverse=True)


def derive_all(records):
    pop = population(records)
    by_id = {r["id"]: r for r in records}
    liked = {k: by_id[k] for k in ANCHOR_TENSIONS if k in by_id}
    disliked = {g: [r for r in records if (r["brand"], r["model"]) == bm] for g, bm in DISLIKED_GROUPS.items()}
    for r in records:
        sim_l = {("confidential" if "confidential" in k else "otoro"): similarity(r, a, pop) for k, a in liked.items()}
        sim_d = {}
        for g, rs in disliked.items():
            vals = [s for s in (similarity(r, d, pop) for d in rs) if s is not None]
            sim_d[g] = max(vals) if vals else None
        worst = max([v for v in sim_d.values() if v is not None], default=None)
        anchors = [{"id": k, "kg": ANCHOR_TENSIONS[k], "stiffness": _get(a, "twu", "stiffness_lbin"),
                    "sim": similarity(r, a, pop)} for k, a in liked.items()]
        sub = subscores(r, pop)
        r["derived"] = {
            "subscores": sub,
            "similarity_liked": sim_l,
            "similarity_disliked": sim_d,
            "disliked_warning": worst is not None and worst > DISLIKED_PENALTY_THRESHOLD and r.get("preference") != "disliked",
            "profile_score": profile_score(sub, DEFAULT_WEIGHTS, worst if r.get("preference") != "disliked" else None),
            "tension_start": tension_start(r, anchors) if anchors else None,
        }
    return discriminant_metrics(records, pop)

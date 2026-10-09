"""Metriche derivate: sotto-punteggi, somiglianze, tensione suggerita, metriche discriminanti (spec §6)."""
import math

# Pesi del punteggio su assi indipendenti: spin e tenuta (misurati) e affinità con le preferite.
# La v2 usava anche controllo (25) e potenza (20), ma potenza = 100 − controllo: i due pesi si annullavano.
DEFAULT_WEIGHTS = {"spin": 35, "durability": 20, "affinity": 20}
DISLIKED_PENALTY_THRESHOLD = 75
DISLIKED_PENALTY = 15
KG_TO_LBS = 2.2046
ANCHOR_TENSIONS = {"solinco-confidential-16l": [22, 21], "toroline-o-toro-17": [23, 22]}
ANCHOR_NAMES = {"solinco-confidential-16l": "Confidential 1.25", "toroline-o-toro-17": "O-Toro 1.23"}
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
SIMILARITY_FEATURES = ("twu_stiffness", "twu_tension_loss", "twu_spin", "excel_stiff_index", "excel_tl6", "rpedia_static")


LAB_SPIN_KINDS = ("misurato", "parente")
LAB_STIFF_KINDS = ("misurata", "parente", "da Racketpedia")


def spin_lab(r):
    """Spin che conta come dato di laboratorio (misurato o parente). Senza campo 'spin' usa TWU (dati v1)."""
    if "spin" not in r:
        return _get(r, "twu", "spin_potential")
    s = r.get("spin")
    return s["value"] if s and s["kind"] in LAB_SPIN_KINDS else None


def stiff_lab(r):
    if "stiffness" not in r:
        return _get(r, "twu", "stiffness_lbin")
    s = r.get("stiffness")
    return s["value_lbin"] if s and s["kind"] in LAB_STIFF_KINDS else None


def population(records):
    pop = {k: [v for v in (f(r) for r in records) if v is not None] for k, f in METRICS.items()}
    # popolazioni di riferimento: solo valori misurati, così le stime non spostano i percentili
    pop["spin_measured"] = [v for v in (
        (r["spin"]["value"] if r.get("spin") and r["spin"]["kind"] == "misurato" else None) if "spin" in r
        else _get(r, "twu", "spin_potential") for r in records) if v is not None]
    pop["stiff_measured"] = [v for v in (
        (r["stiffness"]["value_lbin"] if r.get("stiffness") and r["stiffness"]["kind"] == "misurata" else None)
        if "stiffness" in r else _get(r, "twu", "stiffness_lbin") for r in records) if v is not None]
    return pop


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
    """Sotto-punteggi di laboratorio (percentili sulle popolazioni misurate)."""
    pct = lambda k: percentile(METRICS[k](rec), pop[k])
    st = percentile(stiff_lab(rec), pop["stiff_measured"])
    rp = METRICS["rpedia_static"](rec)
    return {
        "spin": percentile(spin_lab(rec), pop["spin_measured"]),
        "control": _mean([st, _inv(pct("excel_stretch50"))]),
        # stessa base per tutte: la perdita TWU (c'è per 70 corde); il TL6 del tuo test solo se manca TWU.
        # Mescolare le due metriche penalizzava chi ha un tuo TL6 "cattivo" rispetto a chi non ce l'ha.
        "durability": _inv(pct("twu_tension_loss")) if pct("twu_tension_loss") is not None else _inv(pct("excel_tl6")),
        "comfort": _inv(pct("rpedia_static") if rp is not None else st),
    }


# "control" e "comfort" non sono misurati: seguono la rigidità (e l'allungamento a 50 lb dove c'è l'Excel).
# "potenza" è stata tolta: era sempre 100 − controllo.
PROXY_CRITERIA = ("control", "comfort")
JUDGE_CRITERIA = ("stiffness", "spin", "control", "durability", "comfort")
LAB_WEIGHT, REVIEW_WEIGHT = 0.7, 0.3
WORDS = ("molto basso", "basso", "medio", "alto", "molto alto")
STIFF_WORDS = ("molto morbida", "morbida", "media", "rigida", "molto rigida")


def _review_score(agg, crit):
    if not agg:
        return None
    s = (agg.get("score") or {}).get(crit)
    if s is not None:
        return s
    lv = (agg.get("level") or {}).get(crit)
    return None if lv is None else (lv - 1) * 25


def judgments(rec, sub, agg, pop):
    """Giudizio semplice per criterio: 70% laboratorio + 30% recensioni, pesi rinormalizzati se una parte manca."""
    lab = {**sub, "stiffness": percentile(stiff_lab(rec), pop["stiff_measured"])}
    # stime da modello: si mostrano nelle barre (tratteggiate, lab_share 0) ma non entrano mai nel punteggio
    modelled = set()
    if lab["stiffness"] is None and (rec.get("stiffness") or {}).get("kind") == "modello":
        lab["stiffness"] = percentile(rec["stiffness"]["value_lbin"], pop["stiff_measured"]); modelled.add("stiffness")
    if lab["spin"] is None and (rec.get("spin") or {}).get("kind") == "modello":
        lab["spin"] = percentile(rec["spin"]["value"], pop["spin_measured"]); modelled.add("spin")
    out = {}
    for c in JUDGE_CRITERIA:
        l = lab.get(c)
        if agg and "pct" in agg:
            v = agg["pct"].get(c)
            rel = min(1.0, (agg.get("wsum") or {}).get(c, 1.0))
            if v is not None:
                v = 50 + (v - 50) * rel  # fonti deboli (es. solo produttore) avvicinano il voto alla media
            rw = REVIEW_WEIGHT * rel
        else:
            v, rw = _review_score(agg, c), REVIEW_WEIGHT
        parts = [(x, w) for x, w in ((l, LAB_WEIGHT), (v, rw)) if x is not None]
        if not parts:
            out[c] = {"score": None, "level": None, "word": None, "lab_share": None}
            continue
        den = sum(w for _, w in parts)
        score = round(sum(x * w for x, w in parts) / den, 1)
        level = min(5, int(score // 20) + 1)
        out[c] = {"score": score, "level": level, "word": (STIFF_WORDS if c == "stiffness" else WORDS)[level - 1],
                  "lab_share": 0.0 if c in modelled else round((LAB_WEIGHT if l is not None else 0) / den, 2)}
        if c in modelled:
            out[c]["modelled"] = True
    return out


def _stats(xs):
    m = sum(xs) / len(xs)
    sd = math.sqrt(sum((x - m) ** 2 for x in xs) / len(xs)) or 1.0
    return m, sd


def shared_features(a, b):
    return sum(METRICS[k](a) is not None and METRICS[k](b) is not None for k in SIMILARITY_FEATURES)


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


REQUIRED_FOR_SCORE = ("spin", "durability")


def profile_score(sub, weights=DEFAULT_WEIGHTS, disliked_sim=None):
    # senza spin e tenuta il punteggio sarebbe gonfiato dagli altri assi: meglio nessun punteggio
    if any(sub.get(k) is None for k in REQUIRED_FOR_SCORE):
        return None
    num = sum(weights[k] * sub[k] for k in weights if sub.get(k) is not None)
    den = sum(weights[k] for k in weights if sub.get(k) is not None)
    if not den:
        return None
    score = math.floor(num / den + 0.5)
    if disliked_sim is not None and disliked_sim > DISLIKED_PENALTY_THRESHOLD:
        score -= DISLIKED_PENALTY
    return int(max(0, min(100, score)))


def sources_disagree(rec, pop, gap=50):
    """Excel (Stiff Index, alto = morbida) e TWU (rigidità, alto = rigida) danno giudizi opposti sulla morbidezza."""
    si, st = METRICS["excel_stiff_index"](rec), METRICS["twu_stiffness"](rec)
    if si is None or st is None:
        return False
    return abs(percentile(si, pop["excel_stiff_index"]) - (100 - percentile(st, pop["twu_stiffness"]))) >= gap


def disliked_flag(best_liked, worst_disliked):
    """Avviso/penalità solo se la corda supera la soglia E somiglia più alla non gradita che alla preferita più vicina."""
    if worst_disliked is None or worst_disliked <= DISLIKED_PENALTY_THRESHOLD:
        return False
    return best_liked is None or worst_disliked > best_liked


def _half(x):
    return round(x * 2) / 2


DEFAULT_TENSION_SLOPE = -0.75 / 15  # kg per lb/in: regola v2 senza fonte, usata solo se le due preferite non bastano


def anchor_slope(anchors):
    """Pendenza kg per lb/in ricavata dalle TUE due preferite (tensione media / rigidità): è l'unico dato personale
    che lega tensione e rigidità. Due punti soltanto: indicativa. None se non ricavabile."""
    pts = [(a["stiffness"], sum(a["kg"]) / len(a["kg"])) for a in anchors if a.get("stiffness") is not None]
    if len(pts) < 2:
        return None
    (s1, t1), (s2, t2) = pts[0], pts[1]
    if abs(s1 - s2) < 20:
        return None
    slope = (t2 - t1) / (s2 - s1)
    return slope if slope < 0 else None


def tension_start(rec, anchors, slope=None):
    anchor = max(anchors, key=lambda a: -1 if a.get("sim") is None else a["sim"])
    st = stiff_lab(rec)
    k = DEFAULT_TENSION_SLOPE if slope is None else slope
    if st is None or anchor.get("stiffness") is None:
        kg = list(anchor["kg"])
        note = f"tensione della preferita più simile ({ANCHOR_NAMES.get(anchor['id'], anchor['id'])}), senza una rigidità misurata per correggerla"
    else:
        delta = max(-2.0, min(2.0, _half(k * (st - anchor["stiffness"]))))
        kg = [anchor["kg"][0] + delta, anchor["kg"][1] + delta]
        src = {"misurata": "TWU", "parente": "TWU di un calibro gemello", "da Racketpedia": "Racketpedia convertita, ±11 lb/in"}.get(
            ((rec.get("stiffness") or {}).get("kind")), "TWU")
        basis = "dalle tue due preferite" if slope is not None else "regola empirica non validata"
        note = (f"da {ANCHOR_NAMES.get(anchor['id'], anchor['id'])} corretta di {delta:+.1f} kg per la differenza di rigidità "
                f"({src}; pendenza {k * 15:+.2f} kg ogni 15 lb/in, {basis})").replace(".", ",")
    return {"kg": kg, "lbs": [_half(x * KG_TO_LBS) for x in kg], "from": anchor["id"],
            "indicative": True, "note": note, "slope_kg_per_15": round(k * 15, 2), "range_kg": 1.0}


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


def derive_all(records, reviews=None):
    reviews = reviews or {}
    pop = population(records)
    by_id = {r["id"]: r for r in records}
    liked = {k: by_id[k] for k in ANCHOR_TENSIONS if k in by_id}
    disliked = {g: [r for r in records if (r["brand"], r["model"]) == bm] for g, bm in DISLIKED_GROUPS.items()}
    slope = anchor_slope([{"stiffness": stiff_lab(a), "kg": ANCHOR_TENSIONS[k]} for k, a in liked.items()])
    for r in records:
        sim_l = {("confidential" if "confidential" in k else "otoro"): similarity(r, a, pop) for k, a in liked.items()}
        sim_d = {}
        for g, rs in disliked.items():
            vals = [s for s in (similarity(r, d, pop) for d in rs) if s is not None]
            sim_d[g] = max(vals) if vals else None
        worst = max([v for v in sim_d.values() if v is not None], default=None)
        best = max([v for v in sim_l.values() if v is not None], default=None)
        flag = r.get("preference") is None and disliked_flag(best, worst)
        anchors = [{"id": k, "kg": ANCHOR_TENSIONS[k], "stiffness": stiff_lab(a),
                    "sim": similarity(r, a, pop)} for k, a in liked.items()]
        lab = subscores(r, pop)
        j = judgments(r, lab, reviews.get(r["id"]), pop)
        # punteggio profilo sui giudizi misti (laboratorio + recensioni); stessi campi letti da score.js
        sub = {k: lab[k] for k in ("spin", "control", "durability", "comfort")}  # punteggio: solo laboratorio
        sub["affinity"] = best  # somiglianza massima con una preferita (0-100)
        # margine dello spin (gemello ±0,5) propagato nel punteggio: percentile ai due estremi
        sp = r.get("spin") or {}
        sub_range = None
        if sp.get("kind") == "parente" and sp.get("low") is not None and sp["low"] != sp["high"]:
            lo, hi = (percentile(sp["low"], pop["spin_measured"]), percentile(sp["high"], pop["spin_measured"]))
            pen = worst if flag else None
            sub_range = {"spin": [lo, hi],
                         "score": [profile_score({**sub, "spin": lo}, DEFAULT_WEIGHTS, pen), profile_score({**sub, "spin": hi}, DEFAULT_WEIGHTS, pen)]}
        r["derived"] = {
            "subscores_range": sub_range,
            "subscores": sub,
            "lab_subscores": lab,
            "judgments": j,
            "similarity_liked": sim_l,
            "similarity_disliked": sim_d,
            "similarity_basis": {("confidential" if "confidential" in k else "otoro"): shared_features(r, a) for k, a in liked.items()},
            "disliked_warning": flag,
            "sources_disagree": sources_disagree(r, pop),
            "profile_score": profile_score(sub, DEFAULT_WEIGHTS, worst if flag else None),
            "tension_start": tension_start(r, anchors, slope) if anchors else None,
        }
    return discriminant_metrics(records, pop)

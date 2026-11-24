"""Ruolo ibrido di una corda: adatta alle verticali (main: controllo e morso) o alle orizzontali (cross: tonda, elastica,
morbida, buon recupero). Calcolato solo da Racketpedia (rigidità a riposo, scheda esatta), forma e test Excel: serve soprattutto
alle corde senza TWU. Non usa mai TWU e non entra mai nel punteggio (REQUIRED_FOR_SCORE di derive.py resta com'è).

Punteggio da -1 (cross) a +1 (main): media pesata dei segnali presenti.
- rigidità a riposo (Racketpedia esatta, percentile): peso 0,40. È l'unica fonte che concorda con TWU (ρ ≈ 0,65).
- forma: peso 0,25. Tonda = cross, sagomata = main. È un'ipotesi del progetto: TWU non trova un legame prevedibile forma-attrito.
- elasticità dell'Excel (recupero/allungamento a 50 lb, percentile): peso 0,20; allungamento a 50 lb: peso 0,15.
  L'Excel non concorda con TWU né con Racketpedia (|ρ| < 0,25): per questo pesa poco e da solo dà confidenza bassa.
Servono almeno due gruppi di segnali (Racketpedia, forma, Excel) per dare un ruolo."""

SHAPE_MAIN = {"RND": -1.0, "HEX": -0.2, "OCT": 0.0, "PENT": 0.7, "SQ": 1.0, "TWST": 1.0}
SHARP_DEFAULT = 0.8  # forme rare (stella, ingranaggio, rough...): trattate come sagomate
W = {"rp": 0.40, "shape": 0.25, "elasticity": 0.20, "stretch": 0.15}
MAIN_AT, CROSS_AT = 0.25, -0.25
STRONG = 0.3  # un segnale conta come netto sopra questa soglia: due segnali netti opposti sono un conflitto

LABELS = {"rp": "rigidità a riposo", "shape": "forma", "elasticity": "elasticità", "stretch": "allungamento"}
MAIN_WORD = {"rp": "rigida", "shape": "sagomata", "elasticity": "poco elastica", "stretch": "poco allungabile"}
CROSS_WORD = {"rp": "morbida", "shape": "tonda", "elasticity": "molto elastica", "stretch": "molto allungabile"}


def _pct(v, pop):
    if v is None or not pop:
        return None
    below = sum(1 for x in pop if x < v)
    equal = sum(1 for x in pop if x == v)
    return 100.0 * (below + 0.5 * equal) / len(pop)


def _excel(rec):
    e = rec.get("excel") or {}
    st = (e.get("stretch_pct") or {}).get("50")
    rc = (e.get("recover_pct") or {}).get("50")
    el = rc / st if st and rc is not None else None
    return st, el


def _rp(rec):
    rp = rec.get("rpedia") or {}
    return rp.get("static_stiffness_kgmm") if rp.get("match") == "exact" else None


def role_populations(records):
    ex = [_excel(r) for r in records]
    return {"rp": [v for v in (_rp(r) for r in records) if v is not None],
            "stretch": [s for s, _ in ex if s is not None], "elasticity": [e for _, e in ex if e is not None]}


def hybrid_role(rec, pops):
    st, el = _excel(rec)
    rp = _rp(rec)
    sh = rec.get("shape")
    comps = {}
    if rp is not None and pops["rp"]:
        comps["rp"] = (rp, (_pct(rp, pops["rp"]) - 50) / 50)
    if sh:
        comps["shape"] = (sh, SHAPE_MAIN.get(sh, SHARP_DEFAULT))
    if el is not None and pops["elasticity"]:
        comps["elasticity"] = (round(el, 2), (50 - _pct(el, pops["elasticity"])) / 50)
    if st is not None and pops["stretch"]:
        comps["stretch"] = (st, (50 - _pct(st, pops["stretch"])) / 50)
    groups = {"rp" if k == "rp" else "shape" if k == "shape" else "excel" for k in comps}
    descr = {k: v for k, v in (("stiff_index_avg", (rec.get("excel") or {}).get("stiff_index_avg")), ("tl6", (rec.get("excel") or {}).get("tl6")),
                               ("tl12", (rec.get("excel") or {}).get("tl12")), ("creep_24h", (rec.get("excel") or {}).get("static_24h_creep"))) if v is not None}
    if len(groups) < 2:
        return {"role": "non valutabile", "score": None, "confidence": None, "basis": [], "conflicts": [], "descr": descr,
                "note": "servono almeno due tra Racketpedia esatta, forma e test Excel"}
    den = sum(W[k] for k in comps)
    score = round(sum(W[k] * z for k, (_, z) in comps.items()) / den, 2)
    role = "main" if score >= MAIN_AT else "cross" if score <= CROSS_AT else "flessibile"
    basis = [{"signal": LABELS[k], "value": v, "points": round(W[k] * z / den, 2), "reading": MAIN_WORD[k] if z > 0 else CROSS_WORD[k]}
             for k, (v, z) in comps.items()]
    # i conflitti si cercano tra gruppi di fonti (Racketpedia, forma, Excel), non dentro l'Excel: elasticità e allungamento
    # sono legati dalla definizione (più si allunga, meno risulta elastica)
    gz = {}
    if "rp" in comps:
        gz["rp"] = comps["rp"][1]
    if "shape" in comps:
        gz["shape"] = comps["shape"][1]
    xs = [(W[k], comps[k][1]) for k in ("elasticity", "stretch") if k in comps]
    if xs:
        gz["excel"] = sum(w * z for w, z in xs) / sum(w for w, _ in xs)
    GL = {"rp": "rigidità a riposo", "shape": "forma", "excel": "test Excel"}
    main_say = {"rp": "rigida", "shape": "sagomata", "excel": "poco elastico"}
    cross_say = {"rp": "morbida", "shape": "tonda", "excel": "elastico"}
    sm = [k for k, z in gz.items() if z >= STRONG]
    sc = [k for k, z in gz.items() if z <= -STRONG]
    conflicts = [f"{GL[a]} {main_say[a]} (main) contro {GL[b]} {cross_say[b]} (cross)" for a in sm for b in sc]
    if "rp" not in comps:
        confidence = "bassa"
    elif len(groups) == 3 and not conflicts:
        confidence = "alta"
    else:
        confidence = "media"
    return {"role": role, "score": score, "confidence": confidence, "basis": basis, "conflicts": conflicts, "descr": descr, "note": ""}

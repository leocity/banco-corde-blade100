"""Spin e rigidità di riferimento con stima dichiarata (spec v2 §5.1–5.2).

Priorità spin: misurato > parente (±0,5) > tester calibrato (solo se batte la media) > modello (rigidità + forma,
solo se batte la media in leave-one-out) > qualitativo > None.
Le stime "modello" non entrano mai nel punteggio: servono solo a posizionare la corda in mappa e nel confronto.
"""
import math
import re

COLOURS = ("black", "blue", "pink", "orange", "ornage", "green", "yellow", "white", "neon", "matcha", "pom",
           "gry", "grey", "blk", "bk", "ble", "desert", "yl", "pk", "red", "silver", "gold", "bronze")
MEASURED = ("exact", "probable")
RELATIVE_MARGIN = 0.5


def fit_linear(xs, ys):
    n = len(xs)
    mx, my = sum(xs) / n, sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    a = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx if sxx else 0.0
    return a, my - a * mx


def loo_mae(xs, ys):
    errs = []
    for i in range(len(xs)):
        a, b = fit_linear(xs[:i] + xs[i + 1:], ys[:i] + ys[i + 1:])
        errs.append(abs(a * xs[i] + b - ys[i]))
    return sum(errs) / len(errs)


def _loo_mean_mae(ys):
    n = len(ys)
    return sum(abs((sum(ys) - y) / (n - 1) - y) for y in ys) / n


def calibrate_tester_spin(pairs):
    if len(pairs) < 5:
        return {"a": None, "b": None, "mae": None, "baseline_mae": None, "usable": False, "n": len(pairs)}
    xs, ys = [float(p[0]) for p in pairs], [float(p[1]) for p in pairs]
    a, b = fit_linear(xs, ys)
    mae, base = loo_mae(xs, ys), _loo_mean_mae(ys)
    # utile solo se la relazione è nel verso giusto e batte la media di almeno il 5%
    usable = a > 0 and mae < 0.95 * base
    return {"a": a, "b": b, "mae": round(mae, 2), "baseline_mae": round(base, 2), "usable": usable, "n": len(pairs)}


def _solve(a, b):
    """Risolve a·x = b (eliminazione di Gauss con pivot parziale); a è piccola (≤4×4)."""
    n = len(b)
    m = [row[:] + [b[i]] for i, row in enumerate(a)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(m[r][c]))
        m[c], m[p] = m[p], m[c]
        for r in range(c + 1, n):
            f = m[r][c] / m[c][c]
            m[r] = [x - f * y for x, y in zip(m[r], m[c])]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (m[i][n] - sum(m[i][j] * x[j] for j in range(i + 1, n))) / m[i][i]
    return x


def _ridge_fit(rows, ys, lam):
    k = len(rows[0])
    mu = [sum(r[j] for r in rows) / len(rows) for j in range(k)]
    sd = [math.sqrt(sum((r[j] - mu[j]) ** 2 for r in rows) / len(rows)) or 1.0 for j in range(k)]
    xs = [[(r[j] - mu[j]) / sd[j] for j in range(k)] for r in rows]
    ym = sum(ys) / len(ys)
    a = [[sum(x[i] * x[j] for x in xs) + (lam if i == j else 0.0) for j in range(k)] for i in range(k)]
    b = [sum(x[i] * (y - ym) for x, y in zip(xs, ys)) for i in range(k)]
    return {"mu": mu, "sd": sd, "w": _solve(a, b), "ym": ym}


def _ridge_predict(m, row):
    return m["ym"] + sum(w * (v - mu) / sd for w, v, mu, sd in zip(m["w"], row, m["mu"], m["sd"]))


def _spin_row(stiffness, shape, with_stiffness):
    shape_part = [1.0 if shape == "HEX" else 0.0, 1.0 if shape is None else 0.0]
    return ([stiffness] if with_stiffness else []) + shape_part


def _backtest_ridge(rows, ys, lam):
    """Leave-one-out: errore medio assoluto del modello, della media e scarto al 80° percentile."""
    res = []
    for i in range(len(ys)):
        m = _ridge_fit(rows[:i] + rows[i + 1:], ys[:i] + ys[i + 1:], lam)
        res.append(abs(_ridge_predict(m, rows[i]) - ys[i]))
    mae, base = sum(res) / len(res), _loo_mean_mae(ys)
    q80 = sorted(res)[min(len(res) - 1, int(0.8 * len(res)))]
    return {"mae": round(mae, 2), "baseline_mae": round(base, 2), "q80": round(q80, 2), "n": len(ys),
            "usable": len(ys) >= 15 and mae < 0.95 * base}


def fit_spin_model(train, lam=5.0):
    """train = [(rigidità lb/in o None, forma o None, spin TWU misurato)].
    Due modelli ridge: rigidità + forma (se c'è la rigidità) e solo forma. Ognuno è 'usable' solo se batte la media."""
    out = {}
    for name, with_st in (("stiffness_shape", True), ("shape", False)):
        data = [(st, sh, y) for st, sh, y in train if not with_st or st is not None]
        if len(data) < 15:
            out[name] = {"usable": False, "n": len(data), "mae": None, "baseline_mae": None, "q80": None}
            continue
        rows = [_spin_row(st, sh, with_st) for st, sh, _ in data]
        ys = [y for _, _, y in data]
        meta = _backtest_ridge(rows, ys, lam)
        fit = _ridge_fit(rows, ys, lam)
        meta.update({"fit": {k: [round(x, 5) for x in v] if isinstance(v, list) else round(v, 5) for k, v in fit.items()},
                     "slope_per_lbin": round(fit["w"][0] / fit["sd"][0], 4) if with_st else None})
        out[name] = meta
    return out


def model_spin(rec, stiffness, model):
    """Stima dello spin da rigidità + forma (o solo forma); None se i modelli non sono utilizzabili."""
    if not model:
        return None
    shape = rec.get("shape")
    st = (stiffness or {}).get("value_lbin")
    cands = []
    if st is not None:
        cands.append(("stiffness_shape", "rigidità e forma", True))
    cands.append(("shape", "forma", False))
    for name, label, with_st in cands:
        m = model.get(name) or {}
        if not m.get("usable"):
            continue
        v = _ridge_predict(m["fit"], _spin_row(st, shape, with_st))
        half = m["q80"]
        if with_st and stiffness.get("high") is not None:  # incertezza della rigidità (es. da Racketpedia)
            half = math.sqrt(half ** 2 + (abs(m["slope_per_lbin"]) * (stiffness["high"] - stiffness["low"]) / 2) ** 2)
        v = max(0.0, min(10.0, v))
        out = _out(v, max(0.0, v - half), min(10.0, v + half), "modello", m["n"])
        out["model"] = label
        return out
    return None


def base_model(model):
    words = [w for w in re.split(r"[\s\-]+", model.lower()) if w and w not in COLOURS]
    return " ".join(words)


def model_id(brand, model):
    """Marca + modello senza colori, come modelId() in web/recommend.js: raggruppa calibri e colori dello stesso modello."""
    return re.sub(r"[^a-z0-9]+", "-", f"{brand} {base_model(model)}".lower()).strip("-")


def relatives_of(rec, records):
    key = (rec["brand"], base_model(rec["model"]))
    rel = [r for r in records if r["id"] != rec["id"] and (r["brand"], base_model(r["model"])) == key
           and r.get("twu") and r["twu"].get("match") in MEASURED]
    return sorted(rel, key=lambda r: abs((r.get("gauge_mm") or 0) - (rec.get("gauge_mm") or 0)))


def _band(level, pop):
    """Livello 1–5 -> valore al percentile 10/30/50/70/90 della popolazione misurata, margine = sd della fascia."""
    s = sorted(pop)
    p = 10 + (max(1.0, min(5.0, level)) - 1) * 20
    q = lambda pct: s[min(len(s) - 1, max(0, round(pct / 100 * (len(s) - 1))))]
    band = [v for v in s if q(p - 10) <= v <= q(p + 10)] or s
    m = sum(band) / len(band)
    sd = math.sqrt(sum((v - m) ** 2 for v in band) / len(band)) or (max(s) - min(s)) / 10
    v = q(p)
    return round(v, 2), round(v - sd, 2), round(v + sd, 2)


def _out(value, low, high, kind, n=1):
    return {"value": round(value, 2), "low": round(low, 2), "high": round(high, 2), "kind": kind, "basis_n": n}


def estimate_spin(rec, relatives, tester_agg, calib, twu_spin_pop, qual_usable=True, qual_mae=None,
                  model=None, stiffness=None):
    t = rec.get("twu") or {}
    if t.get("spin_potential") is not None:
        v = t["spin_potential"]
        if t.get("match") in MEASURED:
            return _out(v, v, v, "misurato")
        return _out(v, v - RELATIVE_MARGIN, v + RELATIVE_MARGIN, "parente")
    for r in relatives:
        v = r["twu"].get("spin_potential")
        if v is not None:
            return _out(v, v - RELATIVE_MARGIN, v + RELATIVE_MARGIN, "parente")
    score = ((tester_agg or {}).get("score") or {}).get("spin")
    if score is not None and calib and calib.get("usable"):
        v = calib["a"] * score + calib["b"]
        return _out(v, v - calib["mae"], v + calib["mae"], "tester")
    est = model_spin(rec, stiffness, model)
    if est:
        return est
    level = tester_level(tester_agg)
    if level is None:
        return None
    if qual_usable and twu_spin_pop:
        v, lo, hi = _band(level, twu_spin_pop)
        m = max(hi - v, qual_mae or 0)
        return _out(v, v - m, v + m, "qualitativo")
    # i giudizi dei tester non predicono lo spin TWU meglio della media: niente numero, solo il giudizio
    return {"value": None, "low": None, "high": None, "kind": "qualitativo", "level": round(level, 2), "basis_n": 1}


def tester_level(tester_agg):
    """Livello 1–5 dei tester per lo spin: dal giudizio, oppure dal percentile del voto tra le corde recensite."""
    a = tester_agg or {}
    level = (a.get("level") or {}).get("spin")
    pct = (a.get("pct") or {}).get("spin")
    if level is None and pct is not None:
        level = 1 + pct / 25
    return level


def backtest_qualitative(pairs, twu_spin_pop):
    """pairs = [(livello tester, spin TWU misurato)]: la fascia qualitativa batte la media?"""
    if len(pairs) < 5:
        return {"mae": None, "baseline_mae": None, "usable": False, "n": len(pairs)}
    ys = [y for _, y in pairs]
    mae = sum(abs(_band(l, twu_spin_pop)[0] - y) for l, y in pairs) / len(pairs)
    base = _loo_mean_mae(ys)
    return {"mae": round(mae, 2), "baseline_mae": round(base, 2), "usable": mae < 0.95 * base, "n": len(pairs)}


def siblings_with_rp(rec, records):
    """Stesso modello (altro calibro/colore) con rigidità statica Racketpedia, dal calibro più vicino."""
    key = (rec["brand"], base_model(rec["model"]))
    rel = [r for r in records if r["id"] != rec["id"] and (r["brand"], base_model(r["model"])) == key
           and (r.get("rpedia") or {}).get("static_stiffness_kgmm") is not None]
    return sorted(rel, key=lambda r: abs((r.get("gauge_mm") or 0) - (rec.get("gauge_mm") or 0)))


def fit_gauge_model(records):
    """Quanto cambia la rigidità TWU col calibro, a parità di modello (coppie di calibri misurati).
    Retta per l'origine su (Δcalibro mm, ΔrigiditàlbIn); verifica 'leave-one-model-out' contro il semplice copia-incolla."""
    groups = {}
    for r in records:
        t = r.get("twu") or {}
        if t.get("match") in MEASURED and t.get("stiffness_lbin") is not None and r.get("gauge_mm"):
            groups.setdefault((r["brand"], base_model(r["model"])), []).append((r["gauge_mm"], t["stiffness_lbin"]))
    pairs = {}
    for k, v in groups.items():
        for ga, sa in v:
            for gb, sb in v:
                if ga < gb:
                    pairs.setdefault(k, []).append((gb - ga, sb - sa))
    if sum(len(p) for p in pairs.values()) < 8:
        return {"slope": None, "usable": False, "n_pairs": sum(len(p) for p in pairs.values())}

    def slope_of(ps):
        den = sum(x * x for x, _ in ps)
        return sum(x * y for x, y in ps) / den if den else 0.0

    allp = [p for ps in pairs.values() for p in ps]
    errs, copy = [], []
    for k, ps in pairs.items():
        s = slope_of([p for kk, qs in pairs.items() if kk != k for p in qs])
        errs += [abs(y - s * x) for x, y in ps]
        copy += [abs(y) for _, y in ps]
    mae, base = sum(errs) / len(errs), sum(copy) / len(copy)
    q80 = sorted(errs)[min(len(errs) - 1, int(0.8 * len(errs)))]
    return {"slope": round(slope_of(allp), 1), "mae": round(mae, 1), "copy_mae": round(base, 1), "q80": round(q80, 1),
            "n_pairs": len(allp), "n_models": len(pairs), "usable": mae < 0.95 * base}


def check_gauge_usrsa(rows, slope):
    """Verifica indipendente della correzione per il calibro su un altro laboratorio (USRSA, via TruPro):
    errore medio sulle coppie di calibri della stessa corda, senza correzione e con la pendenza data."""
    groups = {}
    for r in rows:
        groups.setdefault(r["name"], []).append((r["gauge_mm"], r["stiffness_lbin"]))
    pairs = [(gb - ga, sb - sa) for v in groups.values() for ga, sa in v for gb, sb in v if ga < gb]
    if not pairs or slope is None:
        return None
    return {"n_pairs": len(pairs), "n_models": sum(1 for v in groups.values() if len(v) > 1),
            "mae_no_correction": round(sum(abs(y) for _, y in pairs) / len(pairs), 1),
            "mae_corrected": round(sum(abs(y - slope * x) for x, y in pairs) / len(pairs), 1)}


def fit_stiffness_model(train, lam=3.0):
    """train = [(calibro mm, rigidità TWU misurata)]. Ridge sul solo calibro (più spesso = più rigida).
    'usable' solo se batte la media in leave-one-out. Nessun giudizio personale dei tester."""
    data = [(g, y) for g, y in train if g]
    if len(data) < 15:
        return {"gauge": {"usable": False, "n": len(data)}}
    rows, ys = [[g] for g, _ in data], [y for _, y in data]
    meta = _backtest_ridge(rows, ys, lam)
    meta["fit"] = {k: [round(x, 5) for x in v] if isinstance(v, list) else round(v, 5) for k, v in _ridge_fit(rows, ys, lam).items()}
    return {"gauge": meta}


def model_stiffness(rec, model):
    m = (model or {}).get("gauge") or {}
    if not m.get("usable") or not rec.get("gauge_mm"):
        return None
    v = _ridge_predict(m["fit"], [rec["gauge_mm"]])
    return {"value_lbin": round(v, 1), "low": round(v - m["q80"], 1), "high": round(v + m["q80"], 1), "kind": "modello",
            "model": "calibro", "basis_n": m["n"]}


def twu_gauge_mm(twu):
    """Diametro (mm) della riga TWU usata come proxy, dal nome: '(1.30)', '16/1.30', '... 1.27'; '16' senza mm = 1.30."""
    name = (twu or {}).get("twu_name") or ""
    m = re.search(r"\((\d\.\d{1,2})\)", name) or re.search(r"/(\d\.\d{2})\b", name) or re.search(r"\s(1\.\d{2})$", name)
    if m:
        return float(m.group(1))
    return 1.30 if re.search(r"\s16$", name) else None


def _gauge_adjust(value, rec, sib, gauge):
    """Rigidità di un gemello portata al calibro della corda. Senza modello del calibro: copia (comportamento v2)."""
    dg = (rec.get("gauge_mm") or 0) - (sib.get("gauge_mm") or 0) if rec.get("gauge_mm") and sib.get("gauge_mm") else None
    if not gauge or not gauge.get("usable") or dg is None:
        return value, 0.0 if dg == 0 else None
    return value + gauge["slope"] * dg, (0.0 if abs(dg) < 1e-6 else gauge["q80"])


def estimate_stiffness(rec, relatives, rp_to_twu, tester_agg, twu_stiff_pop, gauge=None, model=None, rp_siblings=()):
    """Priorità: misurata > gemello TWU (corretto per calibro) > Racketpedia > gemello Racketpedia (corretto per calibro)
    > modello sul solo calibro > None. I giudizi dei tester non entrano mai."""
    t = rec.get("twu") or {}
    if t.get("stiffness_lbin") is not None:
        v = t["stiffness_lbin"]
        if t.get("match") in MEASURED:
            return {"value_lbin": v, "low": v, "high": v, "kind": "misurata"}
        # riga TWU di un altro calibro (proxy): si corregge per la differenza di diametro, con margine dichiarato
        tg = twu_gauge_mm(t)
        v2, m = _gauge_adjust(v, rec, {"gauge_mm": tg}, gauge)
        m = m if m is not None else ((gauge or {}).get("q80") or 0.0)
        return {"value_lbin": round(v2, 1), "low": round(v2 - m, 1), "high": round(v2 + m, 1), "kind": "parente",
                "from_lbin": v, "twu_gauge_mm": tg}
    for r in relatives:
        v0 = r["twu"].get("stiffness_lbin")
        if v0 is not None:
            v, m = _gauge_adjust(v0, rec, r, gauge)
            m = m if m is not None else (gauge or {}).get("q80") or 0.0
            return {"value_lbin": round(v, 1), "low": round(v - m, 1), "high": round(v + m, 1), "kind": "parente"}
    rp = (rec.get("rpedia") or {}).get("static_stiffness_kgmm")
    if rp is not None and rp_to_twu:
        a, b, mae = rp_to_twu
        v = round(a * rp + b, 1)
        return {"value_lbin": v, "low": round(v - mae, 1), "high": round(v + mae, 1), "kind": "da Racketpedia"}
    if rp_to_twu:
        for s in rp_siblings:
            a, b, mae = rp_to_twu
            v0 = a * s["rpedia"]["static_stiffness_kgmm"] + b
            v, m = _gauge_adjust(v0, rec, s, gauge)
            half = math.sqrt(mae ** 2 + ((m if m is not None else (gauge or {}).get("q80") or 0.0) ** 2))
            return {"value_lbin": round(v, 1), "low": round(v - half, 1), "high": round(v + half, 1), "kind": "da Racketpedia",
                    "via": "gemello"}
    return model_stiffness(rec, model)

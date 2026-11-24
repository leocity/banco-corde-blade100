"""Ibridi (verticali + orizzontali) per la Wilson Blade 100 v9 16×19, solo da dati di laboratorio del dataset.

La matematica del letto (rigidità alla tensione, calo di tensione, lancio, spin) è la stessa di web/phys.js e di web/next.js
(judgePhys): la parità è verificata da tests/fixtures/hybrid_cases.json, generato dal JS e letto da Python e da node.
Il TWU di una corda con verdetto crosscheck «contradicted» non si usa (derived.twu_flag): si usano i valori ricavati senza TWU.

Peso verticali/orizzontali: non ci sono ibridi misurati nel dataset per calibrarlo. Valore centrale 16/35 (46%, uno per filo,
come nella pagina); in `stiffness.range_k_now` si vede quanto cambia il risultato con pesi fino al 65% (ipotesi «le verticali
comandano»). Lo spin viene per il 60% dalle verticali (ipotesi dichiarata: sono loro a scivolare e tornare)."""
import json
import pathlib
import statistics
import sys

from pipeline.hybrid_role import SHAPE_MAIN, SHARP_DEFAULT

ROOT = pathlib.Path(__file__).resolve().parent.parent
T_REF = 23.1                         # kg = 51 lb, la tensione della prova TWU
W_COUNT = 16 / 35                    # peso delle verticali nel letto: un filo per filo (16 verticali, 19 orizzontali)
W_RANGE = (16 / 35, 0.5, 0.6, 0.65)  # sensibilità al peso
W_SPIN_MAIN = 0.6
KIND_RANK = {None: 0, "ricavata": 1, "modello": 2}
KIND_WORD = {None: "misurata", "ricavata": "ricavata", "modello": "dalla fisica"}

# grandezza del confronto tra letti: (chiave, etichetta, relativa, soglie «un po'» e «nettamente», parole su/giù, inversa)
PHYS_KEYS = [
    ("kNow", "Appena montata", True, (10, 15), "più rigida", "più morbida", False),
    ("kAfter", "Dopo il calo di tensione", True, (10, 15), "resta più rigida", "si ammorbidisce di più", False),
    ("launch", "Lancio della palla", True, (10, 15), "più bassa", "più alta", True),
    ("spin", "Spin", False, (0.5, 1.0), "più spin", "meno spin", False),
    ("loss", "Tenuta della tensione", False, (5, 10), "perde di più", "tiene di più", False),
]


def k_at(k51, tension_kg):
    return k51 * (0.5 + 0.5 * tension_kg / T_REF)


def worst(*kinds):
    return max(kinds, key=lambda k: KIND_RANK[k])


def _flagged(rec):
    return (rec.get("derived") or {}).get("twu_flag") or rec.get("twu_flag")


def value_of(rec, key, with_model=True):
    """Valore di una grandezza ('twu.stiffness', 'twu.loss', 'twu.spin', 'rp.kgmm'): misura se c'è, altrimenti il valore
    ricavato da dati o dalla fisica. {'v', 'est'} con est None | 'ricavata' | 'modello'. Con TWU contestato il TWU non c'è."""
    lab = rec.get("lab") or {}
    src, field = key.split(".")
    part = lab.get(src)
    if src == "twu" and _flagged(rec):
        part = None
    if part and part.get(field) is not None:
        return {"v": float(part[field]), "est": None}
    e = (lab.get("est") or {}).get(key)
    if e and e.get("v") is not None and (e.get("kind") == "ricavata" or (with_model and e.get("kind") == "modello")):
        return {"v": float(e["v"]), "est": e["kind"]}
    return None


def bed_of(V, O, kg, w=W_COUNT, w_spin=W_SPIN_MAIN):
    """Letto di verticali V e orizzontali O alle tensioni kg=[verticali, orizzontali]. Stessa formula di web/phys.js bedOf."""
    kV, kO = value_of(V, "twu.stiffness"), value_of(O, "twu.stiffness")
    lV, lO = value_of(V, "twu.loss"), value_of(O, "twu.loss")
    sV, sO = value_of(V, "twu.spin"), value_of(O, "twu.spin")
    tv, to = kg
    mix = lambda a, b: w * a + (1 - w) * b
    k_now = {"v": mix(k_at(kV["v"], tv), k_at(kO["v"], to)), "est": worst(kV["est"], kO["est"])} if kV and kO else None
    loss = {"v": mix(lV["v"], lO["v"]), "est": worst(lV["est"], lO["est"])} if lV and lO else None
    k_after = ({"v": mix(k_at(kV["v"], tv * (1 - lV["v"] / 100)), k_at(kO["v"], to * (1 - lO["v"] / 100))), "est": worst(k_now["est"], loss["est"])}
               if k_now and lV and lO else None)
    spin = None
    if sV and sO:
        spin = {"v": sV["v"] if V["id"] == O["id"] else w_spin * sV["v"] + (1 - w_spin) * sO["v"], "est": worst(sV["est"], sO["est"])}
    return {"kNow": k_now, "kAfter": k_after, "loss": loss, "spin": spin, "roundCross": O.get("shape") == "RND", "hybrid": V["id"] != O["id"]}


def compare_beds(a, b):
    """Confronto tra due letti, stesse soglie e stessa direzione di web/phys.js compareBeds."""
    rows = []
    for key, label, rel, bands, up, down, inverse in PHYS_KEYS:
        src = "kAfter" if key == "launch" else key
        A, B = a.get(src), b.get(src)
        if not A or not B:
            continue
        diff = (A["v"] - B["v"]) / B["v"] * 100 if rel else A["v"] - B["v"]
        d = abs(diff)
        level = "simile" if d < bands[0] else "un po'" if d <= bands[1] else "nettamente"
        direction = None if level == "simile" else ("più" if diff > 0 else "meno")
        word = "simile" if direction is None else (up if direction == "più" else down)
        est = worst(A["est"], B["est"])
        if inverse and direction:
            direction = "meno" if direction == "più" else "più"  # lancio: letto più rigido = palla più bassa
        rows.append({"key": key, "label": label, "diff": diff, "rel": rel, "level": level, "dir": direction, "word": word, "est": est, "estA": A["est"]})
    return rows


def judge_phys(goal, rows):
    """Quanto un letto va nella direzione chiesta (stesse regole di web/next.js judgePhys)."""
    get = lambda k: next((r for r in rows if r["key"] == k), None)
    dd = lambda k: get(k)["diff"] if get(k) else None
    lv = lambda k: get(k)["level"] if get(k) else None
    dr = lambda k: get(k)["dir"] if get(k) else None
    k_now, k_after, spin, loss = dd("kNow"), dd("kAfter"), dd("spin"), dd("loss")
    z = lambda x: 0 if x is None else x
    spin_pen = (-spin - 1) if spin is not None and spin < -1 else 0
    if goal == "same":
        ok = k_now is not None and lv("kNow") == "simile" and (k_after is None or lv("kAfter") == "simile") and (spin is None or lv("spin") == "simile")
        return {"ok": ok, "score": -(abs(z(k_now)) / 10 + abs(z(k_after)) / 10 + abs(z(spin)) / 0.5)}
    if goal == "softer":
        return {"ok": dr("kNow") == "meno", "score": -abs(z(k_now) + 15) / 10 - spin_pen}
    if goal == "stiffer":
        return {"ok": dr("kNow") == "più", "score": -abs(z(k_now) - 15) / 10 - spin_pen}
    if goal == "lower":
        return {"ok": dr("launch") == "meno", "score": -abs(z(k_after) - 15) / 10 - spin_pen - max(0, z(k_now) - 20) / 10}
    if goal == "holds":
        return {"ok": dr("loss") == "meno" and k_now is not None and abs(k_now) <= 15, "score": -z(loss) / 5 - abs(z(k_now)) / 10}
    if goal == "spin":
        return {"ok": dr("spin") == "più" and k_now is not None and abs(k_now) <= 15, "score": z(spin) / 0.5 - abs(z(k_now)) / 10}
    return {"ok": False, "score": 0}


GOALS = ("same", "softer", "stiffer", "lower", "holds", "spin")
NORM = {"kNow": 10, "kAfter": 10, "launch": 10, "spin": 0.5, "loss": 5}  # una soglia «simile» per grandezza: distanza dalla montata


# ---------- geometria ----------
SHAPE_CLASS = {"RND": "liscia", "HEX": "media", "OCT": "media", "PENT": "sagomata", "SQ": "sagomata", "TWST": "sagomata"}
CLASS_RANK = {"liscia": 0, "media": 1, "sagomata": 2}
GEOMETRY_NOTE = "ipotesi del progetto, non misura: TWU non trova un legame prevedibile tra forma e attrito"


def shape_class(shape):
    return None if not shape else SHAPE_CLASS.get(shape, "sagomata")


def geometry(V, O):
    cv, co = shape_class(V.get("shape")), shape_class(O.get("shape"))
    base = {"main_shape": V.get("shape"), "cross_shape": O.get("shape"), "main_class": cv, "cross_class": co, "basis": GEOMETRY_NOTE}
    if V["id"] == O["id"] or (V.get("model") == O.get("model") and V.get("brand") == O.get("brand")):
        return {**base, "tag": "stesso modello", "note": "stessa corda su entrambi i fili: è un letto pieno, non un ibrido"}
    if cv is None or co is None:
        return {**base, "tag": None, "note": "forma non nota per una delle due corde"}
    d = CLASS_RANK[cv] - CLASS_RANK[co]
    if cv == "sagomata" and co == "sagomata":
        tag, note = "doppia sagomata", "più attrito tra verticali e orizzontali: le verticali tornano meno (snapback ridotto) e si intaccano di più"
    elif d >= 1:
        tag, note = "classica", "verticale più sagomata dell'orizzontale: morso sulla palla in verticale e poco attrito tra le corde in orizzontale, favorisce lo snapback"
    elif d == 0:
        tag, note = ("liscia-liscia", "entrambe lisce: le verticali scorrono bene ma c'è meno morso sulla palla") if cv == "liscia" else ("uniforme", "stessa classe di forma: nessun vantaggio di scorrimento particolare")
    else:
        tag, note = "invertita", "orizzontale più sagomata della verticale: più attrito tra le corde proprio dove servirebbe scorrimento"
    return {**base, "tag": tag, "note": note}


# ---------- coerenza di tenuta ----------
LOSS_BANDS = (5, 10)  # punti di perdita TWU: come il confronto tra letti


def _level(d, bands):
    d = abs(d)
    return "simile" if d < bands[0] else "un po'" if d <= bands[1] else "nettamente"


def holding(V, O, ctx):
    """Una corda cede molto prima dell'altra? TWU e Excel si leggono ciascuno nella propria fonte e non si fondono mai
    (nei dati TL6 dell'Excel e perdita TWU non concordano). La perdita ricavata dalla sola fisica non si usa: sarebbe circolare."""
    out = {"twu": None, "excel": None, "verdict": "non valutabile", "weaker": None, "note": ""}
    lv, lo = value_of(V, "twu.loss", with_model=False), value_of(O, "twu.loss", with_model=False)
    twu_level = None
    if lv and lo:
        d = lv["v"] - lo["v"]
        twu_level = _level(d, LOSS_BANDS)
        out["twu"] = {"main": round(lv["v"], 1), "cross": round(lo["v"], 1), "delta": round(d, 1), "level": twu_level,
                      "weaker": None if twu_level == "simile" else ("main" if d > 0 else "cross"), "est": KIND_WORD[worst(lv["est"], lo["est"])]}
    ev, eo = V.get("excel") or {}, O.get("excel") or {}
    metrics = {}
    for name, field in (("tl6", "tl6"), ("tl12", "tl12"), ("creep24", "static_24h_creep")):
        a, b = ev.get(field), eo.get(field)
        if a is None or b is None or not ctx["sd"].get(name):
            continue
        d = a - b
        flagged = abs(d) >= ctx["sd"][name]
        metrics[name] = {"main": a, "cross": b, "delta": round(d, 2), "flag": flagged, "weaker": None if not flagged else ("main" if d > 0 else "cross")}
    excel_weaker = {m["weaker"] for m in metrics.values() if m["weaker"]}
    if metrics:
        out["excel"] = {"metrics": metrics, "weaker": next(iter(excel_weaker)) if len(excel_weaker) == 1 else None, "flagged": sorted(k for k, m in metrics.items() if m["flag"])}
    tw = out["twu"]["weaker"] if out["twu"] else None
    exw = out["excel"]["weaker"] if out["excel"] else None
    if tw and exw and tw != exw:
        out["verdict"], out["note"] = "fonti discordanti", f"TWU dice che cede prima la {'verticale' if tw == 'main' else 'orizzontale'}, l'Excel l'altra: nessuna conclusione"
    elif out["twu"]:
        lvl = out["twu"]["level"]
        out["verdict"] = {"simile": "bilanciata", "un po'": "leggermente sbilanciata", "nettamente": "sbilanciata"}[lvl]
        out["weaker"] = tw
        if tw:
            out["note"] = f"secondo TWU cede prima la {'verticale' if tw == 'main' else 'orizzontale'} ({abs(out['twu']['delta']):.0f} punti di perdita in più)"
    elif out["excel"]:
        out["verdict"] = "sbilanciata (solo Excel)" if out["excel"]["flagged"] else "bilanciata (solo Excel)"
        out["weaker"] = out["excel"]["weaker"]
        if out["weaker"]:
            out["note"] = f"secondo l'Excel cede prima la {'verticale' if out['weaker'] == 'main' else 'orizzontale'}"
    else:
        out["note"] = "nessuna misura di tenuta in comune"
    return out


# ---------- tensione ----------
def _half(x):
    return round(x * 2) / 2


def hybrid_tension(V, O, ctx, k51_equiv):
    """Tensione di partenza (verticali, orizzontali): si parte dalla coppia della preferita ancora più vicina alla verticale
    (differenziale delle tue ancore, +1 kg alle verticali) e si corregge con la pendenza ricavata dalle tue due preferite per la
    differenza tra la rigidità equivalente dell'ibrido e quella dell'ancora, al massimo ±2 kg. È la stessa logica di
    derive.tension_start applicata al letto; in `per_string` quella delle due corde prese da sole."""
    ts_v, ts_o = (V.get("derived") or {}).get("tension_start"), (O.get("derived") or {}).get("tension_start")
    per_string = [ts_v["kg"][0], ts_o["kg"][1]] if ts_v and ts_o else None
    out = {"kg": None, "differential": None, "per_string": per_string, "anchor": None, "flags": [], "note": ""}
    if not ts_v:
        out["note"] = "tensione non calcolabile: manca tension_start della verticale"
        return out
    anchor = ctx["by"].get(ts_v["from"])
    ak = value_of(anchor, "twu.stiffness") if anchor else None
    base = list(ctx["anchors"].get(ts_v["from"], ts_v["kg"]))
    delta = 0.0
    if k51_equiv and ak:
        delta = max(-2.0, min(2.0, _half(ts_v["slope_kg_per_lbin"] * (k51_equiv["v"] - ak["v"]))))
        out["note"] = f"da {ts_v['from']} {base[0]:g}/{base[1]:g} kg corretta di {delta:+.1f} kg per la rigidità equivalente dell'ibrido".replace(".", ",")
    else:
        out["note"] = f"tensione della preferita più simile ({ts_v['from']}), senza una rigidità per correggerla"
    kg = [base[0] + delta, base[1] + delta]
    out.update(kg=kg, differential=kg[0] - kg[1], anchor=ts_v["from"])
    if out["differential"] > 2:
        out["flags"].append("differenziale oltre 2 kg: regola pratica, non una misura")
    if out["differential"] < 0:
        out["flags"].append("orizzontali più tese delle verticali: insolito, regola pratica")
    return out


# ---------- valutazione ----------
def make_context(strings, anchors=None):
    by = {r["id"]: r for r in strings}
    sd = {}
    for name, field in (("tl6", "tl6"), ("tl12", "tl12"), ("creep24", "static_24h_creep")):
        vals = [r["excel"][field] for r in strings if r.get("excel") and r["excel"].get(field) is not None]
        sd[name] = statistics.pstdev(vals) if len(vals) > 1 else None
    from pipeline.derive import ANCHOR_TENSIONS
    return {"by": by, "sd": sd, "anchors": anchors or ANCHOR_TENSIONS}


def _r(x, d=1):
    return None if x is None else round(x, d)


def evaluate_hybrid(V, O, kg, ref_bed, ctx, w=W_COUNT):
    """Valutazione completa di una coppia: rigidità equivalente (con il margine del peso), geometria, tenuta, tensione e
    confronto con la corda di riferimento (la montata)."""
    bed = bed_of(V, O, kg, w)
    kV, kO = value_of(V, "twu.stiffness"), value_of(O, "twu.stiffness")
    k51 = {"v": w * kV["v"] + (1 - w) * kO["v"], "est": worst(kV["est"], kO["est"])} if kV and kO else None
    ks = [bed_of(V, O, kg, x)["kNow"] for x in W_RANGE]
    ks = [k["v"] for k in ks if k]
    rows = compare_beds(bed, ref_bed) if ref_bed else []
    stiffness = {
        "w_main": round(w, 3), "k51": _r(k51 and k51["v"]), "k_now": _r(bed["kNow"] and bed["kNow"]["v"]), "k_after": _r(bed["kAfter"] and bed["kAfter"]["v"]),
        "range_k_now": [_r(min(ks)), _r(max(ks))] if ks else None,
        "delta_k51": _r(kV["v"] - kO["v"]) if kV and kO else None,
        "delta_k51_pct": _r((kV["v"] - kO["v"]) / kO["v"] * 100) if kV and kO else None,
        "main": KIND_WORD[kV["est"]] if kV else "mancante", "cross": KIND_WORD[kO["est"]] if kO else "mancante",
        "reliability": KIND_WORD[worst(kV["est"], kO["est"])] if kV and kO else "mancante",
        "source": "TWU (misura o ricavata senza TWU contestato)",
    }
    tension = hybrid_tension(V, O, ctx, k51)
    flags = []
    if kV and kO and kV["v"] < kO["v"] * 0.9:
        flags.append("verticale più morbida dell'orizzontale (oltre il 10%): di solito si fa il contrario")
    for r in (V, O):
        if _flagged(r):
            flags.append(f"{r['id']}: dato TWU contestato ({_flagged(r)['reason']}), usati i valori senza TWU")
    return {
        "main": V["id"], "cross": O["id"], "kg": list(kg), "stiffness": stiffness,
        "spin": _r(bed["spin"] and bed["spin"]["v"]), "spin_reliability": KIND_WORD[bed["spin"]["est"]] if bed["spin"] else "mancante",
        "loss": _r(bed["loss"] and bed["loss"]["v"]),
        "geometry": geometry(V, O), "holding": holding(V, O, ctx), "tension": tension,
        "vs_reference": [{"key": r["key"], "label": r["label"], "dir": r["dir"], "word": r["word"], "level": r["level"], "diff": _r(r["diff"]),
                          "est": KIND_WORD[r["est"]] if r["est"] else None} for r in rows],
        "flags": flags,
    }


# ---------- inventario e generazione ----------
SIZE_ALIAS = {"intera": "matassina", "matassina": "matassina", "mezza": "mezza", "mezza matassina": "mezza"}


def stock_counts(inventory):
    out = {}
    for x in (inventory or {}).get("stock", []):
        size = SIZE_ALIAS.get(x.get("size"))
        if size and x.get("n", 0) >= 1:
            out.setdefault(x["id"], {"matassina": 0, "mezza": 0})[size] += int(x["n"])
    return out


def can_half(counts, sid):
    c = counts.get(sid)
    return bool(c and (c["matassina"] >= 1 or c["mezza"] >= 1))


def can_full(counts, sid):
    c = counts.get(sid)
    return bool(c and (c["matassina"] >= 1 or c["mezza"] >= 2))


def _eligible(V, O):
    kv, ko = value_of(V, "twu.stiffness"), value_of(O, "twu.stiffness")
    if not kv or not ko or kv["v"] < ko["v"] * 0.9:
        return False
    return not (V["id"] == O["id"] or (V["brand"] == O["brand"] and V["model"].lower() == O["model"].lower()))


def generate(strings, inventory, goal=None, limit=10, ctx=None, mode="stock"):
    """Le migliori coppie possibili. mode «stock»: solo corde in casa (una mezza o una matassina per filo);
    «buy_one»: una corda in casa e una da comprare tra quelle con rigidità TWU misurata o ricavata da dati.
    Con `goal` solo le coppie che vanno in quella direzione, ordinate dal punteggio fisico; senza, per vicinanza alla montata."""
    ctx = ctx or make_context(strings)
    by = ctx["by"]
    eq = (inventory or {}).get("equipped") or {}
    ref = by.get(eq.get("id"))
    kg = eq.get("kg") or [22, 21]
    ref_bed = bed_of(ref, ref, kg) if ref else None
    counts = stock_counts(inventory)
    own = [by[i] for i in counts if i in by and can_half(counts, i)]
    pool = own if mode == "stock" else [r for r in strings if (value_of(r, "twu.stiffness") or {}).get("est") != "modello"]
    out = []
    for V in (own if mode == "stock" else pool):
        for O in (own if mode == "stock" else pool):
            if mode == "buy_one" and (V["id"] in counts and can_half(counts, V["id"])) == (O["id"] in counts and can_half(counts, O["id"])):
                continue  # serve una corda in casa e una da comprare
            if not _eligible(V, O):
                continue
            bed = bed_of(V, O, kg)
            rows = compare_beds(bed, ref_bed) if ref_bed else []
            j = judge_phys(goal, rows) if goal else None
            if goal and not j["ok"]:
                continue
            dist = sum(abs(r["diff"]) / NORM[r["key"]] for r in rows)
            score = j["score"] if goal else -dist
            out.append((score, V, O))
    out.sort(key=lambda t: (-t[0], t[1]["id"], t[2]["id"]))
    seen, res = set(), []
    for score, V, O in out:
        key = tuple(sorted((V["id"], O["id"])))
        if key in seen:
            continue
        seen.add(key)
        e = evaluate_hybrid(V, O, kg, ref_bed, ctx)
        e["score"] = round(score, 2)
        e["from_stock"] = [can_half(counts, V["id"]), can_half(counts, O["id"])]
        res.append(e)
        if len(res) >= limit:
            break
    return res


def evaluate_inputs(strings, inputs, inventory):
    """Gli ibridi di data/hybrids_input.json (montati o da provare), con id non validi segnalati e non scartati in silenzio."""
    ctx = make_context(strings)
    by = ctx["by"]
    eq = (inventory or {}).get("equipped") or {}
    ref = by.get(eq.get("id"))
    ref_bed = bed_of(ref, ref, eq.get("kg") or [22, 21]) if ref else None
    out, problems = [], []
    for h in (inputs or {}).get("hybrids", []):
        V, O = by.get(h.get("main")), by.get(h.get("cross"))
        if not V or not O:
            problems.append(f"{h.get('id')}: corda sconosciuta ({h.get('main') if not V else h.get('cross')})")
            continue
        kg = h.get("kg") or (inventory or {}).get("equipped", {}).get("kg") or [22, 21]
        e = evaluate_hybrid(V, O, kg, ref_bed, ctx)
        e.update(id=h.get("id"), status=h.get("status"), date=h.get("date"), note=h.get("note", ""))
        e["tension"]["suggested_vs_used"] = (e["tension"]["kg"] is not None and h.get("kg") is not None and
                                              [h["kg"][0] - e["tension"]["kg"][0], h["kg"][1] - e["tension"]["kg"][1]])
        out.append(e)
    return out, problems


def build_hybrids(strings, inputs, inventory, goals=GOALS, limit=5):
    ctx = make_context(strings)
    evaluated, problems = evaluate_inputs(strings, inputs, inventory)
    suggestions = {g: generate(strings, inventory, g, limit, ctx) for g in goals}
    return {"generated_from": {"strings": len(strings), "inventory_items": len((inventory or {}).get("stock", [])),
                               "w_main": round(W_COUNT, 3), "w_range": [round(x, 3) for x in W_RANGE], "w_spin_main": W_SPIN_MAIN},
            "evaluated": evaluated, "problems": problems, "suggested_from_stock": suggestions}


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


if __name__ == "__main__":
    strings = _load("data/strings.json")["strings"]
    out = build_hybrids(strings, _load("data/hybrids_input.json", {}), _load("data/inventory.json", {}))
    (ROOT / "data" / "hybrids.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(out['evaluated'])} ibridi valutati; suggeriti dalle corde in casa: " +
          ", ".join(f"{g} {len(v)}" for g, v in out["suggested_from_stock"].items()), "| problemi:", out["problems"] or "nessuno")
    sys.exit(1 if out["problems"] else 0)

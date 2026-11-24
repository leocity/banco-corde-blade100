"""Note da maestro incordatore: regole applicate ai dati di ogni corda + note scritte a mano che hanno precedenza."""

KEYS = ("feel", "on_blade_100_v9", "for_your_style", "vs_favorites")
SPIN_KIND_IT = {"parente": "da un calibro o colore gemello", "tester": "dai punteggi dei tester", "qualitativo": "dai giudizi dei tester",
                "modello": "da un modello su rigidità e forma, bassa affidabilità"}
DISLIKED_NAMES = {"confidential_soft": "Confidential Soft", "rpm_blast": "RPM Blast"}
SHAPE_IT = {"RND": "tonda", "HEX": "esagonale", "PENT": "pentagonale", "SQ": "quadrata", "OCT": "ottagonale",
            "GEAR": "a ingranaggio", "TWST": "ritorta", "STAR": "a stella", "TRI": "triangolare", "HEP": "eptagonale"}


def _band(v, hi=65, lo=35):
    if v is None:
        return None
    return "hi" if v >= hi else "lo" if v <= lo else "mid"


def _stiff_pct(r):
    return ((r.get("derived") or {}).get("dims") or {}).get("stiffness")


def _kg(t):
    return f"{t['kg'][0]:g}/{t['kg'][1]:g} kg ({t['lbs'][0]:g}/{t['lbs'][1]:g} lbs)"


def _feel(r, s):
    t = r.get("twu")
    shape = SHAPE_IT.get(r.get("shape") or "", "")
    stiff = {"hi": "rigida", "mid": "di rigidità media", "lo": "morbida"}.get(_band(_stiff_pct(r)))
    sp = r.get("spin")
    if sp and sp.get("kind") not in (None, "misurato") and sp.get("value") is not None:
        est = f" Spin stimato ≈ {sp['value']:g} ({SPIN_KIND_IT.get(sp['kind'], sp['kind'])}, tra {sp['low']:g} e {sp['high']:g})."
    elif sp and sp.get("level") is not None:
        word = ("molto basso", "basso", "medio", "alto", "molto alto")[max(0, min(4, round(sp["level"]) - 1))]
        est = f" Spin giudicato {word} dai tester; nessuna stima numerica affidabile."
    else:
        est = ""
    if r.get("catalog_only"):
        n = ((r.get("reviews") or {}).get("agg") or {}).get("n_sources", 0)
        return (f"Nessun test di laboratorio su questa corda, quindi non la giudichiamo. Le recensioni nella scheda ({n} fonti) sono solo un riferimento."
                + (f" Profilo {shape}." if shape else "") + est)
    if not t:
        si = (r.get("excel") or {}).get("stiff_index_avg")
        base = f"Senza dati TWU: il giudizio si basa sul test Ektelon (Stiff Index {si:.2f}) e su Racketpedia, quindi è meno preciso." if si else "Senza dati TWU né test completi: considera la scheda un'indicazione di massima."
        return base + (f" Profilo {shape}." if shape else "") + est
    sv = t.get("spin_potential")
    spin = "spin non misurato da TWU" if sv is None else {"hi": f"spin alto ({sv:g})", "mid": f"spin nella media ({sv:g})",
                                                         "lo": f"poco spin ({sv:g})"}.get(_band(s["spin"]), f"spin {sv:g}")
    dur = {"hi": "tiene bene la tensione", "mid": "cala nella media", "lo": f"cala in fretta ({t['tension_loss_pct'] or 0:g}% di perdita su TWU)"}.get(_band(s["durability"]), "")
    rs = r.get("stiffness")
    st = f" ({'≈ ' if rs['kind'] != 'misurata' else ''}{rs['value_lbin']:.0f} lb/in)" if rs else ""
    return f"Poly {stiff or 'di rigidità non misurata'}{st}, {spin}" + (f", profilo {shape}" if shape else "") + (f"; {dur}." if dur else ".")


INSUFFICIENT = "Dati insufficienti per giudicarla: non ci sono test di laboratorio né recensioni utilizzabili."


def _blade(r, s):
    """Nessun dato misura come una corda si comporta su una racchetta precisa (angolo di uscita, profondità, direzione): niente promesse."""
    if all(v is None for v in (s.get("spin"), _stiff_pct(r))):
        return INSUFFICIENT
    return ("Nessun test misura il comportamento di questa corda sulla Blade 100 v9 (angolo di uscita, profondità, direzione): "
            "i valori sopra sono misure di laboratorio e indici. Parti dalla tensione suggerita, che è una regola empirica, e prova; "
            "se vuoi un confronto vero registra i voti nel diario.")


def _style(r, s):
    if all(s.get(k) is None for k in ("spin", "durability")):
        return INSUFFICIENT
    out = []
    sp = _band(s["spin"])
    if sp == "hi":
        out.append("Per il gioco in rotazione è un punto di forza: le verticali tornano in sede e aiutano il topspin anche su swing medi.")
    elif sp == "lo":
        out.append("Sulle rotazioni rende meno della media: va bene se cerchi stabilità nei colpi piatti, meno se vivi di topspin.")
    else:
        out.append("Rotazione nella media: lascia spazio sia al topspin sia al colpo piatto.")
    d = _band(s["durability"])
    out.append({"lo": "Perde tensione più della media: rincordala prima delle altre, appena senti il piatto spegnersi.",
                "hi": "Tiene bene la tensione: resta giocabile più a lungo della media.",
                "mid": "Cala come la media delle poliestere."}.get(d, ""))
    return " ".join(x for x in out if x)


def _vs(r):
    d = r["derived"]
    if r.get("preference") == "liked":
        out = ["È una delle tue preferite: è il riferimento per tutte le altre."]
    elif r.get("preference") == "disliked":
        out = ["Non ti è piaciuta: serve come riferimento negativo per segnalare le corde troppo simili."]
    else:
        sl = d.get("similarity_liked") or {}
        c, o = sl.get("confidential"), sl.get("otoro")
        if c is None and o is None:
            out = ["Dati insufficienti per misurare la somiglianza con le tue preferite."]
        else:
            fmt = lambda v: "n.d." if v is None else f"{v}/100"
            out = [f"Somiglianza {fmt(c)} con Confidential e {fmt(o)} con O-Toro."]
            basis = max((d.get("similarity_basis") or {}).values(), default=6)
            if basis <= 3:
                missing = [n for n, k in (("TWU", "twu"), ("test Ektelon", "excel"), ("Racketpedia", "rpedia")) if not r.get(k)]
                out.append(f"Calcolata su sole {basis} misure (mancano {' e '.join(missing)}): prendila come indicazione.")
        if d.get("disliked_warning"):
            sims = [(k, v) for k, v in (d.get("similarity_disliked") or {}).items() if v is not None]
            if d.get("disliked_reason") == "modello" or not sims:
                out.append(f"Attenzione: è un calibro di {r['model']}, modello che non ti è piaciuto.")
            else:
                g, v = max(sims, key=lambda kv: kv[1])
                out.append(f"Attenzione: assomiglia molto a {DISLIKED_NAMES[g]} ({v}/100), che non ti è piaciuta.")
    t = d.get("tension_start")
    if t and r.get("preference") != "liked":
        out.append(f"Parti da {_kg(t)}.")
    tw = r.get("twu")
    if tw and tw.get("match") != "exact":
        out.append(f"I dati TWU sono di «{tw['twu_name']}».")
    return " ".join(out)


def generate_notes(r):
    s = r["derived"]["subscores"]
    return {"feel": _feel(r, s), "on_blade_100_v9": _blade(r, s), "for_your_style": _style(r, s), "vs_favorites": _vs(r)}


def apply_notes(records, manual):
    for r in records:
        r["notes"] = {**generate_notes(r), **{k: v for k, v in (manual.get(r["id"]) or {}).items() if k in KEYS}}
    return records

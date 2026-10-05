"""Note da maestro incordatore: regole applicate ai dati di ogni corda + note scritte a mano che hanno precedenza."""

KEYS = ("feel", "on_blade_100_v9", "for_your_style", "vs_favorites")
DISLIKED_NAMES = {"confidential_soft": "Confidential Soft", "rpm_blast": "RPM Blast"}
SHAPE_IT = {"RND": "tonda", "HEX": "esagonale", "PENT": "pentagonale", "SQ": "quadrata", "OCT": "ottagonale",
            "GEAR": "a ingranaggio", "TWST": "ritorta", "STAR": "a stella", "TRI": "triangolare", "HEP": "eptagonale"}


def _band(v, hi=65, lo=35):
    if v is None:
        return None
    return "hi" if v >= hi else "lo" if v <= lo else "mid"


def _kg(t):
    return f"{t['kg'][0]:g}/{t['kg'][1]:g} kg ({t['lbs'][0]:g}/{t['lbs'][1]:g} lbs)"


def _feel(r, s):
    t = r.get("twu")
    shape = SHAPE_IT.get(r.get("shape") or "", "")
    stiff = {"hi": "rigida e compatta", "mid": "di rigidità media", "lo": "morbida"}.get(_band(s["control"]))
    if not t:
        si = (r.get("excel") or {}).get("stiff_index_avg")
        base = f"Senza dati TWU: il giudizio si basa sul test Ektelon (Stiff Index {si:.2f}) e su Racketpedia, quindi è meno preciso." if si else "Senza dati TWU né test completi: considera la scheda un'indicazione di massima."
        return base + (f" Profilo {shape}." if shape else "")
    sv = t.get("spin_potential")
    spin = "spin non misurato da TWU" if sv is None else {"hi": f"snapback alto (spin {sv:g})", "mid": f"spin nella media ({sv:g})",
                                                         "lo": f"poco spin ({sv:g})"}.get(_band(s["spin"]), f"spin {sv:g}")
    dur = {"hi": "tiene bene la tensione", "mid": "cala nella media", "lo": f"cala in fretta ({t['tension_loss_pct'] or 0:g}% di perdita su TWU)"}.get(_band(s["durability"]), "")
    st = f" ({t['stiffness_lbin']:.0f} lb/in)" if t.get("stiffness_lbin") is not None else ""
    return f"Poly {stiff or 'di rigidità non misurata'}{st}, {spin}" + (f", profilo {shape}" if shape else "") + (f"; {dur}." if dur else ".")


def _blade(r, s):
    b = _band(s["control"])
    if b == "hi":
        return ("La Blade 100 v9 è flessibile e a RA basso: assorbe parte della rigidità, ma il piatto resta "
                "controllato e la palla esce un po' corta. Non salire sopra la tensione suggerita; il 16×19 aiuta a ritrovare spin.")
    if b == "lo":
        return ("Corda morbida su telaio flessibile: piatto molto vivo, profondità facile. Sui colpi piatti può uscire lunga, "
                "quindi parti dalla tensione suggerita senza scendere; il prestretch leggero aiuta a stabilizzarla.")
    return ("Con il telaio flessibile della Blade l'equilibrio è neutro: palla controllata ma non spenta, e lo schema 16×19 "
            "lascia scorrere le verticali per lo spin.")


def _style(r, s):
    out = []
    sp = _band(s["spin"])
    if sp == "hi":
        out.append("Per il gioco in rotazione è un punto di forza: le verticali tornano in sede e aiutano il topspin anche su swing medi.")
    elif sp == "lo":
        out.append("Sulle rotazioni rende meno della media: va bene se cerchi stabilità nei colpi piatti, meno se vivi di topspin.")
    else:
        out.append("Rotazione nella media: lascia spazio sia al topspin sia al colpo piatto.")
    if _band(s["control"]) == "hi":
        out.append("Sui colpi piatti dà direzione e stabilità.")
    d = _band(s["durability"])
    out.append({"lo": "Con 4–5 ore a settimana la sentirai calare dopo 6–8 ore: rincorda ogni 2 settimane circa.",
                "hi": "Con 4–5 ore a settimana resta giocabile per 3–4 settimane.",
                "mid": "Con il tuo volume di gioco, rincorda ogni 3 settimane circa."}.get(d, ""))
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
                out.append(f"Calcolata su sole {basis} misure (manca TWU): prendila come indicazione.")
        if d.get("disliked_warning"):
            g, v = max(((k, v) for k, v in (d.get("similarity_disliked") or {}).items() if v is not None), key=lambda kv: kv[1])
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

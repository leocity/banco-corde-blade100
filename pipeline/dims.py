"""Dimensioni del pairing: percentili di rigidità, tenuta, controllo, elasticità e spin, più le misure del test Excel."""
from pipeline.derive import _get, percentile, population, spin_lab, stiff_lab

DIM_KEYS = ("stiffness", "durability", "control", "elasticity", "spin")


def elasticity(rec):
    """Quota dell'allungamento a 50 lb che la corda recupera (più alta = più elastica)."""
    stretch, recover = _get(rec, "excel", "stretch_pct", 50), _get(rec, "excel", "recover_pct", 50)
    if stretch is None or recover is None or stretch <= 0:
        return None
    return recover / stretch


def excel_measures(rec):
    if not rec.get("excel"):
        return None
    return {"stretch50": _get(rec, "excel", "stretch_pct", 50), "elasticity": elasticity(rec),
            "cedimento": _get(rec, "excel", "stiff_index_avg"), "tl6": _get(rec, "excel", "tl6"),
            "tl12": _get(rec, "excel", "tl12"), "creep24": _get(rec, "excel", "static_24h_creep")}


def dim_populations(records):
    pop = population(records)
    pop["excel_tl12"] = [v for v in (_get(r, "excel", "tl12") for r in records) if v is not None]
    pop["excel_elasticity"] = [v for v in map(elasticity, records) if v is not None]
    return pop


def _inv(p):
    return None if p is None else 100 - p


def _mean_n(xs):
    xs = [x for x in xs if x is not None]
    return (round(sum(xs) / len(xs), 1), len(xs)) if xs else (None, 0)


RECOVER_STEP = 0.533  # un gradino dello strumento del test Ektelon (allungamento e recupero si leggono a scatti di ~0,53 punti percentuali)


def control_range(rec, pop, step=RECOVER_STEP):
    """Intervallo [min, max] dell'indice di controllo se le sue basi sbagliassero di quanto dichiarato: la rigidità stimata entro il suo
    margine (low/high) e allungamento e recupero di un gradino dello strumento. Estremi presi insieme: è un margine prudente, non una probabilità."""
    st = rec.get("stiffness")
    stiff_lo = stiff_hi = None
    if stiff_lab(rec) is not None:
        lo_v, hi_v = st.get("low", st["value_lbin"]), st.get("high", st["value_lbin"])
        stiff_lo, stiff_hi = percentile(lo_v, pop["stiff_measured"]), percentile(hi_v, pop["stiff_measured"])
    stretch, recover = _get(rec, "excel", "stretch_pct", 50), _get(rec, "excel", "recover_pct", 50)
    stretch_lo = stretch_hi = el_lo = el_hi = None
    if stretch is not None:
        # più allungamento = meno controllo: l'estremo basso è con più allungamento
        stretch_lo = _inv(percentile(stretch + step, pop["excel_stretch50"]))
        stretch_hi = _inv(percentile(max(0.0, stretch - step), pop["excel_stretch50"]))
    if stretch is not None and recover is not None and stretch > 0:
        el_lo = percentile(max(0.0, recover - step) / (stretch + step), pop["excel_elasticity"])
        el_hi = percentile(min(1.0, (recover + step) / max(stretch - step, step)), pop["excel_elasticity"])
    los, his = [x for x in (stiff_lo, stretch_lo, el_lo) if x is not None], [x for x in (stiff_hi, stretch_hi, el_hi) if x is not None]
    if not los:
        return None
    return [round(sum(los) / len(los), 1), round(sum(his) / len(his), 1)]


def dimensions(rec, pop):
    """Percentili 0–100 per dimensione (solo dati di laboratorio) e quante misure compongono tenuta e controllo."""
    stiff = percentile(stiff_lab(rec), pop["stiff_measured"])
    elast = percentile(elasticity(rec), pop["excel_elasticity"])
    durability, n_dur = _mean_n([
        _inv(percentile(_get(rec, "twu", "tension_loss_pct"), pop["twu_tension_loss"])),
        _inv(percentile(_get(rec, "excel", "tl6"), pop["excel_tl6"])),
        _inv(percentile(_get(rec, "excel", "tl12"), pop["excel_tl12"])),
        _inv(percentile(_get(rec, "excel", "static_24h_creep"), pop["excel_creep"]))])
    control, n_ctl = _mean_n([stiff, _inv(percentile(_get(rec, "excel", "stretch_pct", 50), pop["excel_stretch50"])), elast])
    return {"values": {"stiffness": stiff, "durability": durability, "control": control, "elasticity": elast,
                       "spin": percentile(spin_lab(rec), pop["spin_measured"])},
            "inputs": {"control": n_ctl, "durability": n_dur}}

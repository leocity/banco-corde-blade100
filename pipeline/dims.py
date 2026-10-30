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

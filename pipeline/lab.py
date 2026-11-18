"""Blocco `lab` di ogni corda: solo misure vere (v6 §5.1). Mai stime, mai abbinamenti proxy/probable."""
import statistics


def _src(sources, key, field):
    return ((sources or {}).get(key) or {}).get(field)


def lab_block(rec, sources):
    out = {"twu": None, "rp": None, "excel": None}
    t = rec.get("twu") or {}
    if t.get("match") == "exact":
        out["twu"] = {"stiffness": t.get("stiffness_lbin"), "loss": t.get("tension_loss_pct"), "spin": t.get("spin_potential"),
                      "ref_lbs": t.get("ref_tension_lbs"), "date": _src(sources, "twu", "fetched"), "url": _src(sources, "twu", "url")}
    rp = rec.get("rpedia") or {}
    if rp.get("match") == "exact" and rp.get("static_stiffness_kgmm") is not None:
        out["rp"] = {"kgmm": rp["static_stiffness_kgmm"], "date": _src(sources, "racketpedia", "fetched"),
                     "url": rp.get("url") or _src(sources, "racketpedia", "url")}
    ex = rec.get("excel")
    if ex:
        out["excel"] = {"stretch50": (ex.get("stretch_pct") or {}).get("50"), "recover50": (ex.get("recover_pct") or {}).get("50"),
                        "creep24": ex.get("static_24h_creep"), "date": _src(sources, "excel", "modified")}
    return out


def lab_meta(records):
    labs = [r.get("lab") or {} for r in records]
    xs = [l["excel"]["stretch50"] for l in labs if l.get("excel") and l["excel"].get("stretch50") is not None]
    return {"excel_stretch50_sd": round(statistics.stdev(xs), 3) if len(xs) > 1 else None,
            "n": {k: sum(1 for l in labs if l.get(k)) for k in ("twu", "rp", "excel")}}

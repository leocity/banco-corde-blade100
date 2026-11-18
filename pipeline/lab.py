"""Blocco `lab` di ogni corda: misure vere (v6 §5.1) e, a parte in `lab.est`, i valori ricavati e le stime.
Le misure stanno in twu/rp/excel; `est` vale solo dove la misura manca e dice sempre come è stato ricavato e con che margine:
- kind "ricavata": dallo stesso modello in altro calibro o colore, o dalla misura dell'altra fonte (Racketpedia -> scala TWU);
- kind "modello": stima statistica (solo mappa, mai confronti né consigli)."""
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
    out["est"] = est_block(rec, out)
    return out


def _range(lo, hi, v):
    return round(max(abs(v - lo), abs(hi - v)), 2) if lo is not None and hi is not None else None


def est_block(rec, lab):
    est = {}
    st, sp, t, rp = rec.get("stiffness") or {}, rec.get("spin") or {}, rec.get("twu") or {}, rec.get("rpedia") or {}
    twu = lab.get("twu") or {}
    if twu.get("stiffness") is None and st.get("value_lbin") is not None and st.get("kind") != "misurata":
        k = st.get("kind")
        if k == "parente":
            how = f"dallo stesso modello misurato da TWU in calibro {str(st.get('twu_gauge_mm') or '').replace('.', ',')} mm, corretto per il diametro"
            e = {"kind": "ricavata", "from": "twu"}
        elif k == "da Racketpedia":
            how = "dalla rigidità a riposo di Racketpedia, portata sulla scala TWU"
            e = {"kind": "ricavata", "from": "rp"}
        else:
            how = "dalla fisica, da calibro e materiale"
            e = {"kind": "modello", "from": "modello"}
        est["twu.stiffness"] = {**e, "v": st["value_lbin"], "margin": _range(st.get("low"), st.get("high"), st["value_lbin"]), "how": how}
    if twu.get("spin") is None and sp.get("value") is not None and sp.get("kind") in ("parente", "modello"):
        if sp["kind"] == "parente":
            est["twu.spin"] = {"kind": "ricavata", "from": "twu", "v": sp["value"], "margin": _range(sp.get("low"), sp.get("high"), sp["value"]),
                               "how": "dallo stesso modello misurato da TWU in un altro calibro o colore"}
        else:
            est["twu.spin"] = {"kind": "modello", "from": "modello", "v": sp["value"], "margin": _range(sp.get("low"), sp.get("high"), sp["value"]),
                               "how": "dalla fisica, da rigidità e forma"}
    if twu.get("loss") is None and t.get("match") in ("proxy", "probable") and t.get("tension_loss_pct") is not None:
        est["twu.loss"] = {"kind": "ricavata", "from": "twu", "v": t["tension_loss_pct"], "margin": 5.0,
                           "how": f"dalla riga TWU «{t.get('twu_name')}» (stesso modello, altro calibro o colore)"}
    if not lab.get("rp") and rp.get("match") == "proxy" and rp.get("static_stiffness_kgmm") is not None:
        est["rp.kgmm"] = {"kind": "ricavata", "from": "rp", "v": rp["static_stiffness_kgmm"], "margin": 0.05, "url": rp.get("url"),
                          "how": "dalla scheda Racketpedia dello stesso modello in altro colore o calibro"}
    return est


def lab_meta(records):
    labs = [r.get("lab") or {} for r in records]
    xs = [l["excel"]["stretch50"] for l in labs if l.get("excel") and l["excel"].get("stretch50") is not None]
    return {"excel_stretch50_sd": round(statistics.stdev(xs), 3) if len(xs) > 1 else None,
            "n": {k: sum(1 for l in labs if l.get(k)) for k in ("twu", "rp", "excel")}}

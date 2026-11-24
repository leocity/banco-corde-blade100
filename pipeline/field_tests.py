"""Registro delle prove di campo dell'utente (data/field_tests.json): schede di fine sessione con tensione dinamica (DT), snapback, intaglio
(notching), voti 1-5 e ore giocabili.

Sono misure e giudizi PERSONALI, fonte separata dal laboratorio: restano accanto ai dati di laboratorio (mai fusi, nessuna conversione) e non
entrano in punteggi, stime, ruolo ibrido o scelta della tensione. Servono a due cose: capire come va davvero ogni setup e confrontare, senza
mescolarli, il calo osservato con quello del laboratorio e le ore giocabili con l'ipotesi del piano.
Uso: python3 -m pipeline.field_tests   (valida e stampa il riepilogo)"""
import json
import pathlib
import re

from pipeline.hybrids import bed_of

ROOT = pathlib.Path(__file__).resolve().parent.parent
FEEL_KEYS = ("compactness_vs_confidential", "snapback_vs_otoro", "launch_angle", "flat_control", "arm_comfort")
FEEL_HELP = {"compactness_vs_confidential": "5 = piena e prevedibile come la Confidential 1,25; 1 = spugnosa come la Confidential Soft",
             "snapback_vs_otoro": "5 = scatto immediato delle verticali come la O-Toro 1,23; 1 = corde bloccate",
             "launch_angle": "1 = teso/basso; 3 = neutro; 5 = parabola troppo alta (launchy)",
             "flat_control": "5 = controllo massimo sul colpo piatto", "arm_comfort": "5 = braccio a posto"}
NOTCHING = {"low": "low", "medium": "medium", "deep": "deep", "trascurabile": "low", "medio": "medium", "profondo": "deep"}
VERDICTS = ("liked", "ok", "disliked")
ALERT_LOSS_PCT = 15.0  # soglia indicata dal piano (15-18%): ipotesi dell'utente, non una misura; cambiabile qui
HOUR_KEY = re.compile(r"^\d+h$")
ALLOWED = {"setup_id", "date", "mains", "cross", "tension_kg", "court_temp_c", "surface", "dt_log", "dt_unit", "feel_1_5", "snapback_check_8h", "snapback",
           "notching_8h", "notching", "playability_hours", "verdict", "note"}


def _num(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def validate_test(t, ids):
    """Errori di una scheda (lista vuota = valida). Gli id delle corde devono esistere in data/strings.json."""
    e, sid = [], t.get("setup_id") or "?"
    if not t.get("setup_id"):
        e.append("setup_id mancante")
    for k in set(t) - ALLOWED:
        e.append(f"{sid}: campo sconosciuto «{k}»")
    for k in ("mains", "cross"):
        if t.get(k) not in ids:
            e.append(f"{sid}: {k} sconosciuta ({t.get(k)})")
    kg = t.get("tension_kg")
    if not (isinstance(kg, list) and len(kg) == 2 and all(_num(v) and 15 <= v <= 30 for v in kg)):
        e.append(f"{sid}: tension_kg deve essere [verticali, orizzontali] tra 15 e 30 kg")
    if t.get("date") is not None and not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(t["date"])):
        e.append(f"{sid}: date deve essere AAAA-MM-GG")
    if t.get("court_temp_c") is not None and not (_num(t["court_temp_c"]) and -10 <= t["court_temp_c"] <= 50):
        e.append(f"{sid}: court_temp_c fuori da -10..50")
    dt = t.get("dt_log") or {}
    for k, v in dt.items():
        if not HOUR_KEY.match(k):
            e.append(f"{sid}: chiave dt_log «{k}» non valida (usa 0h, 24h, 4h, 8h, 12h…)")
        if v is not None and not (_num(v) and v > 0):
            e.append(f"{sid}: dt_log[{k}] deve essere un numero positivo o null")
    if any(v is not None for k, v in dt.items() if k != "0h") and dt.get("0h") is None:
        e.append(f"{sid}: dt_log ha misure ma manca la 0h (serve per il calo %)")
    feel = t.get("feel_1_5") or {}
    for k, v in feel.items():
        if k not in FEEL_KEYS:
            e.append(f"{sid}: voto sconosciuto «{k}»")
        elif v is not None and not (isinstance(v, int) and not isinstance(v, bool) and 1 <= v <= 5):
            e.append(f"{sid}: {k} deve essere un intero 1-5 o null")
    for k, v in ([("snapback_check_8h", t.get("snapback_check_8h"))] + list((t.get("snapback") or {}).items())):
        if v is not None and v not in (1, 2, 3):
            e.append(f"{sid}: snapback {k} deve essere 1, 2 o 3")
    for k, v in ([("notching_8h", t.get("notching_8h"))] + list((t.get("notching") or {}).items())):
        if v is not None and v not in NOTCHING:
            e.append(f"{sid}: notching {k} deve essere uno tra {sorted(set(NOTCHING))}")
    ph = t.get("playability_hours")
    if ph is not None and not (_num(ph) and 0 <= ph <= 200):
        e.append(f"{sid}: playability_hours deve essere un numero tra 0 e 200")
    if t.get("verdict") is not None and t["verdict"] not in VERDICTS:
        e.append(f"{sid}: verdict deve essere uno tra {VERDICTS}")
    return e


def dt_series(dt_log):
    """Calo % rispetto alla 0h per ogni misura. «24h» = 24 ore a riposo dopo la montata (assestamento), le altre = ore di gioco.
    Una misura più alta della 0h dà un calo negativo: si segnala (temperatura, strumento) invece di nasconderlo."""
    dt = dt_log or {}
    t0 = dt.get("0h")
    out = []
    if not t0:
        return out
    play = sorted((int(k[:-1]), k) for k in dt if k not in ("0h", "24h") and dt[k] is not None)
    keys = ([("riposo", 24, "24h")] if dt.get("24h") is not None else []) + [("gioco", h, k) for h, k in play]
    for kind, h, k in keys:
        out.append({"key": k, "kind": kind, "hours": h, "dt": dt[k], "loss_pct": round((1 - dt[k] / t0) * 100, 1)})
    return out


def hours_to_alert(series, limit=ALERT_LOSS_PCT):
    """Ore di gioco in cui il calo supera la soglia, per interpolazione tra le due misure vicine. None se non la raggiunge.
    Parte dalla 0h (calo 0); il calo a riposo delle 24h non è ore di gioco e non entra."""
    pts = [(0, 0.0)] + [(s["hours"], s["loss_pct"]) for s in series if s["kind"] == "gioco"]
    for (h0, l0), (h1, l1) in zip(pts, pts[1:]):
        if l1 >= limit > l0:
            return round(h0 + (h1 - h0) * (limit - l0) / (l1 - l0), 1)
    return None


def _mean(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 1) if xs else None


def analyze(tests, strings, plan=None):
    """Riepilogo per setup (stessa corda/tensione = stessa riga), con il confronto affiancato (mai fuso) tra calo osservato e dati di laboratorio."""
    by = {r["id"]: r for r in strings}
    plan_hours = {(e["main"], e["cross"]): e.get("ore_ipotesi") for e in (plan or {}).get("plan", []) if e.get("ore_ipotesi")}
    out, problems = [], []
    for t in tests:
        errs = validate_test(t, set(by))
        if errs:
            problems += errs
            continue
        series = dt_series(t.get("dt_log"))
        V, O = by[t["mains"]], by[t["cross"]]
        ref = None
        bed = bed_of(V, O, t["tension_kg"])
        if bed and bed["loss"]:
            ref = {"twu_o_ricavata_loss_pct": round(bed["loss"]["v"], 1), "tipo": "misura TWU" if bed["loss"]["est"] is None else "ricavata", "nota":
                   "TWU misura la perdita in prova di laboratorio (51 lb), la DT è la tua tensione dinamica dopo ore di gioco: non sono lo stesso numero e non si convertono"}
        ex = [V["excel"]] if V.get("excel") and V["id"] == O["id"] else []  # l'Excel vale per una corda sola: niente medie tra due
        feel = t.get("feel_1_5") or {}
        row = {
            "setup_id": t["setup_id"], "date": t.get("date"), "mains": t["mains"], "cross": t["cross"], "kg": t["tension_kg"], "verdict": t.get("verdict"),
            "temp_c": t.get("court_temp_c"), "surface": t.get("surface"), "dt": series,
            "loss_24h_riposo_pct": next((s["loss_pct"] for s in series if s["kind"] == "riposo"), None),
            "loss_ultima_pct": series[-1]["loss_pct"] if series else None, "ore_ultima_misura": series[-1]["hours"] if series else None,
            "ore_alla_soglia": hours_to_alert(series), "soglia_pct": ALERT_LOSS_PCT, "soglia_nota": "soglia del piano (15-18%), ipotesi non misura",
            "feel": {k: feel.get(k) for k in FEEL_KEYS if feel.get(k) is not None},
            "snapback_8h": t.get("snapback_check_8h"), "notching_8h": NOTCHING.get(t.get("notching_8h")),
            "ore_giocabili": t.get("playability_hours"), "ore_ipotesi_piano": plan_hours.get((t["mains"], t["cross"])),
            "laboratorio": ref,
            "excel": {"creep24": ex[0].get("static_24h_creep"), "tl6": ex[0].get("tl6"), "tl12": ex[0].get("tl12")} if ex else None,
            "note": t.get("note"),
        }
        out.append(row)
    sc = {}
    for r in out:
        s = sc.setdefault((r["mains"], r["cross"]), {"mains": r["mains"], "cross": r["cross"], "prove": 0, "verdetti": {}, "feel_medio": {}})
        s["prove"] += 1
        if r["verdict"]:
            s["verdetti"][r["verdict"]] = s["verdetti"].get(r["verdict"], 0) + 1
    for (m, c), s in sc.items():
        rows = [r for r in out if (r["mains"], r["cross"]) == (m, c)]
        s["feel_medio"] = {k: _mean([r["feel"].get(k) for r in rows]) for k in FEEL_KEYS if _mean([r["feel"].get(k) for r in rows]) is not None}
        s["ore_giocabili_medie"] = _mean([r["ore_giocabili"] for r in rows])
    return {"prove": out, "per_setup": list(sc.values()), "problems": problems,
            "regola": "Misure e giudizi personali: restano separati dal laboratorio, non entrano in punteggi, stime, ruolo ibrido né tensione consigliata."}


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def main():
    strings = _load("data/strings.json")["strings"]
    ft = _load("data/field_tests.json", {"tests": []})
    res = analyze(ft.get("tests", []), strings, _load("data/test_plan.json", {}))
    print(f"{len(res['prove'])} prove valide, {len(res['problems'])} problemi")
    for p in res["problems"]:
        print("PROBLEMA:", p)
    for r in res["prove"]:
        print(f"- {r['setup_id']}: {r['verdict'] or '—'}, calo 24h {r['loss_24h_riposo_pct']}, ultima {r['loss_ultima_pct']}, ore giocabili {r['ore_giocabili']}")
    return 1 if res["problems"] else 0


if __name__ == "__main__":
    raise SystemExit(main())

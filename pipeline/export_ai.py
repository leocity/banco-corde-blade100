"""Export snello per fare domande e simulazioni a un'AI in chat: dist/banco-corde-ai.json e dist/banco-corde-ai.md (ciascuno sotto 100 KB).

Contiene ancore, profilo racchetta, regole di calcolo, scorta, una scheda compatta per ogni corda attiva (misure, valori ricavati,
verdetto crosscheck, ruolo ibrido, tensione di partenza) e gli ibridi valutati. Niente testi di recensioni, forum o note: solo numeri.
Uso: python3 -m pipeline.export_ai   (si lancia anche alla fine di python3 -m pipeline.build)"""
import datetime
import json
import pathlib

from pipeline.derive import ANCHOR_TENSIONS, DEFAULT_DISLIKED, DEFAULT_LIKED, DISLIKED_GROUPS
from pipeline.hybrids import GOALS, W_COUNT, W_RANGE, W_SPIN_MAIN, build_hybrids, stock_counts

ROOT = pathlib.Path(__file__).resolve().parent.parent
MAX_BYTES = 100_000
EST_KEY = {"twu.stiffness": "k", "twu.loss": "l", "twu.spin": "s", "rp.kgmm": "rp"}  # una chiave per grandezza
KIND = {"ricavata": "r", "modello": "f"}  # r = ricavata da altri dati, f = ricavata dalla fisica
GOAL_NAME = {"same": "simile alla montata", "softer": "più morbida", "stiffer": "più rigida", "lower": "palla più bassa",
             "holds": "tiene di più la tensione", "spin": "più spin"}

RULES = {
    "fonti": "Misure: TWU (in campo, 51 lb, swing veloce: rigidità lb/in, perdita di tensione %, spin potenziale), Racketpedia (rigidità a riposo kg/mm), "
             "Excel Ektelon dell'utente (allungamento e recupero a 50 lb in %, tl6, tl12, scorrimento 24 h). Solo dati di laboratorio; recensioni e forum non entrano "
             "in nessun calcolo. Niente prezzi.",
    "tipi_di_valore": "Nella scheda: `tw`/`rp`/`ex` sono misure. `est` sono valori dove la misura manca: [valore, tipo, margine]; tipo r = ricavato da altri dati "
                      "(stesso modello in altro calibro o colore, o misura Racketpedia portata sulla scala TWU), f = ricavato dalla fisica (calibro e materiale per la "
                      "rigidità, rigidità e forma per lo spin, rigidità per la perdita di tensione: errore medio circa 7 punti). Dillo sempre quando usi un valore ricavato.",
    "twu_contestato": "`twf` presente = il TWU di quella corda è contestato dal controllo incrociato (abbinamento o dato): non usarlo, usa `est` (calcolato senza TWU); "
                      "profile_score è null e la tensione di partenza non è stimabile da TWU.",
    "confronti": "Simile sotto: rigidità 10%, perdita di tensione 5 punti, spin 0,5; nettamente sopra 15%, 10 punti, 1,0. Controllo e potenza non sono misure.",
    "letto": f"Rigidità alla tensione T: k51*(0,5+0,5*T/23,1) (23,1 kg = 51 lb). Letto = peso*verticali + (1-peso)*orizzontali con peso {W_COUNT:.3f} (16/35, un filo per filo); "
             f"nell'ibrido `range_k_now` mostra il risultato con pesi fino a {W_RANGE[-1]:.2f}. Spin: {int(W_SPIN_MAIN * 100)}% dalle verticali. Dopo il calo di tensione: "
             "T*(1-perdita%) per ogni filo; letto più rigido in campo = palla più bassa, più morbido = più alta (ipotesi dichiarata).",
    "ibridi": "Verticale rigida almeno quanto l'orizzontale (entro il 10%); un'orizzontale tonda aiuta lo scorrimento. Geometria = ipotesi, non misura (TWU non trova un "
              "legame prevedibile forma-attrito). Tenuta: TWU ed Excel non si fondono mai (nei dati non concordano). Tensione: coppia della preferita più vicina "
              "(+1 kg alle verticali) corretta per la rigidità equivalente, al massimo ±2 kg; un differenziale oltre 2 kg è una regola pratica.",
    "ruolo_ibrido": "hr = [ruolo, confidenza, punteggio -1 cross … +1 main]: da Racketpedia esatta, forma ed Excel (mai TWU, mai nel punteggio). Con solo Excel la confidenza è bassa.",
    "scorta": "matassina = 12 m, una racchetta intera; mezza = circa 6 m, metà di un ibrido; due mezze della stessa corda fanno una racchetta intera. "
              "Una corda con una sola mezza va solo in un ibrido.",
    "filtri": "Nel banco solo corde uscite dal 2020 in poi e ancora in produzione; le preferite restano sempre.",
    "chiavi": "id, n nome, mm calibro, f forma, mat materiale, tw {k rigidità lb/in, l perdita %, s spin}, rp kg/mm, ex {st50, rc50, tl6, tl12, cr}, est, cc verdetto "
              "crosscheck (confirmed/plausible/questionable/contradicted), twf, ps profile_score (solo laboratorio), hr, tk [kg verticali, orizzontali, fonte], "
              "fav, dw avviso non gradita, y anno, solo_catalogo = nessuna misura.",
}


def _n(x, d=1):
    return None if x is None else round(x, d)


def compact(r):
    lab, d = r.get("lab") or {}, r.get("derived") or {}
    out = {"id": r["id"], "n": f"{r['brand']} {r['model']} {r.get('gauge_label') or ''}".strip(), "mm": r.get("gauge_mm"), "f": r.get("shape")}
    if r.get("material"):
        out["mat"] = r["material"]
    t = lab.get("twu")
    if t:
        out["tw"] = {k: _n(v) for k, v in (("k", t.get("stiffness")), ("l", t.get("loss")), ("s", t.get("spin"))) if v is not None}
    if lab.get("rp"):
        out["rp"] = lab["rp"]["kgmm"]
    x, e = lab.get("excel"), r.get("excel") or {}
    if x:
        ex = {"st50": _n(x.get("stretch50")), "rc50": _n(x.get("recover50")), "tl6": e.get("tl6"), "tl12": e.get("tl12"), "cr": _n(x.get("creep24"), 2)}
        out["ex"] = {k: v for k, v in ex.items() if v is not None}
    est = {EST_KEY[k]: [_n(v["v"], 2 if k == "rp.kgmm" else 1), KIND[v["kind"]], _n(v.get("margin"), 2)] for k, v in (lab.get("est") or {}).items()}
    if est:
        out["est"] = est
    cc = (r.get("crosscheck") or {}).get("verdict")
    if cc:
        out["cc"] = cc
    if d.get("twu_flag"):
        out["twf"] = d["twu_flag"]["reason"]
    out["ps"] = d.get("profile_score")
    hr = d.get("hybrid_role") or {}
    if hr.get("role") and hr["role"] != "non valutabile":
        out["hr"] = [hr["role"], hr["confidence"], hr["score"]]
    ts = d.get("tension_start")
    if ts:
        out["tk"] = [ts["kg"][0], ts["kg"][1], ts.get("source")]
    fav = "liked" if r["id"] in DEFAULT_LIKED else "disliked" if r["id"] in DEFAULT_DISLIKED else None
    if fav:
        out["fav"] = fav
    if d.get("disliked_warning"):
        out["dw"] = d.get("disliked_reason")
    if (r.get("production") or {}).get("year"):
        out["y"] = r["production"]["year"]
    if not any(k in out for k in ("tw", "rp", "ex")):
        out["solo_catalogo"] = True
    return out


def _hy(h):
    s = h["stiffness"]
    out = {"main": h["main"], "cross": h["cross"], "kg": h["kg"], "k51": s["k51"], "k_now": s["k_now"], "k_after": s["k_after"], "range_k_now": s["range_k_now"],
           "delta_k51": s["delta_k51"], "affidabilita": s["reliability"], "spin": h["spin"], "loss": h["loss"], "geom": h["geometry"]["tag"],
           "tenuta": h["holding"]["verdict"], "tenuta_nota": h["holding"]["note"], "kg_consigliati": h["tension"]["kg"], "differenziale": h["tension"]["differential"],
           "vs_montata": [f"{v['label']}: {v['word']}" + (" (con valori ricavati)" if v["est"] else "") for v in h["vs_reference"] if v["dir"]], "avvisi": h["flags"] + h["tension"]["flags"]}
    for k in ("id", "status", "date", "note"):
        if h.get(k):
            out[k] = h[k]
    return out


def build_export(strings, inventory, inputs, data_meta=None, today=None):
    by = {r["id"]: r for r in strings}
    hyb = build_hybrids(strings, inputs, inventory)
    eq = (inventory or {}).get("equipped") or {}
    counts = stock_counts(inventory)
    anchors = [{"id": i, "kg": kg, "n": by[i]["model"] if i in by else i} for i, kg in ANCHOR_TENSIONS.items()]
    return {
        "versione": 1, "generato": (today or datetime.date.today()).isoformat(),
        "a_cosa_serve": "Dati del Banco Corde per fare domande e simulazioni sugli ibridi (verticali + orizzontali) della Wilson Blade 100 v9 16×19. "
                        "Rispondi solo con questi dati, cita i numeri e dichiara quando un valore è ricavato (est) o contestato (twf).",
        "racchetta": {"modello": "Wilson Blade 100 v9", "piatto": "16×19", "giocatore": "di club, tutto campo con rotazioni, swing sotto le 50 lbs, 4–5 ore a settimana"},
        "ancore": {"preferite": DEFAULT_LIKED, "non_gradite": DEFAULT_DISLIKED, "gruppi_non_graditi": [" ".join(v) for v in DISLIKED_GROUPS.values()],
                   "tensioni": anchors},
        "montata": {"id": eq.get("id"), "kg": eq.get("kg"), "dal": eq.get("since")},
        "regole": RULES,
        "inventario": [{"id": x["id"], "n": by[x["id"]]["model"] + " " + str(by[x["id"]].get("gauge_mm")) if x["id"] in by else x["id"], "size": x["size"], "qta": x["n"],
                        "intera": counts.get(x["id"], {}).get("matassina", 0) >= 1 or counts.get(x["id"], {}).get("mezza", 0) >= 2}
                       for x in (inventory or {}).get("stock", [])],
        "corde": [compact(r) for r in strings],
        "ibridi": {"valutati": [_hy(h) for h in hyb["evaluated"]],
                   "suggeriti_dalla_scorta": {GOAL_NAME[g]: [_hy(h) for h in hyb["suggested_from_stock"][g][:3]] for g in GOALS}},
        "fonti_dati": {k: v for k, v in (data_meta or {}).items()},
    }


def to_markdown(x):
    L = [f"# Banco Corde Blade 100 — dati per l'AI ({x['generato']})", "", x["a_cosa_serve"], "", f"**Racchetta:** {x['racchetta']['modello']} {x['racchetta']['piatto']}. "
         f"**Giocatore:** {x['racchetta']['giocatore']}.", f"**Montata:** {x['montata']['id']} a {x['montata']['kg']} kg (dal {x['montata']['dal']}).", "", "## Regole"]
    L += [f"- **{k}:** {v}" for k, v in x["regole"].items()]
    L += ["", "## Ancore", f"Preferite: {', '.join(x['ancore']['preferite'])}.", f"Non gradite: {', '.join(x['ancore']['non_gradite'])}.",
          "Tensioni di riferimento: " + "; ".join(f"{a['n']} {a['kg'][0]}/{a['kg'][1]} kg" for a in x["ancore"]["tensioni"]) + ".", "", "## Scorta (corde in casa)"]
    L += [f"- {i['id']}: {i['qta']} × {i['size']}" + (" (basta per una racchetta intera)" if i["intera"] else " (solo ibrido)") for i in x["inventario"]]
    L += ["", "## Corde (tw k/l/s = rigidità lb/in, perdita %, spin; est = ricavato: valore, r dati | f fisica; hr = ruolo ibrido)",
          "| id | mm | forma | tw k/l/s | rp | est | cc | twf | hr | tk | fav |", "|---|---|---|---|---|---|---|---|---|---|---|"]
    for c in x["corde"]:
        tw = c.get("tw") or {}
        est = " ".join(f"{k}:{v[0]}{v[1]}" for k, v in (c.get("est") or {}).items())
        L.append("| " + " | ".join(str(v) for v in (c["id"], c.get("mm") or "", c.get("f") or "", "/".join(str(tw.get(k, "")) for k in "kls") if tw else "", c.get("rp", ""), est,
                                                       c.get("cc", ""), c.get("twf", ""), "/".join(str(v) for v in c["hr"][:2]) if c.get("hr") else "",
                                                       "/".join(str(v) for v in c["tk"][:2]) if c.get("tk") else "", c.get("fav", ""))) + " |")
    L += ["", "## Ibridi valutati"]
    for h in x["ibridi"]["valutati"]:
        L.append(f"- **{h.get('id', '')}** {h['main']} + {h['cross']} a {h['kg']} kg ({h.get('status', '')}): rigidità k51 {h['k51']}, appena montata {h['k_now']} "
                 f"(intervallo {h['range_k_now']}), dopo il calo {h['k_after']}, Δ {h['delta_k51']}, affidabilità {h['affidabilita']}; spin {h['spin']}, geometria {h['geom']}, "
                 f"tenuta {h['tenuta']} ({h['tenuta_nota']}); tensione consigliata {h['kg_consigliati']}. " + " ".join(h["vs_montata"]))
    L += ["", "## Ibridi suggeriti dalla scorta"]
    for goal, hs in x["ibridi"]["suggeriti_dalla_scorta"].items():
        L.append(f"- **{goal}:** " + ("; ".join(f"{h['main']} + {h['cross']} {h['kg']} kg ({'; '.join(h['vs_montata'])})" for h in hs) or "nessuna coppia"))
    return "\n".join(L) + "\n"


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def write_export():
    data = _load("data/strings.json")
    meta = {"twu": data["sources"].get("twu"), "racketpedia": data["sources"].get("racketpedia"), "excel": data["sources"].get("excel"),
            "excel_rank": data["sources"].get("excel_rank"), "corde": len(data["strings"])}
    x = build_export(data["strings"], _load("data/inventory.json", {}), _load("data/hybrids_input.json", {}), meta)
    (ROOT / "dist").mkdir(exist_ok=True)
    js = json.dumps(x, ensure_ascii=False, separators=(",", ":"))
    md = to_markdown(x)
    (ROOT / "dist" / "banco-corde-ai.json").write_text(js + "\n", encoding="utf-8")
    (ROOT / "dist" / "banco-corde-ai.md").write_text(md, encoding="utf-8")
    return len(js.encode()), len(md.encode())


if __name__ == "__main__":
    sj, sm = write_export()
    print(f"dist/banco-corde-ai.json {sj / 1000:.1f} KB, dist/banco-corde-ai.md {sm / 1000:.1f} KB (limite {MAX_BYTES // 1000} KB)")
    raise SystemExit(0 if max(sj, sm) <= MAX_BYTES else 1)

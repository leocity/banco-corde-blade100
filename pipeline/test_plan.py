"""Piano di prove (data/test_plan.json) valutato con i dati del banco e verificato sulle corde disponibili.

Per ogni prova: rigidità equivalente, spin, perdita di tensione, tenuta, tensione calcolata dal progetto (confrontata con quella del piano)
e confronto con la corda montata; ogni numero dichiara se è misurato, ricavato o dalla fisica. Poi il bilancio delle mezze: quante
ne servono, da dove, quante restano (il piano promette «zero avanzi»: qui si controlla). Niente nei punteggi, nessun prezzo.
Uso: python3 -m pipeline.test_plan   (stampa il rapporto)"""
import json
import pathlib

from pipeline.hybrids import bed_of, evaluate_hybrid, make_context

ROOT = pathlib.Path(__file__).resolve().parent.parent
ORIGINS = ("casa", "in_arrivo", "da_comprare")
HALVES = {"matassina": 2, "mezza": 1}  # una matassina (12 m) = due mezze (6 m)


def halves_of(items):
    """{id: metà disponibili} da una lista [{id, size, n}]. Misure sconosciute: ignorate (le segnala validate_inventory_items)."""
    out = {}
    for x in items or []:
        k = HALVES.get(x.get("size"))
        if k and x.get("n", 0) >= 1:
            out[x["id"]] = out.get(x["id"], 0) + k * int(x["n"])
    return out


def incoming_halves(inventory):
    """Mezze in arrivo, dalle buste dell'ordine: ogni busta ha una mezza per lato (n buste = n mezze di verticali + n di orizzontali)."""
    out = {}
    for b in ((inventory or {}).get("incoming") or {}).get("bags", []):
        for k in ("main", "cross"):
            out[b[k]] = out.get(b[k], 0) + int(b.get("n", 1))
    return out


def validate(plan, strings):
    """Problemi del piano: id sconosciuti, origine non valida, full con corde diverse, tensioni malformate."""
    by = {r["id"] for r in strings}
    problems = []
    for e in plan.get("plan", []):
        i = e.get("id")
        for k in ("main", "cross"):
            if e.get(k) not in by:
                problems.append(f"{i}: corda sconosciuta ({e.get(k)})")
        if e.get("kind") == "full" and e.get("main") != e.get("cross"):
            problems.append(f"{i}: un full bed deve avere la stessa corda in verticali e orizzontali")
        if e.get("kind") == "hybrid" and e.get("main") == e.get("cross"):
            problems.append(f"{i}: un ibrido ha due corde diverse")
        if e.get("kind") not in ("full", "hybrid"):
            problems.append(f"{i}: kind deve essere full o hybrid")
        fr = e.get("from")
        if not (isinstance(fr, list) and len(fr) == 2 and all(o in ORIGINS for o in fr)):
            problems.append(f"{i}: `from` deve essere [origine verticali, origine orizzontali] tra {ORIGINS}")
        kg = e.get("kg_piano")
        if not (isinstance(kg, list) and len(kg) == 2 and all(isinstance(v, (int, float)) and 15 <= v <= 30 for v in kg)):
            problems.append(f"{i}: kg_piano deve essere [verticali, orizzontali] tra 15 e 30 kg")
    ids = [e.get("id") for e in plan.get("plan", [])]
    if len(set(ids)) != len(ids):
        problems.append("id di prova duplicati")
    return problems


def budget(plan, inventory):
    """Bilancio delle mezze. Ogni metà viene dall'origine dichiarata: casa = scorta, in_arrivo = carrello, da_comprare = da procurarsi.
    Un full usa 2 mezze della stessa corda, un ibrido 1 + 1. Restituisce per corda disponibili/servite/avanzi e le mancanze."""
    stock = halves_of((inventory or {}).get("stock"))
    cart = incoming_halves(inventory)
    need = {"casa": {}, "in_arrivo": {}, "da_comprare": {}}
    for e in plan.get("plan", []):
        for sid, origin in ((e["main"], e["from"][0]), (e["cross"], e["from"][1])):
            need[origin][sid] = need[origin].get(sid, 0) + 1  # una mezza per lato: il full bed usa la stessa corda due volte
    rows, short, left_cart = [], [], 0
    for sid in sorted(set(stock) | set(cart) | {s for d in need.values() for s in d}):
        r = {"id": sid, "stock": stock.get(sid, 0), "cart": cart.get(sid, 0), "need_stock": need["casa"].get(sid, 0),
             "need_cart": need["in_arrivo"].get(sid, 0), "to_buy": need["da_comprare"].get(sid, 0)}
        r["stock_left"] = r["stock"] - r["need_stock"]
        r["cart_left"] = r["cart"] - r["need_cart"]
        if r["stock_left"] < 0:
            short.append(f"{sid}: servono {r['need_stock']} mezze dalla scorta, ce ne sono {r['stock']}")
        if r["cart_left"] < 0:
            short.append(f"{sid}: servono {r['need_cart']} mezze dal carrello, ce ne sono {r['cart']}")
        if r["cart"]:
            left_cart += max(r["cart_left"], 0)
        if r["need_stock"] or r["need_cart"] or r["to_buy"] or r["cart"]:
            rows.append(r)
    return {"rows": rows, "short": short, "cart_halves": sum(cart.values()), "cart_halves_used": sum(cart.values()) - left_cart,
            "cart_halves_left": left_cart, "zero_leftovers": left_cart == 0 and not short,
            "to_buy": {s: {"mezze": n, "matassine": -(-n // 2)} for s, n in need["da_comprare"].items()}}


def evaluate_plan(strings, plan, inventory):
    """Ogni prova valutata con evaluate_hybrid contro la corda montata, più il bilancio delle mezze."""
    ctx = make_context(strings)
    by = ctx["by"]
    eq = (inventory or {}).get("equipped") or {}
    ref = by.get(eq.get("id"))
    ref_bed = bed_of(ref, ref, eq.get("kg") or [22, 21]) if ref else None
    problems = validate(plan, strings)
    rows = []
    for e in plan.get("plan", []):
        V, O = by.get(e.get("main")), by.get(e.get("cross"))
        if not V or not O:
            continue
        ev = evaluate_hybrid(V, O, e["kg_piano"], ref_bed, ctx)
        sug = ev["tension"]["kg"]
        s = ev["stiffness"]
        rows.append({
            "prio": e["prio"], "id": e["id"], "window": e["window"], "kind": e["kind"], "main": e["main"], "cross": e["cross"], "from": e["from"],
            "goal": e.get("goal"), "kg_piano": e["kg_piano"], "kg_calcolati": sug,
            "kg_scarto": [round(e["kg_piano"][0] - sug[0], 1), round(e["kg_piano"][1] - sug[1], 1)] if sug else None,
            "k51": s["k51"], "k_now": s["k_now"], "k_after": s["k_after"], "range_k_now": s["range_k_now"], "affidabilita": s["reliability"],
            "spin": ev["spin"], "spin_affidabilita": ev["spin_reliability"], "loss": ev["loss"],
            "geom": ev["geometry"]["tag"] if e["kind"] == "hybrid" else None, "tenuta": ev["holding"]["verdict"],
            "vs_montata": [f"{v['label']}: {v['word']}" for v in ev["vs_reference"] if v["dir"]],
            "avvisi": ev["flags"] + ev["tension"]["flags"],
            "loss_affidabilita": _kind_word((bed_of(V, O, e["kg_piano"]) or {}).get("loss")),
            "tenuta_nota": ev["holding"].get("note") or "", "kg_nota": ev["tension"].get("note") or "",
            "ore_ipotesi": e.get("ore_ipotesi"),
        })
    return {"rows": rows, "budget": budget(plan, inventory), "problems": problems}


def _kind_word(v):
    from pipeline.hybrids import KIND_WORD
    return KIND_WORD[v["est"]] if v else "mancante"


WINDOWS = {"subito": "Subito", "prima_del_pacco": "Prima che arrivi il pacco", "pacco": "Quando arriva il pacco",
           "ibridi_a": "Ibridi", "ibridi_b": "Ibridi", "ibridi_c": "Ibridi", "ibridi_d": "Ibridi", "ibridi_e": "Ibridi",
           "bassa": "Priorità bassa", "ultima": "Per ultima", "panchina": "In panchina (già in casa)"}


def order_key(inventory):
    """Chiave stabile dell'ordine in arrivo (la pagina ricorda così se l'hai già messo tra le corde in casa)."""
    inc = (inventory or {}).get("incoming") or {}
    return f"ordine-{inc.get('expected') or 'senza-data'}" if inc.get("bags") else None


def page_payload(strings, plan, inventory, field=None):
    """Quello che la scheda «Prove» della pagina mostra: piano valutato, bilancio delle mezze, ordine in arrivo, regole e
    schede di campo del file (sola lettura: quelle nuove l'utente le scrive nella pagina). Niente prezzi, niente punteggi."""
    from pipeline.field_tests import ALERT_LOSS_PCT, FEEL_HELP, analyze
    ev = evaluate_plan(strings, plan, inventory)
    inc = (inventory or {}).get("incoming") or {}
    ft = analyze((field or {}).get("tests", []), strings, plan)
    return {
        "rows": ev["rows"], "budget": ev["budget"], "problems": ev["problems"], "windows": WINDOWS,
        "alias": (plan or {}).get("alias", {}), "panchina": (plan or {}).get("panchina", []),
        "regole": (plan or {}).get("regole_dichiarate", []), "regole_nota": (plan or {}).get("_regole_nota", ""),
        "equipped": (inventory or {}).get("equipped"),
        "incoming": {"key": order_key(inventory), "status": inc.get("status"), "expected": inc.get("expected"),
                     "bags": [{k: b.get(k) for k in ("name", "n", "main", "cross", "note")} for b in inc.get("bags", [])],
                     "halves": incoming_halves(inventory)} if inc.get("bags") else None,
        "field_file": ft["prove"], "field_problems": ft["problems"],
        "alert_pct": ALERT_LOSS_PCT, "feel_help": FEEL_HELP,
    }


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def report(out):
    L = ["| prio | prova | setup | kg piano / calcolati | k 51 lb | k a tensione | dopo il calo | spin | perdita % | tenuta | dati |", "|---|---|---|---|---|---|---|---|---|---|---|"]
    for r in out["rows"]:
        calc = "/".join(str(v) for v in r["kg_calcolati"]) if r["kg_calcolati"] else "n.d."
        L.append(f"| {r['prio']} | {r['id']} | {r['main'].split('-17')[0]} / {r['cross'].split('-17')[0]} | {'/'.join(str(v) for v in r['kg_piano'])} / {calc} | "
                 f"{r['k51']} | {r['k_now']} | {r['k_after']} | {r['spin']} | {r['loss']} | {r['tenuta']} | {r['affidabilita']} |")
    b = out["budget"]
    L += ["", f"Mezze del carrello: {b['cart_halves']}, usate {b['cart_halves_used']}, avanzate {b['cart_halves_left']}."]
    L += [f"- {r['id']}: scorta {r['stock']}, carrello {r['cart']}; servono {r['need_stock']} dalla scorta, {r['need_cart']} dal carrello"
          + (f", {r['to_buy']} da procurarsi" if r["to_buy"] else "") + f"; avanzano {r['stock_left']} + {r['cart_left']}" for r in b["rows"]]
    L += [f"MANCA: {s}" for s in b["short"]] + [f"PROBLEMA: {p}" for p in out["problems"]]
    return "\n".join(L)


if __name__ == "__main__":
    out = evaluate_plan(_load("data/strings.json")["strings"], _load("data/test_plan.json", {}), _load("data/inventory.json", {}))
    print(report(out))
    raise SystemExit(1 if out["problems"] else 0)

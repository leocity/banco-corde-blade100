"""Piano di prove: validazione, bilancio delle mezze dell'ordine, valutazione con i dati del banco."""
import copy
import json
import pathlib

from pipeline.test_plan import budget, evaluate_plan, halves_of, incoming_halves, validate

ROOT = pathlib.Path(__file__).resolve().parent.parent
S = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))["strings"]
PLAN = json.loads((ROOT / "data/test_plan.json").read_text(encoding="utf-8"))
INV = json.loads((ROOT / "data/inventory.json").read_text(encoding="utf-8"))


def test_plan_file_is_valid():
    assert validate(PLAN, S) == []


def test_order_has_22_half_sets_in_11_bags_and_none_counts_as_stock():
    bags = INV["incoming"]["bags"]
    assert sum(b["n"] for b in bags) == 11 and sum(incoming_halves(INV).values()) == 22
    from pipeline.hybrids import stock_counts
    assert stock_counts(INV).get("toroline-o-toro-octa-16l") is None  # in arrivo non è scorta


def test_budget_uses_every_half_set_of_the_order_with_zero_leftovers():
    b = budget(PLAN, INV)
    assert b["cart_halves"] == 22 and b["cart_halves_used"] == 22 and b["cart_halves_left"] == 0 and b["zero_leftovers"]
    assert b["to_buy"] == {"head-lynx-tour-17": {"mezze": 3, "matassine": 2}}  # full bed #2 + ibrido Lynx/Snap: due matassine, non una


def test_without_the_second_snap_hybrid_one_snap_half_is_left_over():
    p = copy.deepcopy(PLAN)
    p["plan"] = [e for e in p["plan"] if e["id"] != "ib-lynx-snap"]
    b = budget(p, INV)
    assert b["cart_halves_left"] == 1 and not b["zero_leftovers"]
    assert b["to_buy"] == {"head-lynx-tour-17": {"mezze": 2, "matassine": 1}}


def test_shortage_is_reported_not_hidden():
    p = copy.deepcopy(PLAN)
    p["plan"].append({"prio": 13, "id": "extra", "window": "x", "kind": "full", "main": "toroline-o-toro-octa-16l", "cross": "toroline-o-toro-octa-16l",
                      "from": ["in_arrivo", "in_arrivo"], "kg_piano": [22, 21]})
    b = budget(p, INV)
    assert any("octa" in m and "servono 5" in m for m in b["short"]) and not b["zero_leftovers"]


def test_validation_catches_bad_rows():
    p = copy.deepcopy(PLAN)
    p["plan"][0]["main"] = "non-esiste"
    p["plan"][1]["cross"] = "toroline-o-toro-tour-17"  # full con corde diverse
    p["plan"][2]["from"] = ["casa", "negozio"]
    p["plan"][3]["kg_piano"] = [22]
    p["plan"].append(copy.deepcopy(p["plan"][4]))
    errs = " | ".join(validate(p, S))
    for frag in ("sconosciuta", "stessa corda", "`from`", "kg_piano", "duplicati"):
        assert frag in errs, frag


def test_halves_of_counts_a_skein_as_two_halves():
    assert halves_of([{"id": "a", "size": "matassina", "n": 1}, {"id": "a", "size": "mezza", "n": 3}, {"id": "b", "size": "boh", "n": 2}]) == {"a": 5}


def test_evaluation_is_labelled_by_data_quality():
    ev = {r["id"]: r for r in evaluate_plan(S, PLAN, INV)["rows"]}
    assert ev["full-o-toro-tour"]["affidabilita"] == "misurata" and ev["full-lynx-tour"]["affidabilita"] == "misurata"
    assert ev["full-octa"]["affidabilita"] == "dalla fisica"  # nessuna misura: la fisica, dichiarato
    assert abs(ev["full-o-toro-tour"]["k51"] - 216.6) < 0.1 and abs(ev["full-lynx-tour"]["k51"] - 217.7) < 0.1
    assert ev["full-o-toro-tour"]["kg_scarto"] == [0.0, 0.0]
    assert all(r["k_after"] < r["k_now"] for r in ev.values())  # il calo di tensione ammorbidisce sempre
    assert ev["ib-dreddy"]["geom"] and ev["full-octa"]["geom"] is None


def test_corrected_catalog_data():
    by = {r["id"]: r for r in S}
    assert "toroline-a5-17" not in by                       # il doppione 1,23 della A5 tonda è stato tolto
    assert by["toroline-a5-16l"]["gauge_mm"] == 1.25 and by["toroline-a5-spin-17"]["shape"] == "PENT"
    assert by["head-lynx-tour-17"]["shape"] == "HEX"        # corretta da RND
    eco = by["luxilon-eco-power-17"]
    assert eco["shape"] == "HEX" and eco["lab"]["twu"]["stiffness"] == 194.9 and eco["lab"]["rp"]["kgmm"] == 1.05

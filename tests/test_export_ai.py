"""dist/banco-corde-ai.json e .md: export snello per l'AI, sotto 100 KB, senza testi di recensioni, completo di scheda per ogni corda."""
import datetime
import json
import pathlib

from pipeline.export_ai import MAX_BYTES, build_export, to_markdown

ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
INV = json.loads((ROOT / "data/inventory.json").read_text(encoding="utf-8"))
INP = json.loads((ROOT / "data/hybrids_input.json").read_text(encoding="utf-8"))
X = build_export(DATA["strings"], INV, INP, {}, today=datetime.date(2026, 11, 24))
S = {r["id"]: r for r in DATA["strings"]}
C = {c["id"]: c for c in X["corde"]}
FORBIDDEN_KEYS = {"reviews", "indep_reviews", "community", "notes", "quote", "evidence", "sources", "urls", "note"}


def walk(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from walk(v)
    elif isinstance(o, list):
        for v in o:
            yield from walk(v)


def test_every_active_string_has_a_compact_card_and_ids_are_unique():
    assert len(X["corde"]) == len(DATA["strings"]) and len(C) == len(X["corde"])


def test_estimated_values_keep_stiffness_loss_and_spin_apart():
    est = C["re-string-slap-17"]["est"]
    assert set(est) == {"k", "l", "s"}  # una chiave per grandezza
    assert est["k"][1] == "r" and est["s"][1] == "f" and est["l"][1] == "f"
    assert est["k"][0] == round(S["re-string-slap-17"]["lab"]["est"]["twu.stiffness"]["v"], 1)
    rp_est = [c for c in X["corde"] if "rp" in c.get("est", {})]
    assert rp_est and all(c["est"]["rp"][1] == "r" for c in rp_est)  # la rigidità da ferma ricavata viene sempre da altre schede Racketpedia


def test_card_carries_lab_estimates_crosscheck_role_and_tension():
    zero = C["re-string-zero-17"]
    assert zero["rp"] == 1.05 and zero["ex"]["st50"] and zero["hr"][0] in ("main", "cross", "flessibile") and len(zero["tk"]) == 3
    assert C["solinco-confidential-16l"]["fav"] == "liked" and C["babolat-rpm-blast-17"]["fav"] == "disliked"
    snap = C["toroline-o-toro-snap-16l"]
    assert snap["cc"] == "contradicted" and snap["twf"] == "contestata" and snap["ps"] is None and snap["tk"][2] == "preferita"
    assert C["solinco-confidential-soft-17"]["dw"] == "modello"


def test_flagged_twu_values_are_present_but_labelled_and_the_alternative_is_there():
    snap = C["toroline-o-toro-snap-16l"]
    assert snap["tw"]["k"] == 164.6 and "k" in snap["est"]  # misura contestata + valore ricavato senza TWU


def test_strings_without_any_measure_are_marked():
    nom = [c for c in X["corde"] if c.get("solo_catalogo")]
    assert nom and all("tw" not in c and "rp" not in c and "ex" not in c for c in nom)


def test_no_review_forum_or_note_text_and_cards_are_short():
    assert not (set(walk(X["corde"])) & FORBIDDEN_KEYS)
    assert not (set(walk(X["ibridi"])) - {"note", "tenuta_nota"} & FORBIDDEN_KEYS)
    for c in X["corde"]:
        assert all(len(v) < 80 for v in c.values() if isinstance(v, str)), c["id"]


def test_inventory_profile_rules_and_hybrid_table_are_included():
    assert X["racchetta"]["piatto"] == "16×19" and X["montata"]["id"] == "re-string-slap-17"
    assert [i["id"] for i in X["inventario"]] == [s["id"] for s in INV["stock"]]
    wasabi = next(i for i in X["inventario"] if i["id"] == "toroline-wasabi-x-blue-17")
    assert wasabi["size"] == "mezza" and wasabi["qta"] == 3 and wasabi["intera"] is True  # tre mezze: bastano per una racchetta
    assert next(i for i in X["inventario"] if i["id"] == "toroline-wasabi-green-17")["intera"] is False  # una mezza sola
    assert {"fonti", "tipi_di_valore", "twu_contestato", "letto", "scorta", "ibridi"} <= set(X["regole"])
    assert [h["id"] for h in X["ibridi"]["valutati"]] == [h["id"] for h in INP["hybrids"]]
    assert set(X["ibridi"]["suggeriti_dalla_scorta"]) == {"simile alla montata", "più morbida", "più rigida", "palla più bassa", "tiene di più la tensione", "più spin"}
    assert all(h["range_k_now"] for h in X["ibridi"]["valutati"])


def test_sizes_are_under_100_kb_in_memory_and_in_the_built_files():
    js = json.dumps(X, ensure_ascii=False, separators=(",", ":")).encode()
    md = to_markdown(X).encode()
    assert len(js) < MAX_BYTES and len(md) < MAX_BYTES, (len(js), len(md))
    for name in ("banco-corde-ai.json", "banco-corde-ai.md"):
        built = ROOT / "dist" / name  # scritti da python3 -m pipeline.build
        assert built.exists() and built.stat().st_size < MAX_BYTES, name
    on_disk = json.loads((ROOT / "dist/banco-corde-ai.json").read_text(encoding="utf-8"))
    assert [c["id"] for c in on_disk["corde"]] == [c["id"] for c in X["corde"]]
    assert (ROOT / "dist/banco-corde-ai.md").read_text(encoding="utf-8").count("## ") >= 6

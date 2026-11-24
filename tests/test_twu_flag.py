"""Corde con verdetto crosscheck «contradicted»: il dato TWU contestato non entra in punteggio, tensione e stime."""
import copy
import json
import pathlib

from pipeline.derive import derive_all
from pipeline.twuflag import BLOCK_ISSUES, quarantine_twu, restore_twu, twu_flag
from tests.test_derive_v2 import lab

ROOT = pathlib.Path(__file__).resolve().parent.parent
NOTE = "Contraddetta: i test di gioco dicono il contrario della misura TWU."


def contested(i=4, issue=None, rp=None, match="exact"):
    r = lab(i)
    r["id"] = f"b-flag{i}-17"
    r["twu"]["match"] = match
    r["twu"]["twu_name"] = f"B Flag{i}"
    r["crosscheck"] = {"verdict": "contradicted", "note": NOTE, "sources": []}
    if issue:
        r["crosscheck"]["twu_issue"] = issue
    r["rpedia"] = rp
    return r


def population(extra):
    recs = [lab(i) for i in range(10)] + extra
    recs[0]["id"] = "solinco-confidential-16l"  # ancora per la tensione suggerita
    return recs


def test_flag_only_for_contradicted_records_with_twu_data():
    assert twu_flag(lab(1)) is None
    ok = lab(1); ok["crosscheck"] = {"verdict": "confirmed", "note": "", "sources": []}
    assert twu_flag(ok) is None
    nodata = contested(); nodata["twu"] = None
    assert twu_flag(nodata) is None
    f = twu_flag(contested())
    assert f["untrusted"] is True and f["reason"] == "contestata" and f["note"] == NOTE and f["twu_name"] == "B Flag4"


def test_reason_is_naming_when_the_twu_row_is_a_proxy_or_declared():
    assert twu_flag(contested(match="proxy"))["reason"] == "abbinamento"
    assert twu_flag(contested(issue="abbinamento"))["reason"] == "abbinamento"
    assert set(BLOCK_ISSUES) == {"abbinamento", "contestata"}


def test_quarantine_hides_and_restores_twu_stiffness_and_spin_and_is_idempotent():
    recs = [lab(1), contested()]
    before = copy.deepcopy(recs)
    q = quarantine_twu(recs)
    assert recs[1]["twu"] is None and recs[1]["stiffness"] is None and recs[1]["spin"] is None
    assert recs[0]["twu"] == before[0]["twu"]
    inner = quarantine_twu(recs)  # annidata: non c'è più nulla da nascondere
    assert inner == []
    restore_twu(recs, inner)
    assert recs[1]["twu"] is None
    restore_twu(recs, q)
    recs[1].pop("twu_flag")  # il flag resta sul record: serve a lab, ibridi ed export
    assert recs == before


def test_profile_score_is_null_and_flag_is_exposed_but_twu_is_left_in_the_record():
    recs = population([contested()])
    plain = copy.deepcopy(recs[-1]); plain["crosscheck"]["verdict"] = "plausible"
    derive_all(recs, {})
    d = recs[-1]["derived"]
    assert d["profile_score"] is None
    assert d["twu_flag"]["untrusted"] is True and d["twu_flag"]["reason"] == "contestata"
    assert recs[-1]["twu"]["stiffness_lbin"] is not None  # il blocco non cancella il dato dal record
    ok = population([plain])
    derive_all(ok, {})
    assert ok[-1]["derived"]["profile_score"] is not None  # senza il verdetto il punteggio c'è
    assert ok[-1]["derived"]["twu_flag"] is None


def test_tension_start_without_reliable_data_says_it_cannot_be_estimated_from_twu():
    recs = population([contested()])
    derive_all(recs, {})
    t = recs[-1]["derived"]["tension_start"]
    assert t["estimable_from_twu"] is False and t["source"] == "preferita"
    assert "non stimabile da TWU" in t["note"] and NOTE.split(":")[0] in t["note"] or "contestat" in t["note"]
    assert t["kg"] == [22, 21] or t["kg"] == [23, 22]


def test_tension_start_falls_back_on_exact_racketpedia_only():
    rp = {"match": "exact", "static_stiffness_kgmm": 1.0, "url": "u"}
    recs = population([contested(rp=rp)])
    recs[-1]["stiffness"] = None  # in build la stima TWU-free arriva da Racketpedia
    recs[-1]["stiffness"] = {"value_lbin": 210.0, "low": 199.0, "high": 221.0, "kind": "da Racketpedia"}
    derive_all(recs, {})
    t = recs[-1]["derived"]["tension_start"]
    assert t["estimable_from_twu"] is False and t["source"] == "racketpedia" and "Racketpedia" in t["note"]
    proxy = population([contested(rp={"match": "proxy", "static_stiffness_kgmm": 1.0})])
    proxy[-1]["stiffness"] = {"value_lbin": 210.0, "low": 199.0, "high": 221.0, "kind": "da Racketpedia"}
    derive_all(proxy, {})
    assert proxy[-1]["derived"]["tension_start"]["source"] == "preferita"  # abbinamento non esatto: nessun fallback


def test_built_data_blocks_the_three_contradicted_strings_but_keeps_lab_twu():
    data = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
    S = {r["id"]: r for r in data["strings"]}
    ids = ["babolat-rpm-blast-16l", "grapplesnake-alpha-17", "toroline-o-toro-snap-16l"]
    for i in ids:
        d = S[i]["derived"]
        assert d["twu_flag"]["untrusted"] is True, i
        assert d["profile_score"] is None, i
        assert d["tension_start"]["estimable_from_twu"] is False, i
        assert S[i]["stiffness"]["kind"] != "misurata", i  # nessuna stima poggia sul TWU contestato
    assert S["toroline-o-toro-snap-16l"]["lab"]["twu"]["stiffness"] == 164.6  # la pagina continua a vedere il dato TWU
    assert S["toroline-o-toro-snap-16l"]["derived"]["tension_start"]["source"] == "preferita"
    assert S["grapplesnake-alpha-17"]["derived"]["tension_start"]["source"] == "racketpedia"
    assert all(r["derived"]["twu_flag"] is None for r in data["strings"] if r["id"] not in ids)


def test_derived_loss_of_a_contested_string_comes_from_its_twu_free_stiffness():
    data = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
    lm = data["lab_meta"]["loss_model"]
    for r in data["strings"]:
        if r["id"] in ("toroline-o-toro-snap-16l", "grapplesnake-alpha-17"):
            est = r["lab"]["est"]
            assert est["twu.loss"]["kind"] == "modello"
            assert est["twu.loss"]["v"] == round(lm["a"] + lm["b"] * est["twu.stiffness"]["v"], 1), r["id"]

import json

from pipeline.provenance import provenance, record_source

SOURCES = {"twu": {"fetched": "2026-10-09", "url": "https://twu/r"}, "twu_compare": {"fetched": "2026-10-28", "url": "https://twu/c"},
           "racketpedia": {"fetched": "2026-10-09", "url": "https://rp"}, "excel": {"file": "chart.xlsx", "modified": "2026-08-26"}}


def rec(stiff_kind="misurata", spin_kind="misurato", match="exact", **kw):
    r = {"id": "x", "twu": {"twu_name": "B M 17", "match": match, "ref_tension_lbs": 51, "swing": "Fast", "stiffness_lbin": 200.0,
                            "tension_loss_pct": 30.0, "spin_potential": 7.0, "energy_return_pct": 88.0, "cof_string_string": 0.09,
                            "cof_string_ball": 0.6},
         "rpedia": {"static_stiffness_kgmm": 1.0, "url": "https://rp/x"}, "excel": None,
         "stiffness": {"value_lbin": 200.0, "low": 190.0, "high": 210.0, "kind": stiff_kind},
         "spin": {"value": 7.0, "low": 6.5, "high": 7.5, "kind": spin_kind}}
    r.update(kw)
    return r


def test_stiffness_kinds():
    p = provenance(rec(), SOURCES, {})
    assert p["stiffness"] == {"source": "TWU", "fetched": "2026-10-09", "conditions": "51 lbs, swing veloce", "kind": "misurato",
                              "margin": None, "url": "https://twu/r"}
    assert provenance(rec("parente"), SOURCES, {})["stiffness"]["kind"] == "da calibro gemello, corretto per il diametro"
    assert provenance(rec("parente"), SOURCES, {})["stiffness"]["margin"] == 10.0
    rp = provenance(rec("da Racketpedia"), SOURCES, {})["stiffness"]
    assert rp["kind"] == "da Racketpedia convertita" and rp["source"] == "Racketpedia" and rp["url"] == "https://rp/x"
    gem = provenance(rec("da Racketpedia", stiffness={"value_lbin": 200.0, "low": 185.0, "high": 215.0, "kind": "da Racketpedia", "via": "gemello"}), SOURCES, {})
    assert gem["stiffness"]["kind"] == "da Racketpedia di un calibro gemello, corretta per il diametro"
    m = provenance(rec("modello"), SOURCES, {})["stiffness"]
    assert m["kind"] == "stima da modello" and m["source"] == "stima dal calibro" and m["fetched"] is None


def test_spin_kinds():
    assert provenance(rec(), SOURCES, {})["spin"]["kind"] == "misurato"
    par = provenance(rec(spin_kind="parente"), SOURCES, {})["spin"]
    assert par["kind"] == "da calibro o colore gemello" and par["margin"] == 0.5
    mod = provenance(rec(spin_kind="modello"), SOURCES, {})["spin"]
    assert mod["kind"] == "stima da modello" and mod["source"] == "stima da rigidità e forma"


def test_twu_fields_and_absent():
    p = provenance(rec(), SOURCES, {})
    assert p["energy_return"]["source"] == "TWU Compare" and p["energy_return"]["fetched"] == "2026-10-28"
    assert p["tension_loss"]["kind"] == "misurato"
    assert provenance(rec(match="proxy"), SOURCES, {})["tension_loss"]["kind"] == "da calibro gemello"
    r = rec()
    r["twu"]["energy_return_pct"] = None
    assert "energy_return" not in provenance(r, SOURCES, {})
    assert "excel" not in provenance(rec(), SOURCES, {})
    assert provenance(rec(excel={"tl6": 10}), SOURCES, {})["excel"]["fetched"] == "2026-08-26"
    none = provenance({"id": "c", "twu": None, "rpedia": None, "excel": None, "stiffness": None, "spin": None}, SOURCES, {})
    assert none == {}


def test_record_source_keeps_other_keys(tmp_path):
    path = tmp_path / "sources.json"
    path.write_text(json.dumps({"racketpedia": {"fetched": "2026-10-09", "url": "u"}}), encoding="utf-8")
    record_source("twu", url="https://twu", path=path, today="2026-10-28")
    record_source("excel", file="a.xlsx", modified="2026-08-26", path=path)
    d = json.loads(path.read_text(encoding="utf-8"))
    assert d == {"racketpedia": {"fetched": "2026-10-09", "url": "u"}, "twu": {"fetched": "2026-10-28", "url": "https://twu"},
                 "excel": {"file": "a.xlsx", "modified": "2026-08-26"}}

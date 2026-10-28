import pathlib

import pytest

from pipeline.twu_compare import consistent, merge_compare, parse_compare, parse_options

FIX = pathlib.Path(__file__).parent / "fixtures" / "twu_compare_options.html"
# risposta reale di similarstringcompare.php del 2026-10-28
REAL = ('{"pcode1":"YPTS125","material1":"Polyester","brand1":"Yonex","string1":"Poly Tour Spin 16L (1.25)","stiffness1":"214",'
        '"tension1":"27","energy1":"89","COFstatic1":"0.1","COFball1":"0.632","ratio1":"6.3","current1":"yes","pcode":"YPTP125",'
        '"material":"Polyester","brand":"Yonex","string":"Poly Tour Pro Yellow 16L (1.25)","stiffness":"181","tension":"47",'
        '"energy":"86","COFstatic":"NA","COFball":"NA","ratio":"NA","current":"yes","scode1":"none","scode2":"none"}')


def test_parse_options_first_list_and_spaces():
    o = parse_options(FIX.read_text(encoding="utf-8"))
    assert o["Yonex Poly Tour Spin 16L (1.25)"] == "YPTS125"
    assert o["Solinco Confidential 16 (1.30)"] == "SCON16"  # spazi doppi normalizzati
    assert o["Luxilon ALU Power 16L (1.25)"] == "LXALU16L"
    assert "Solo nella seconda lista" not in o and len(o) == 10


def test_parse_compare_real_payload():
    row = parse_compare(REAL)
    assert row == {"pcode": "YPTS125", "material": "Polyester", "stiffness_lbin": 214.0, "tension_loss_pct": 27.0,
                   "energy_return_pct": 89.0, "cof_string_string": 0.1, "cof_string_ball": 0.632, "spin_potential": 6.3}


def test_parse_compare_na_and_errors():
    row = parse_compare(REAL.replace('"COFstatic1":"0.1"', '"COFstatic1":"NA"').replace('"ratio1":"6.3"', '"ratio1":""'))
    assert row["cof_string_string"] is None and row["spin_potential"] is None
    with pytest.raises(ValueError):
        parse_compare("<html>errore</html>")
    with pytest.raises(ValueError):
        parse_compare('{"pcode":"X"}')


def test_consistent():
    twu = {"stiffness_lbin": 214.3, "spin_potential": 6.3}
    assert consistent({"stiffness_lbin": 214.0, "spin_potential": 6.35}, twu)
    assert not consistent({"stiffness_lbin": 219.0, "spin_potential": 6.3}, twu)
    assert not consistent({"stiffness_lbin": 214.0, "spin_potential": 6.6}, twu)
    assert consistent({"stiffness_lbin": 214.0, "spin_potential": None}, twu)


def _rec(id_, match, stiff=214.0, name="Yonex Poly Tour Spin 16L (1.25)"):
    return {"id": id_, "twu": {"twu_name": name, "match": match, "stiffness_lbin": stiff, "spin_potential": 6.3}}


def test_merge_compare_only_measured_and_consistent():
    cmp = {"Yonex Poly Tour Spin 16L (1.25)": parse_compare(REAL)}
    recs = [_rec("ok", "exact"), _rec("prox", "proxy"), _rec("bad", "exact", stiff=219.0), {"id": "none", "twu": None},
            _rec("missing", "exact", name="Assente 17")]
    out, anomalies = merge_compare(recs, cmp)
    by = {r["id"]: r for r in out}
    assert by["ok"]["twu"]["energy_return_pct"] == 89.0 and by["ok"]["twu"]["cof_string_ball"] == 0.632
    assert by["ok"]["twu"]["twu_pcode"] == "YPTS125"
    for k in ("prox", "bad", "missing"):
        assert by[k]["twu"]["energy_return_pct"] is None and by[k]["twu"]["cof_string_string"] is None
    assert by["none"]["twu"] is None
    assert anomalies == ["bad"]

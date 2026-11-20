"""La List Rank di Kerry Hlady del 7/10/2026 confrontata con lo String chart del 26/8/2026."""
import pathlib

from pipeline.excel_rank_diff import diff, parse_chart, parse_rank

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_october_rank_against_august_chart():
    res = diff(parse_rank(ROOT / "data/source/list_rank_oct72026.xlsx"), parse_chart())
    assert res["poly"] >= 270
    assert res["new"] == [("neverfault", "max power", "17"), ("neverfault", "snap bite", "16l")]
    assert [k for k, _, _ in res["changed"]] == [("tecnifibre", "razor", "17")]
    # nessuna differenza per le marche dell'utente
    assert not [k for k in res["new"] + [c[0] for c in res["changed"]] if k[0] in ("toroline", "solinco", "re string")]

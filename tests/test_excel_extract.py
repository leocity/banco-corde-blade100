import os
import pytest
from pipeline.excel_extract import load_excel, load_rows

XLSX = os.environ.get("XLSX", "F:/Users/Leo/Downloads/String chart Aug 262026.xlsx")


@pytest.fixture(scope="module")
def recs():
    return {r["id"]: r for r in load_excel(XLSX)}


def test_otoro_present_and_hex(recs):
    assert recs["toroline-o-toro-17"]["shape"] == "HEX"


def test_revolve_spin_tension_loss(recs):
    ex = recs["wilson-revolve-spin-16"]["excel"]
    assert ex["tl6"] == 10 and ex["tl12"] == 27


def test_rpm_blast_17_tl6(recs):
    assert recs["babolat-rpm-blast-17"]["excel"]["tl6"] == 20


def test_confidential_16l_present(recs):
    assert "solinco-confidential-16l" in recs


def test_stretch_pct_from_ratio(recs):
    # O-Toro 17: ratio stored in col 7 → (ratio-1)*100
    ex = recs["toroline-o-toro-17"]["excel"]
    assert 0 < ex["stretch_pct"][40] < 15
    assert ex["stretch_pct"][65] >= ex["stretch_pct"][40]


def test_only_poly_materials(recs):
    assert {r["material"] for r in recs.values()} <= {"poly", "copoly"}


def test_out_of_scope_excluded(recs):
    assert "babolat-rpm-power-16l" not in recs
    assert "solinco-hyper-g-18" not in recs


def _row(lbs, typ="copoly", tl6=None):
    r = [None] * 26
    r[:12] = ["Solinco", "Test", "17", typ, "RND", lbs, 11.5, 1.0222, 11.3, 1.0044, 0.2, 1.78]
    r[20] = tl6
    return tuple(r)


def test_partial_group_does_not_crash(capsys):
    rows = [_row(40), _row(50, tl6=12), _row(60), _row(65, typ=None)]
    out = load_rows(rows[:3]) + load_rows([rows[3]])
    recs = {r["id"]: r for r in out}
    assert recs["solinco-test-17"]["excel"]["tl6"] == 12
    assert recs["solinco-test-17"]["excel"]["stretch_pct"][65] is None
    assert "warning" in capsys.readouterr().err.lower()


def test_rpm_rough_is_a_different_product_out_of_scope(recs):
    # RPM Rough (gear) è un prodotto diverso da RPM Blast Rough: non va unificato
    assert "babolat-rpm-blast-rough-16l" not in recs and "babolat-rpm-rough-16l" not in recs


def test_zero_tension_loss_treated_as_not_measured(recs):
    ex = recs["solinco-hyper-g-17"]["excel"]
    assert ex["tl6"] is None and ex["tl6_raw"] == 0
    assert ex["tl12"] == 21


def test_group_with_two_test_sets_warns_and_flags(capsys):
    rows = [_row(t) for t in (40, 50, 60, 65)] + [_row(t) for t in (40, 50, 60, 65)]
    out = load_rows(rows)
    assert out[0]["excel"]["extra_test_sets"] == 1
    assert "set" in capsys.readouterr().err.lower()

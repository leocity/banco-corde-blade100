import pathlib
import pytest
from pipeline.twu_extract import parse_twu, parse_name

HTML = pathlib.Path(__file__).parent / "fixtures" / "twu_snapshot.html"


@pytest.fixture(scope="module")
def rows():
    return {r["twu_name"]: r for r in parse_twu(HTML.read_text(encoding="utf-8", errors="ignore"))}


def test_row_count(rows):
    assert len(rows) > 400


def test_hyper_g_16l(rows):
    r = rows["Solinco Hyper-G 16L (1.25)"]
    assert r["gauge_mm"] == 1.25 and r["gauge_label"] == "16L"
    assert isinstance(r["stiffness_lbin"], float)


def test_otoro_values(rows):
    r = rows["Toroline O-Toro 17 (1.23)"]
    assert r["gauge_mm"] == 1.23 and r["stiffness_lbin"] == 165.7 and r["tension_loss_pct"] == 44.4
    assert r["ref_tension_lbs"] == 51 and r["swing"] == "Fast"
    assert r["id"] == "toroline-o-toro-17"


def test_numbers_are_numbers(rows):
    for r in rows.values():
        for k in ("stiffness_lbin", "tension_loss_pct", "spin_potential"):
            assert r[k] is None or isinstance(r[k], float)


@pytest.mark.parametrize("name,brand,model,label,mm", [
    ("Luxilon ALU Power 125/16L", "Luxilon", "ALU Power", "16L", 1.25),
    ("Kirschbaum Competition 16/1.30", "Kirschbaum", "Competition", "16", 1.30),
    ("Grapplesnake Tour Sniper 1.25", "Grapplesnake", "Tour Sniper", "16L", 1.25),
    ("Solinco Tour Bite 16 Soft", "Solinco", "Tour Bite Soft", "16", 1.30),
    ("Babolat RPM Blast 17/1.25", "Babolat", "RPM Blast", "17", 1.25),
    ("Signum Pro Poly-Plasma 17L (1.18)", "Signum Pro", "Poly-Plasma", "17L", 1.18),
    ("Yonex PolyTour REV 16 (1.30)", "Yonex", "Poly Tour REV", "16", 1.30),
    ("Head Lynx Touch 16g (1.30)", "Head", "Lynx Touch", "16", 1.30),
])
def test_parse_name(name, brand, model, label, mm):
    assert parse_name(name) == (brand, model, label, mm)


def test_ids_are_unique():
    rows = parse_twu(HTML.read_text(encoding="utf-8", errors="ignore"))
    ids = [r["id"] for r in rows]
    assert len(ids) == len(set(ids))

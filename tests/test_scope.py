from pipeline.scope import (normalize_brand, normalize_model, normalize_gauge,
                            gauge_to_mm, in_scope, string_id, is_target, is_competitor)


def test_brand_aliases():
    assert normalize_brand("Wlson") == "Wilson"
    assert normalize_brand("Grapplesnake   Cube") == "Grapplesnake"
    assert normalize_brand("Re-String") == "Re-String"
    assert normalize_brand("Restring") == "Re-String"
    assert normalize_brand("Krischbaum") == "Kirschbaum"


def test_model_typos_and_spacing():
    assert normalize_model("Confidental") == "Confidential"
    assert normalize_model(" Revolve Spin  ") == "Revolve Spin"
    assert normalize_model("Hyper-G-Soft") == normalize_model("Hyper G Soft")


def test_gauge_labels_heterogeneous():
    assert normalize_gauge("16l") == "16L"
    assert normalize_gauge(17) == "17"
    assert normalize_gauge("17L") == "17L"
    assert normalize_gauge(None) is None


def test_gauge_to_mm():
    assert gauge_to_mm("17", 1.23) == 1.23
    assert gauge_to_mm("16L") == 1.25
    assert gauge_to_mm("16") == 1.30
    assert gauge_to_mm("18") is None


def test_scope_babolat_only_rpm_blast():
    assert in_scope("Babolat", "RPM Blast", "17", "copoly") is True
    assert in_scope("Babolat", "RPM Blast Rough", "16", "copoly") is True
    assert in_scope("Babolat", "RPM Power", "16L", "copoly") is False


def test_scope_gauge_and_material():
    assert in_scope("Solinco", "Hyper-G", "18", "poly") is False
    assert in_scope("Solinco", "Vanquish", "16", "multi") is False
    assert in_scope("Solinco", "Hyper-G", "17L", "poly") is True


def test_scope_competitors():
    assert in_scope("Luxilon", "ALU Power", "16L", "copoly") is True
    assert in_scope("Luxilon", "Savage", "16", "copoly") is False
    assert is_competitor("Yonex", "Poly Tour Pro") is True
    assert is_competitor("Kirschbaum", "Max Power") is True
    assert is_target("Wilson", "Revolve Spin") is True
    assert is_target("Wilson", "NXT") is False


def test_string_id():
    assert string_id("Solinco", "Confidential", "16L") == "solinco-confidential-16l"
    assert string_id("Toroline", "O-Toro", "17") == "toroline-o-toro-17"

from pipeline.validate_indices import index_validation, is_brand, spearman


def rec(i, control, lvl, brand=False, mismatch=False):
    return {"id": f"s{i}", "derived": {"dims": {"control": control, "stiffness": control, "durability": None, "spin": None}},
            "reviews": {"sources": [{"site": "shoprestring.com (brand)" if brand else "tennisnerd.net", "note": "", "gauge_mismatch": mismatch,
                                     "levels": {"control": lvl, "power": None, "comfort": None, "spin": None, "durability": None, "stiffness": None}}]}}


def test_spearman_known_values():
    assert spearman([1, 2, 3, 4], [10, 20, 30, 40]) == 1.0
    assert spearman([1, 2, 3, 4], [4, 3, 2, 1]) == -1.0
    assert spearman([1, 2, 3], [1, 2, 3]) is None  # troppo pochi


def test_is_brand_by_site_or_note():
    assert is_brand({"site": "shoprestring.com (brand)", "note": ""})
    assert is_brand({"site": "x", "note": "Brand copy: ... Marketing claim."})
    assert not is_brand({"site": "tennisnerd.net", "note": "tested in the lab"})


def test_index_validation_uses_only_independent_same_gauge_sources():
    recs = [rec(i, 10 * i, i) for i in range(1, 9)]
    recs.append(rec(9, 90, 1, brand=True))          # marketing: ignorata
    recs.append(rec(10, 100, 1, mismatch=True))     # altro calibro: ignorata
    v = index_validation(recs)["control"]
    assert (v["n"], v["rho"]) == (8, 1.0)


def test_power_is_not_an_index_and_small_n_is_none():
    recs = [rec(i, 10 * i, i) for i in range(1, 9)]
    assert "power" not in index_validation(recs)  # la potenza non è un indice di laboratorio: viene dai tester
    few = index_validation(recs[:4])["control"]
    assert few["rho"] is None and few["n"] == 4

from pipeline.dims import DIM_KEYS, dim_populations, dimensions, elasticity, excel_measures


def rec(i, twu=True, excel=True, spin_kind="misurato", stiff_kind="misurata"):
    st, sp = 170.0 + 8 * i, 4.0 + 0.6 * i
    return {"id": f"b-m{i}-17", "brand": "B", "model": f"M{i}", "gauge_mm": 1.25, "shape": "RND", "preference": None,
            "twu": {"match": "exact", "stiffness_lbin": st, "tension_loss_pct": 20.0 + 3 * i, "spin_potential": sp} if twu else None,
            "excel": {"stiff_index_avg": 2.0 + 0.2 * i, "stretch_pct": {"50": 5.0 - 0.2 * i}, "recover_pct": {"50": 1.0 + 0.1 * i},
                      "tl6": 10.0 + i, "tl12": 15.0 + i, "static_24h_creep": 0.3 + 0.02 * i} if excel else None,
            "rpedia": None,
            "spin": {"value": sp, "low": sp, "high": sp, "kind": spin_kind, "basis_n": 1},
            "stiffness": {"value_lbin": st, "low": st, "high": st, "kind": stiff_kind}}


def pop10():
    return dim_populations([rec(i) for i in range(10)])


def test_dim_keys():
    assert DIM_KEYS == ("stiffness", "durability", "control", "elasticity", "spin")


def test_elasticity_ratio():
    r = {"excel": {"stretch_pct": {"50": 4.0}, "recover_pct": {"50": 1.0}}}
    assert elasticity(r) == 0.25


def test_elasticity_none_when_missing_or_zero_stretch():
    assert elasticity({"excel": {"stretch_pct": {"50": 4.0}, "recover_pct": {}}}) is None
    assert elasticity({"excel": {"stretch_pct": {"50": 0}, "recover_pct": {"50": 1.0}}}) is None
    assert elasticity({"excel": None}) is None


def test_excel_measures_none_without_excel():
    assert excel_measures(rec(0, excel=False)) is None


def test_excel_measures_fields():
    m = excel_measures(rec(0))
    assert m == {"stretch50": 5.0, "elasticity": 0.2, "cedimento": 2.0, "tl6": 10.0, "tl12": 15.0, "creep24": 0.3}


def test_durability_averages_independent_sources():
    d = dimensions(rec(0), pop10())
    assert d["values"]["durability"] == 95.0  # tutte e 4 le fonti al minimo di perdita
    assert d["inputs"]["durability"] == 4
    only_tl6 = rec(0, twu=False)
    only_tl6["excel"] = {"tl6": 10.0, "tl12": None, "static_24h_creep": None, "stretch_pct": {}, "recover_pct": {}}
    assert dimensions(only_tl6, pop10())["inputs"]["durability"] == 1


def test_control_uses_stiffness_stretch_elasticity():
    full = dimensions(rec(9), pop10())
    assert full["inputs"]["control"] == 3
    assert full["values"]["control"] > 85
    only_stiff = dimensions(rec(9, excel=False), pop10())
    assert only_stiff["inputs"]["control"] == 1
    none = rec(9, twu=False, excel=False)
    none["stiffness"] = None
    d = dimensions(none, pop10())
    assert d["values"]["control"] is None and d["inputs"]["control"] == 0


def test_spin_dimension_excludes_model_estimates():
    assert dimensions(rec(5, spin_kind="modello"), pop10())["values"]["spin"] is None
    assert dimensions(rec(5), pop10())["values"]["spin"] is not None


def test_excel_only_string_has_values_without_twu():
    r = rec(3, twu=False, spin_kind="modello", stiff_kind="da Racketpedia")
    v = dimensions(r, pop10())["values"]
    assert v["spin"] is None
    for k in ("stiffness", "durability", "control", "elasticity"):
        assert v[k] is not None, k

from pipeline.derive import DEFAULT_DISLIKED, DEFAULT_EQUIPPED, DEFAULT_LIKED, derive_all


def lab(i):
    st, sp = 170.0 + 8 * i, 4.0 + 0.6 * i
    return {"id": f"b-m{i}-17", "brand": "B", "model": f"M{i}", "gauge_mm": 1.25, "shape": "RND", "preference": None,
            "is_target": True,
            "twu": {"match": "exact", "stiffness_lbin": st, "tension_loss_pct": 20.0 + 3 * i, "spin_potential": sp},
            "excel": {"stiff_index_avg": 2.0 + 0.2 * i, "stretch_pct": {"50": 5.0 - 0.2 * i}, "recover_pct": {"50": 1.0 + 0.1 * i},
                      "tl6": 10.0 + i, "tl12": 15.0 + i, "static_24h_creep": 0.3 + 0.02 * i},
            "rpedia": None,
            "spin": {"value": sp, "low": sp, "high": sp, "kind": "misurato", "basis_n": 1},
            "stiffness": {"value_lbin": st, "low": st, "high": st, "kind": "misurata"}}


def excel_only():
    r = lab(4)
    r.update(id="b-excel-17", twu=None,
             spin={"value": 6.0, "low": 4.5, "high": 7.5, "kind": "modello", "basis_n": 54, "model": "forma"},
             stiffness={"value_lbin": 200.0, "low": 190.0, "high": 210.0, "kind": "da Racketpedia"})
    return r


def recs():
    out = [lab(i) for i in range(10)] + [excel_only()]
    out[0]["id"], out[1]["id"] = DEFAULT_LIKED
    return out


def test_defaults_constants():
    assert DEFAULT_LIKED == ["solinco-confidential-16l", "toroline-o-toro-17"]
    assert DEFAULT_EQUIPPED == {"id": "re-string-zero-17", "kg": [22.5, 21.5]}
    assert DEFAULT_DISLIKED == ["solinco-confidential-soft-16", "solinco-confidential-soft-17",
                                "babolat-rpm-blast-16", "babolat-rpm-blast-17"]


def test_derived_has_dims_excel_measures_and_pairing():
    rs = recs()
    derive_all(rs)
    for r in rs:
        d = r["derived"]
        assert set(d["dims"]) == {"stiffness", "durability", "elasticity", "spin"}
        assert set(d["dim_inputs"]) == {"durability"}
        assert d["excel_measures"]["elasticity"] is not None
        assert d["pairing"]["band"]
    assert rs[0]["derived"]["pairing"]["score"] == 100  # una preferita combacia con se stessa
    assert rs[0]["derived"]["pairing"]["penalized"] is False


def test_excel_only_string_is_rated_without_spin():
    rs = recs()
    derive_all(rs)
    p = rs[-1]["derived"]["pairing"]
    assert p["n_dims"] >= 3 and p["no_spin"] is True and p["score"] is not None
    assert rs[-1]["derived"]["dims"]["spin"] is None


def test_judgments_and_subscores_use_the_same_durability_as_dims():
    # la parola mostrata in ogni riga viene da judgments: deve descrivere la stessa tenuta che guida pairing, mappa e ordinamenti
    rs = recs()
    derive_all(rs)
    for r in rs:
        d = r["derived"]
        assert d["judgments"]["durability"]["score"] == d["dims"]["durability"], r["id"]
        assert d["subscores"]["durability"] == d["dims"]["durability"], r["id"]

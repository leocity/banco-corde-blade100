from pipeline.notes_gen import KEYS, apply_notes, generate_notes


def rec(**kw):
    base = {"id": "x-y-17", "brand": "X", "model": "Y", "gauge_label": "17", "gauge_mm": 1.2, "shape": "HEX",
            "preference": None, "excel": {"tl6": 12.0},
            "twu": {"twu_name": "X Y 17 (1.20)", "match": "exact", "stiffness_lbin": 200.0, "tension_loss_pct": 30.0, "spin_potential": 7.0},
            "rpedia": None,
            "derived": {"subscores": {"spin": 70, "stiffness": 50, "durability": 50},
                        "similarity_liked": {"confidential": 60, "otoro": 40},
                        "similarity_disliked": {"confidential_soft": 30, "rpm_blast": 20},
                        "disliked_warning": False, "profile_score": 60,
                        "tension_start": {"kg": [21.5, 20.5], "lbs": [47.5, 45.0], "from": "solinco-confidential-16l", "indicative": True, "note": ""}}}
    base.update(kw)
    return base


def test_four_nonempty_short_notes():
    n = generate_notes(rec())
    assert set(n) == set(KEYS) and all(n[k] and len(n[k]) <= 400 for k in KEYS)


def test_disliked_warning_names_the_string():
    r = rec()
    r["derived"]["disliked_warning"] = True
    r["derived"]["similarity_disliked"] = {"confidential_soft": 40, "rpm_blast": 82}
    assert "RPM Blast" in generate_notes(r)["vs_favorites"]


def test_proxy_twu_is_disclosed():
    r = rec(twu={"twu_name": "X Y 16 (1.30)", "match": "proxy", "stiffness_lbin": 200.0, "tension_loss_pct": 30.0, "spin_potential": 7.0})
    assert "1.30" in generate_notes(r)["vs_favorites"]


def test_missing_twu_still_produces_notes():
    r = rec(twu=None)
    r["derived"]["subscores"] = {"spin": None, "stiffness": None, "durability": 40}
    r["derived"]["similarity_liked"] = {"confidential": None, "otoro": None}
    n = generate_notes(r)
    assert all(n[k] for k in KEYS) and "TWU" in n["feel"]


def test_manual_notes_override_generated():
    recs = [rec()]
    apply_notes(recs, {"x-y-17": {"feel": "scritta a mano"}})
    assert recs[0]["notes"]["feel"] == "scritta a mano" and recs[0]["notes"]["on_blade_100_v9"]


def test_every_record_in_strings_json_has_notes():
    import json, pathlib
    p = pathlib.Path(__file__).resolve().parent.parent / "data" / "strings.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    for r in data["strings"]:
        assert all(r["notes"].get(k) for k in KEYS), r["id"]
        assert all(len(r["notes"][k]) <= 400 for k in KEYS), r["id"]
        if r["derived"]["disliked_warning"]:
            assert any(n in r["notes"]["vs_favorites"] for n in ("RPM Blast", "Confidential Soft")), r["id"]


def test_twu_with_missing_spin_value():
    r = rec(twu={"twu_name": "X Y 17", "match": "exact", "stiffness_lbin": 286.9, "tension_loss_pct": 23.5, "spin_potential": None})
    r["derived"]["subscores"]["spin"] = None
    assert "non misurato" in generate_notes(r)["feel"]


def test_low_basis_note_names_the_actually_missing_sources():
    r = rec(excel=None)  # solo TWU: 3 misure, TWU presente
    r["derived"]["similarity_basis"] = {"confidential": 3, "otoro": 3}
    v = generate_notes(r)["vs_favorites"]
    assert "manca TWU" not in v and "Ektelon" in v and "Racketpedia" in v


def test_estimated_spin_is_called_estimate_in_notes():
    r = rec(twu=None)
    r["derived"]["subscores"]["spin"] = 70
    r["spin"] = {"value": 7.6, "low": 6.5, "high": 8.7, "kind": "tester", "basis_n": 2}
    assert "stimato" in generate_notes(r)["feel"]


def test_catalog_only_note_says_reviews_only():
    r = rec(twu=None, excel=None, catalog_only=True)
    r["reviews"] = {"agg": {"n_sources": 3}, "sources": []}
    assert "recensioni" in generate_notes(r)["feel"]


def test_null_subscores_say_insufficient_data():
    r = rec(twu=None, excel=None)
    r["derived"]["subscores"] = {"spin": None, "stiffness": None, "durability": None}
    r["derived"]["similarity_liked"] = {"confidential": None, "otoro": None}
    n = generate_notes(r)
    assert "insufficienti" in n["on_blade_100_v9"] and "insufficienti" in n["for_your_style"]


def test_blade_note_makes_no_unmeasured_physical_claims():
    """Nessuna nota generata deve dire dove va la palla o quanto «esce lunga/corta»: nessuno lo misura."""
    import json
    data = json.load(open("data/strings.json", encoding="utf-8"))
    banned = ("esce un po' corta", "uscire lunga", "palla controllata", "piatto molto vivo", "profondità facile")
    curated = {k for k, v in json.load(open("data/notes.json", encoding="utf-8")).items() if isinstance(v, dict) and v.get("on_blade_100_v9")}
    for r in data["strings"]:
        if r["id"] in curated:  # note scritte a mano dall'utente o curate: non si toccano
            continue
        n = (r.get("notes") or {}).get("on_blade_100_v9") or ""
        assert not any(b in n for b in banned), (r["id"], n[:80])
    generated = {(r.get("notes") or {}).get("on_blade_100_v9") for r in data["strings"]}
    assert any("regola empirica" in (g or "") for g in generated)

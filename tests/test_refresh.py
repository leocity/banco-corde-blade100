import json

import pytest

from pipeline.refresh import classify_added, diff, report, run

TWU_F = {"stiffness_lbin": 1, "spin_potential": 0.1, "tension_loss_pct": 1}


def twu_row(name, id_, stiff=200.0, brand="Solinco", model="Hyper-G", mm=1.25):
    return {"id": id_, "twu_name": name, "brand": brand, "model": model, "gauge_label": "16L", "gauge_mm": mm, "ref_tension_lbs": 51,
            "swing": "Fast", "material": "Polyester", "stiffness_lbin": stiff, "tension_loss_pct": 30.0, "spin_potential": 7.0}


def test_diff_thresholds():
    old = [twu_row("A", "a"), twu_row("B", "b"), twu_row("C", "c")]
    new = [twu_row("A", "a", stiff=203.0), twu_row("B", "b", stiff=200.5), twu_row("D", "d")]
    d = diff(old, new, "twu_name", TWU_F)
    assert [r["twu_name"] for r in d["added"]] == ["D"]
    assert d["changed"] == [("A", "stiffness_lbin", 200.0, 203.0)]
    assert [r["twu_name"] for r in d["removed"]] == ["C"]


def test_classify_added():
    records = [{"id": "solinco-nuova-16l", "twu": None, "catalog_only": True}, {"id": "solinco-hyper-g-16l", "twu": {"twu_name": "X"}}]
    certain, pending = classify_added([twu_row("Solinco Nuova 16L", "solinco-nuova-16l"), twu_row("Solinco Mai Vista 17", "solinco-mai-vista-17"),
                                       twu_row("Solinco Hyper-G 16L bis", "solinco-hyper-g-16l")], records)
    assert [r["id"] for r in certain] == ["solinco-nuova-16l"]
    assert sorted(r["id"] for r in pending) == ["solinco-hyper-g-16l", "solinco-mai-vista-17"]


def test_report_has_all_sections():
    md = report("2026-10-28", {}, [], [], [])
    for h in ("## Novità", "## Valori cambiati", "## Sparite", "## Anomalie", "## Da abbinare"):
        assert h in md
    assert md.count("nessuna") == 5


def _root(tmp_path):
    raw = tmp_path / "data" / "raw"
    raw.mkdir(parents=True)
    (tmp_path / "data" / "agents").mkdir()
    (tmp_path / "data" / "source").mkdir()
    rows = [twu_row("Solinco Hyper-G 16L (1.25)", "solinco-hyper-g-16l")]
    (raw / "twu.json").write_text(json.dumps(rows), encoding="utf-8")
    (raw / "twu.html").write_text("<html>vecchia</html>", encoding="utf-8")
    (raw / "twu_compare.json").write_text(json.dumps({"Solinco Hyper-G 16L (1.25)": {"pcode": "H", "stiffness_lbin": 200.0, "spin_potential": 7.0,
                                                       "energy_return_pct": 88.0, "cof_string_string": 0.09, "cof_string_ball": 0.6,
                                                       "tension_loss_pct": 30.0, "material": "Polyester"}}), encoding="utf-8")
    (raw / "racketpedia.json").write_text(json.dumps([{"url": "https://rp/a", "name": "Hyper-G 1.25", "kgmm": 1.0}]), encoding="utf-8")
    (raw / "excel.json").write_text(json.dumps([{"id": "solinco-hyper-g-16l", "excel": {"tl6": 10.0}}]), encoding="utf-8")
    (raw / "sources.json").write_text(json.dumps({"excel": {"file": "a.xlsx", "modified": "2026-08-26"}}), encoding="utf-8")
    (tmp_path / "data" / "agents" / "matches.json").write_text(json.dumps([{"id": "solinco-hyper-g-16l", "twu_name": "Solinco Hyper-G 16L (1.25)", "match": "exact"}]), encoding="utf-8")
    (tmp_path / "data" / "strings.json").write_text(json.dumps({"strings": [{"id": "solinco-hyper-g-16l", "twu": {"twu_name": "Solinco Hyper-G 16L (1.25)"}},
                                                                            {"id": "solinco-nuova-16l", "twu": None, "catalog_only": True}]}), encoding="utf-8")
    return tmp_path, rows


def _snapshot(root):
    return {p.relative_to(root): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()}


def _fetchers(root, twu_rows=None, compare=None, rp=None, excel=None, fail=None):
    raw = root / "data" / "raw"
    def boom(*a):
        raise ConnectionError("rete giù")
    return {
        "twu": boom if fail == "twu" else (lambda: ("<html>nuova</html>", twu_rows if twu_rows is not None else json.loads((raw / "twu.json").read_text()))),
        "twu_compare": boom if fail == "twu_compare" else (lambda names: compare if compare is not None else json.loads((raw / "twu_compare.json").read_text())),
        "racketpedia": lambda: rp if rp is not None else json.loads((raw / "racketpedia.json").read_text()),
        "excel": lambda: excel,
    }


def test_run_no_changes_writes_nothing(tmp_path, capsys):
    root, _ = _root(tmp_path)
    before = _snapshot(root)
    assert run(root=root, fetchers=_fetchers(root), rebuild=False, today="2026-10-28") == 0
    assert _snapshot(root) == before
    assert "Nessuna novità" in capsys.readouterr().out


@pytest.mark.parametrize("where", ["twu", "twu_compare"])
def test_run_network_failure_writes_nothing(tmp_path, where):
    root, rows = _root(tmp_path)
    before = _snapshot(root)
    new_rows = rows + [twu_row("Solinco Nuova 16L", "solinco-nuova-16l")]
    assert run(root=root, fetchers=_fetchers(root, twu_rows=new_rows, fail=where), rebuild=False, today="2026-10-28") == 2
    assert _snapshot(root) == before


def test_run_with_changes(tmp_path):
    root, rows = _root(tmp_path)
    new_rows = [twu_row("Solinco Hyper-G 16L (1.25)", "solinco-hyper-g-16l", stiff=203.0), twu_row("Solinco Nuova 16L", "solinco-nuova-16l"),
                twu_row("Solinco Mai Vista 17", "solinco-mai-vista-17", model="Mai Vista")]
    excel = ("b.xlsx", "2026-10-20", [{"id": "solinco-hyper-g-16l", "excel": {"tl6": 10.0}}, {"id": "re-string-nuova-17", "excel": {"tl6": 12.0}}])
    assert run(root=root, fetchers=_fetchers(root, twu_rows=new_rows, excel=excel), rebuild=False, today="2026-10-28") == 1
    md = (root / "data" / "changes" / "2026-10-28.md").read_text(encoding="utf-8")
    assert "Solinco Nuova 16L" in md and "re-string-nuova-17" in md and "203" in md
    pending = json.loads((root / "data" / "pending_matches.json").read_text(encoding="utf-8"))
    assert [p["twu_name"] for p in pending] == ["Solinco Mai Vista 17"]
    assert len(json.loads((root / "data" / "raw" / "twu.json").read_text(encoding="utf-8"))) == 3
    src = json.loads((root / "data" / "raw" / "sources.json").read_text(encoding="utf-8"))
    assert src["twu"]["fetched"] == "2026-10-28" and src["excel"] == {"file": "b.xlsx", "modified": "2026-10-20"}


def test_run_compare_anomaly_reported(tmp_path):
    root, rows = _root(tmp_path)
    cmp = json.loads((root / "data" / "raw" / "twu_compare.json").read_text())
    cmp["Solinco Hyper-G 16L (1.25)"]["stiffness_lbin"] = 226.0
    assert run(root=root, fetchers=_fetchers(root, compare=cmp), rebuild=False, today="2026-10-28") == 1
    md = (root / "data" / "changes" / "2026-10-28.md").read_text(encoding="utf-8")
    assert "Solinco Hyper-G 16L (1.25)" in md.split("## Anomalie")[1].split("## Da abbinare")[0]


def test_empty_or_shrunken_source_is_an_error(tmp_path, capsys):
    root, rows = _root(tmp_path)
    before = _snapshot(root)
    assert run(root=root, fetchers=_fetchers(root, rp=[]), rebuild=False, today="2026-10-28") == 2
    assert run(root=root, fetchers=_fetchers(root, compare={}), rebuild=False, today="2026-10-28") == 2
    assert run(root=root, fetchers=_fetchers(root, twu_rows=[]), rebuild=False, today="2026-10-28") == 2
    assert _snapshot(root) == before
    assert "vuota" in capsys.readouterr().out


def test_shrunk_by_more_than_a_third_is_an_error(tmp_path):
    root, rows = _root(tmp_path)
    many = [twu_row(f"Solinco X{i} 16L", f"solinco-x{i}-16l") for i in range(10)]
    (root / "data" / "raw" / "twu.json").write_text(json.dumps(many), encoding="utf-8")
    before = _snapshot(root)
    assert run(root=root, fetchers=_fetchers(root, twu_rows=many[:6]), rebuild=False, today="2026-10-28") == 2
    assert _snapshot(root) == before


def test_failed_rebuild_restores_everything(tmp_path):
    root, rows = _root(tmp_path)
    before = _snapshot(root)
    def broken(root_):
        (root_ / "data" / "strings.json").write_text("rotto", encoding="utf-8")  # una ricostruzione a metà
        raise RuntimeError("validate_agents: twu_name sconosciuto")
    new_rows = [twu_row("Solinco Hyper-G 16L (1.25)", "solinco-hyper-g-16l", stiff=203.0)]
    assert run(root=root, fetchers=_fetchers(root, twu_rows=new_rows), rebuild=broken, today="2026-10-28") == 2
    assert _snapshot(root) == before


def test_resaved_excel_with_same_name(tmp_path):
    root, rows = _root(tmp_path)
    same = ("a.xlsx", "2026-10-28", [{"id": "solinco-hyper-g-16l", "excel": {"tl6": 10.0}}])
    before = _snapshot(root)
    assert run(root=root, fetchers=_fetchers(root, excel=same), rebuild=False, today="2026-10-28") == 0
    assert _snapshot(root) == before
    edited = ("a.xlsx", "2026-10-28", [{"id": "solinco-hyper-g-16l", "excel": {"tl6": 14.0}}])
    assert run(root=root, fetchers=_fetchers(root, excel=edited), rebuild=False, today="2026-10-28") == 1
    assert "tl6 10.0 → 14.0" in (root / "data" / "changes" / "2026-10-28.md").read_text(encoding="utf-8")


def test_new_racketpedia_rows_wait_for_review_and_out_of_scope_are_ignored(tmp_path):
    root, rows = _root(tmp_path)
    old = json.loads((root / "data" / "raw" / "racketpedia.json").read_text())
    new = old + [{"url": "https://rp/b", "name": "Hyper-G Pink 125", "gauge_mm": 1.25, "kgmm": 1.0},
                 {"url": "https://rp/c", "name": "Hyper-G Pink 115", "gauge_mm": 1.15, "kgmm": 0.9}]
    assert run(root=root, fetchers=_fetchers(root, rp=new), rebuild=False, today="2026-10-28") == 1
    pending = json.loads((root / "data" / "pending_matches.json").read_text(encoding="utf-8"))
    assert [p.get("url") for p in pending] == ["https://rp/b"]
    md = (root / "data" / "changes" / "2026-10-28.md").read_text(encoding="utf-8")
    assert "Hyper-G Pink 125" in md.split("## Da abbinare")[1] and "115" not in md


def test_effects_on_recommendations_listed():
    from pipeline.refresh import effects
    before = {"strings": [{"id": "a", "derived": {"profile_score": 68, "disliked_warning": False}},
                          {"id": "b", "derived": {"profile_score": 50, "disliked_warning": False}}]}
    after = {"strings": [{"id": "a", "derived": {"profile_score": 53, "disliked_warning": True}},
                         {"id": "b", "derived": {"profile_score": 50, "disliked_warning": False}}]}
    lines = effects(before, after)
    assert lines == ["- a: punteggio 68 → 53; ora «simile a una non gradita»"]

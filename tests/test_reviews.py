from pipeline.reviews import aggregate, validate_reviews


def src(kind, scores=None, levels=None, url="https://x.com/a"):
    base_s = {k: None for k in ("spin", "comfort", "control", "power", "durability")}
    base_l = {**base_s, "stiffness": None}
    return {"site": "x", "url": url, "kind": kind, "scores": {**base_s, **(scores or {})},
            "levels": {**base_l, **(levels or {})}, "note": ""}


def test_validator_flags_missing_url_and_out_of_range():
    rows = [{"id": "a", "sources": [src("review", {"spin": 120}, url=None)]},
            {"id": "b", "sources": [src("brand", levels={"spin": 7})]}]
    errs = validate_reviews(rows, {"a", "b", "c"})
    assert any("url" in e for e in errs) and any("120" in e for e in errs)
    assert any("7" in e for e in errs) and any("c" in e for e in errs)


def test_aggregate_weights_by_source_kind():
    row = {"id": "a", "sources": [src("lab_playtest", {"spin": 90}), src("review", {"spin": 70})]}
    agg = aggregate(row)
    # (90*1.0 + 70*0.8) / 1.8
    assert round(agg["score"]["spin"], 1) == round((90 + 56) / 1.8, 1)
    assert agg["n_sources"] == 2


def test_aggregate_levels_and_empty_criteria():
    row = {"id": "a", "sources": [src("brand", levels={"stiffness": 4}), src("video", levels={"stiffness": 2})]}
    agg = aggregate(row)
    assert agg["score"]["spin"] is None and agg["level"]["spin"] is None
    assert round(agg["level"]["stiffness"], 2) == round((4 * 0.4 + 2 * 0.5) / 0.9, 2)


def test_aggregate_no_sources():
    agg = aggregate({"id": "a", "sources": []})
    assert agg["n_sources"] == 0 and all(v is None for v in agg["score"].values())


def test_aggregate_reports_weight_sum_per_criterion():
    row = {"id": "a", "sources": [src("lab_playtest", {"spin": 90}), src("brand", levels={"spin": 5})]}
    agg = aggregate(row)
    assert round(agg["wsum"]["spin"], 2) == 1.4 and agg["wsum"]["comfort"] == 0


def test_review_percentiles_across_population():
    from pipeline.reviews import add_percentiles
    aggs = {i: aggregate({"id": i, "sources": [src("review", {"spin": s})]}) for i, s in (("a", 70), ("b", 80), ("c", 90))}
    add_percentiles(aggs)
    assert aggs["a"]["pct"]["spin"] < aggs["b"]["pct"]["spin"] < aggs["c"]["pct"]["spin"]
    assert aggs["b"]["pct"]["spin"] == 50.0


def test_lone_level_is_not_ranked_against_numeric_scores():
    from pipeline.reviews import add_percentiles
    aggs = {i: aggregate({"id": i, "sources": [src("lab_playtest", {"spin": s})]}) for i, s in (("a", 80), ("b", 90), ("c", 95))}
    aggs["d"] = aggregate({"id": "d", "sources": [src("review", levels={"spin": 4})]})
    add_percentiles(aggs)
    assert aggs["d"]["pct"]["spin"] == 75.0  # "alto" resta alto, non finisce in fondo ai voti numerici

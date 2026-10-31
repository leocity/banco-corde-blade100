from pipeline.community import aggregate, build_community, norm_model


def src(author, control=None, power=None, kind="forum", url=None, quote="q"):
    return {"site": "tt.tennis-warehouse.com", "url": url or f"https://x/{author}", "kind": kind, "author": author, "quote": quote,
            "control": control, "power": power, "spin": None, "comfort": None, "durability": None, "comparisons": []}


def test_norm_model_ignores_case_dashes_and_spaces():
    assert norm_model("Mach-10") == norm_model("Mach 10") == "mach10"


def test_aggregate_counts_distinct_authors_and_ignores_brand_and_nulls():
    s = [src("a", control="alto"), src("a", control="alto"), src("b", control="medio"), src("c", control="alto", kind="brand"), src("d")]
    out = aggregate(s, "control")
    assert out["n"] == 2 and out["word"] == "alto" and out["split"] is False


def test_aggregate_word_thresholds_and_split():
    assert aggregate([src("a", power="basso"), src("b", power="basso")], "power")["word"] == "basso"
    mixed = aggregate([src("a", power="alto"), src("b", power="basso"), src("c", power="medio")], "power")
    assert mixed["word"] == "medio" and mixed["split"] is True


def test_aggregate_none_without_evidence():
    assert aggregate([src("a")], "control") is None
    assert aggregate([], "control") is None


def test_aggregate_keeps_up_to_three_quotes_with_urls():
    out = aggregate([src(c, control="alto", quote=f"quote {c}") for c in "abcde"], "control")
    assert len(out["evidence"]) == 3 and all(e["url"] and e["quote"] for e in out["evidence"])


def test_build_community_maps_model_to_every_gauge_and_needs_a_known_model():
    recs = [{"id": "re-string-slap-17", "brand": "Re-String", "model": "Slap"}, {"id": "re-string-slap-16", "brand": "Re-String", "model": "Slap"},
            {"id": "x-1", "brand": "Other", "model": "Y"}]
    forum = [{"brand": "Re-String", "models": [{"model": "slap", "sources": [src("a", control="alto", power="medio"), src("b", control="alto")]},
                                               {"model": "Nonesiste", "sources": [src("z", control="basso")]}]}]
    out = build_community(forum, recs)
    assert set(out) == {"re-string-slap-17", "re-string-slap-16"}
    c = out["re-string-slap-17"]
    assert c["control"]["n"] == 2 and c["control"]["word"] == "alto" and c["power"]["n"] == 1
    assert c["scope"] == "model"


def test_build_community_alias_maps_generic_name_to_listed_models():
    recs = [{"id": "s-hg-round", "brand": "Solinco", "model": "Hyper-G Round"}, {"id": "s-hg-soft", "brand": "Solinco", "model": "Hyper-G Soft"}]
    forum = [{"brand": "Solinco", "models": [{"model": "Hyper-G", "sources": [src("a", control="alto"), src("b", control="alto")]}]}]
    out = build_community(forum, recs, aliases={("Solinco", "Hyper-G"): ["Hyper-G Round"]})
    assert set(out) == {"s-hg-round"}


def cmp_src(author, vs, attr, direction, kind="review", url=None):
    s = src(author, kind=kind, url=url)
    s["comparisons"] = [{"vs": vs, "attribute": attr, "direction": direction}]
    return s


def test_comparisons_group_by_pair_attribute_and_direction_counting_authors():
    from pipeline.community import comparisons
    out = comparisons([cmp_src("a", "Re-String Zero", "control", "less"), cmp_src("a", "re-string zero", "control", "less"),
                       cmp_src("b", "Re-String Zero", "control", "less"), cmp_src("c", "Re-String Zero", "control", "more", kind="brand"),
                       cmp_src("d", "Zero", "spin", "more")])
    assert len(out) == 1 and out[0]["attribute"] == "control" and out[0]["direction"] == "less" and out[0]["n"] == 2
    assert out[0]["url"].startswith("https://x/")


def test_build_community_keeps_comparisons_even_without_levels():
    recs = [{"id": "re-string-slap-17", "brand": "Re-String", "model": "Slap"}]
    forum = [{"brand": "Re-String", "models": [{"model": "Slap", "sources": [cmp_src("nash", "Zero", "control", "less", url="https://tn/61581")]}]}]
    c = build_community(forum, recs)["re-string-slap-17"]
    assert "control" not in c and c["comparisons"][0]["vs"] == "Zero" and c["comparisons"][0]["direction"] == "less"

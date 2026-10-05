from pipeline.validate_agents import assemble_matches, validate_matches, validate_rpedia

EXCEL = [{"id": "a-x-17"}, {"id": "a-y-16l"}]
TWU = [{"id": "a-x-17", "twu_name": "A X 17 (1.20)"}, {"id": "a-y-16", "twu_name": "A Y 16 (1.30)"},
       {"id": "a-z-17", "twu_name": "A Z 17 (1.20)"}]


def test_assemble_auto_exact_agent_rows_and_twu_only():
    agent = [{"id": "a-y-16l", "twu_name": "A Y 16 (1.30)", "match": "proxy", "note": "calibro diverso"}]
    m = {r["id"]: r for r in assemble_matches(EXCEL, TWU, agent)}
    assert m["a-x-17"]["match"] == "exact" and m["a-x-17"]["twu_name"] == "A X 17 (1.20)"
    assert m["a-y-16l"]["match"] == "proxy"
    # TWU-only: proxy non "consuma" la riga TWU, quindi a-y-16 e a-z-17 diventano record propri
    assert m["a-y-16"]["match"] == "exact" and m["a-z-17"]["match"] == "exact"
    assert validate_matches(list(m.values()), EXCEL, TWU) == []


def test_exact_agent_match_consumes_twu_row():
    agent = [{"id": "a-y-16l", "twu_name": "A Y 16 (1.30)", "match": "exact", "note": ""}]
    ids = {r["id"] for r in assemble_matches(EXCEL, TWU, agent)}
    assert "a-y-16" not in ids


def test_missing_excel_id_is_error():
    errs = validate_matches([{"id": "a-x-17", "twu_name": "A X 17 (1.20)", "match": "exact", "note": ""}], EXCEL, TWU)
    assert any("a-y-16l" in e for e in errs)


def test_bad_enum_and_unknown_twu_name():
    rows = [{"id": "a-x-17", "twu_name": "A X 17 (1.20)", "match": "maybe", "note": ""},
            {"id": "a-y-16l", "twu_name": "Nope", "match": "probable", "note": ""}]
    errs = validate_matches(rows, EXCEL, TWU)
    assert any("maybe" in e for e in errs) and any("Nope" in e for e in errs)


def test_rpedia_stiffness_without_url_is_error():
    rows = [{"id": "a-x-17", "url": None, "static_stiffness_kgmm": 1.1, "shape": None, "composition": None, "match": "exact"}]
    assert validate_rpedia(rows, {"a-x-17"})


def test_rpedia_missing_id_and_ok_case():
    ok = [{"id": "a-x-17", "url": "https://www.racketpedia.com/en-GB/tennis-string/a-x-120",
           "static_stiffness_kgmm": 1.1, "shape": "round", "composition": "copolyester", "match": "exact"}]
    assert validate_rpedia(ok, {"a-x-17"}) == []
    assert validate_rpedia(ok, {"a-x-17", "a-y-16l"})


def test_project_rpedia_onto_final_ids():
    from pipeline.validate_agents import project_rpedia
    matches = [{"id": "a-x-17", "twu_name": "A X 17 (1.20)", "match": "exact", "note": ""},
               {"id": "a-y-16l", "twu_name": "A Y 16 (1.30)", "match": "exact", "note": ""}]
    twu = TWU
    url = "https://www.racketpedia.com/en-GB/tennis-string/a-y-130"
    rp = [{"id": "a-x-17", "url": None, "static_stiffness_kgmm": None, "shape": None, "composition": None, "match": "none"},
          {"id": "a-y-16l", "url": None, "static_stiffness_kgmm": None, "shape": None, "composition": None, "match": "none"},
          {"id": "a-y-16", "url": url, "static_stiffness_kgmm": 1.2, "shape": "round", "composition": "copolyester", "match": "exact"},
          {"id": "a-z-17", "url": None, "static_stiffness_kgmm": None, "shape": None, "composition": None, "match": "none"}]
    out = {r["id"]: r for r in project_rpedia(rp, matches, twu)}
    assert set(out) == {"a-x-17", "a-y-16l"}
    assert out["a-y-16l"]["static_stiffness_kgmm"] == 1.2


def test_colour_variants_claiming_same_exact_are_downgraded():
    excel = [{"id": "k-helix-white-17"}, {"id": "k-helix-blue-17"}]
    twu = [{"id": "k-helix-17", "twu_name": "K Helix 17"}]
    agent = [{"id": "k-helix-white-17", "twu_name": "K Helix 17", "match": "exact", "note": ""},
             {"id": "k-helix-blue-17", "twu_name": "K Helix 17", "match": "exact", "note": ""}]
    m = assemble_matches(excel, twu, agent)
    assert sorted(x["match"] for x in m) == ["exact", "probable"]
    assert validate_matches(m, excel, twu) == []

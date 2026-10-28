from pipeline.build_page import render


def test_render_inlines_everything():
    html = render({"strings": [], "generated": "2026-10-05"})
    assert "/*__CSS__*/" not in html and "/*__JS__*/" not in html and "/*__DATA__*/" not in html
    assert "export " not in html.split("<script type=\"module\">")[1]
    assert "import " not in html.split("<script type=\"module\">")[1]
    assert '"generated": "2026-10-05"' in html and "<title>Banco Corde Blade 100</title>" in html


def test_render_escapes_script_close_in_data():
    html = render({"strings": [{"notes": {"feel": "</script><b>x"}}], "generated": "x"})
    assert "</script><b>" not in html


def test_modules_in_order(tmp_path, monkeypatch):
    import pipeline.build_page as bp
    (tmp_path / "score.js").write_text("export const A = 1;\n", encoding="utf-8")
    (tmp_path / "recommend.js").write_text("import { A } from './score.js';\nexport function b() { return A; }\n", encoding="utf-8")
    (tmp_path / "app.js").write_text("import { b } from './recommend.js';\nb();\n", encoding="utf-8")
    monkeypatch.setattr(bp, "WEB", tmp_path)
    js = bp._js()
    assert js.index("const A") < js.index("function b") < js.index("b();")
    assert not any(line.startswith(("import ", "export ")) for line in js.splitlines())


def test_no_duplicate_top_level_names():
    import re
    from pipeline.build_page import MODULES, WEB
    seen = {}
    for m in MODULES:
        p = WEB / m
        if not p.exists():
            continue
        for name in re.findall(r"^(?:export )?(?:async )?(?:const|let|function|class) (\w+)", p.read_text(encoding="utf-8"), re.M):
            assert name not in seen, f"{name} in {seen.get(name)} e {m}"
            seen[name] = m


def test_estimate_figures_come_from_data_not_hand_written():
    """Le cifre delle stime (r, errori) si leggono da DATA.estimates_meta: scritte a mano invecchiano a ogni aggiornamento."""
    from pipeline.build_page import MODULES, WEB
    for m in MODULES:
        p = WEB / m
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8")
        for fig in ("0,63", "±11", "0,99", "1,19", "9,2", "12,6", "14,6", "10,5"):
            assert fig not in text, f"{fig} scritto a mano in {m}"

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


import subprocess

import pytest

from pipeline import build_page


def _module_js(html):
    return html.split('<script type="module">')[1].rsplit("</script>", 1)[0]


def _node_check(js, tmp_path):
    f = tmp_path / "page.mjs"
    f.write_text(js, encoding="utf-8")
    return subprocess.run(["node", "--check", str(f)], capture_output=True, text=True)


def test_inlined_script_is_valid_module(tmp_path):
    r = _node_check(_module_js(render({"strings": [], "generated": "x"})), tmp_path)
    assert r.returncode == 0, r.stderr


def test_no_leftover_imports_or_exports_at_line_start():
    js = _module_js(render({"strings": [], "generated": "x"}))
    assert not [l for l in js.splitlines() if l.startswith(("import ", "export "))]


def test_modules_is_an_explicit_list():
    assert build_page.MODULES[-1] == "app.js"


def test_missing_module_is_an_error_not_skipped(monkeypatch, tmp_path):
    monkeypatch.setattr(build_page, "WEB", tmp_path)
    monkeypatch.setattr(build_page, "MODULES", ["nope.js"])
    with pytest.raises(FileNotFoundError):
        build_page._js()


def test_duplicate_top_level_names_are_caught_by_the_syntax_check(monkeypatch, tmp_path):
    (tmp_path / "a.js").write_text("export const X = 1;\n", encoding="utf-8")
    (tmp_path / "b.js").write_text("import { X } from './a.js';\nexport const X = 2;\n", encoding="utf-8")
    monkeypatch.setattr(build_page, "WEB", tmp_path)
    monkeypatch.setattr(build_page, "MODULES", ["a.js", "b.js"])
    assert _node_check(build_page._js(), tmp_path).returncode != 0

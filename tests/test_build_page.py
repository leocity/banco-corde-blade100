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

"""P2: la tensione di riferimento scritta da noi è quella che il database TWU dichiara nella tabella (51 lb).

L'articolo divulgativo di TWU sulla rigidità parla di 52 lb, ma non è la tabella da cui leggiamo i valori:
finché la colonna «Ref. Ten. (lbs)» e il menu «Medium (51 lbs)» dicono 51, il dato giusto è 51.
"""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_ref_tension_matches_twu_table():
    html = (ROOT / "data/raw/twu.html").read_text(encoding="utf-8", errors="replace")
    assert "Medium (51 lbs)" in html
    refs = set(re.findall(r"<td class='tdleft'>[^<]+</td><td>(\d+)</td><td>(?:Fast|Medium|Slow)</td>", html))
    assert refs == {"51"}
    rows = json.loads((ROOT / "data/raw/twu.json").read_text(encoding="utf-8"))
    assert {r["ref_tension_lbs"] for r in rows} == {int(x) for x in refs}

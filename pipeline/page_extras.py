"""Dati della scheda «Prove» della pagina: piano valutato, ordine in arrivo, schede di campo del file.
Restano in data/plan_page.json, fuori da data/strings.json: i dati personali non toccano punteggi né stime
(test di isolamento in tests/test_field_tests.py). pipeline/build_page.py li unisce alla pagina sotto la chiave `plan`.
Uso: python3 -m pipeline.page_extras"""
import json
import pathlib

from pipeline.test_plan import page_payload

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "plan_page.json"


def _load(p, default=None):
    p = ROOT / p
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def write_page_extras():
    strings = _load("data/strings.json")["strings"]
    out = page_payload(strings, _load("data/test_plan.json", {}), _load("data/inventory.json", {}), _load("data/field_tests.json", {"tests": []}))
    if out["problems"]:
        raise SystemExit("piano di prove non valido: " + "; ".join(out["problems"]))
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    return out


if __name__ == "__main__":
    o = write_page_extras()
    print(OUT, len(o["rows"]), "prove")

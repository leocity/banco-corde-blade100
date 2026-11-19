"""template + css + js + dati -> dist/string-explorer.html (pagina unica per l'Artifact)."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = ROOT / "web"


# Moduli JS inlinati, in ordine: i moduli puri prima, app.js per ultimo. Un file mancante è un errore, non si salta.
# Tutti finiscono nello stesso scope: niente nomi top-level ripetuti (lo controlla tests/test_build_page.py con node --check).
MODULES = ["format.js", "glossary.js", "diary.js", "state.js", "persist.js", "cmp.js", "phys.js", "next.js", "ui.js", "cmpui.js", "tip.js", "rulers.js", "today.js", "sheet.js", "nextui.js", "hybrid.js", "mappa.js", "ask.js", "app.js"]


def _js():
    parts = []
    for name in MODULES:
        src = (WEB / name).read_text(encoding="utf-8")
        src = re.sub(r"^import .*?;\s*$", "", src, flags=re.M)
        parts.append(re.sub(r"^export ", "", src, flags=re.M))
    return "\n".join(parts)


def render(data: dict) -> str:
    payload = json.dumps(data, ensure_ascii=False, indent=None).replace("</", "<\\/")
    html = (WEB / "template.html").read_text(encoding="utf-8")
    return (html.replace("/*__CSS__*/", (WEB / "style.css").read_text(encoding="utf-8"))
                .replace("/*__DATA__*/", payload)
                .replace("/*__JS__*/", _js()))


if __name__ == "__main__":
    data = json.loads((ROOT / "data" / "strings.json").read_text(encoding="utf-8"))
    out = ROOT / "dist" / "string-explorer.html"
    out.parent.mkdir(exist_ok=True)
    page = render(data)
    out.write_text(page, encoding="utf-8")
    # anteprima locale: lo scheletro (doctype, charset, viewport) lo aggiunge l'Artifact in pubblicazione
    (out.parent / "preview.html").write_text(
        '<!doctype html><html lang="it"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>'
        + page + "</body></html>", encoding="utf-8")
    print(out, f"{out.stat().st_size // 1024} KB")

"""template + css + js + dati -> dist/string-explorer.html (pagina unica per l'Artifact)."""
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
WEB = ROOT / "web"


def _js():
    score = re.sub(r"^export ", "", (WEB / "score.js").read_text(encoding="utf-8"), flags=re.M)
    app = re.sub(r"^import .*?;\s*$", "", (WEB / "app.js").read_text(encoding="utf-8"), flags=re.M)
    return score + "\n" + app


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

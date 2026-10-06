"""TWU String Performance Database -> record per corda (spec §4, §5.2)."""
import json
import re
import sys
import urllib.request

from pipeline.scope import gauge_to_mm, in_scope, normalize_brand, normalize_model, string_id

URL = "https://twu.tennis-warehouse.com/learning_center/reporter2.php"
MULTIWORD_BRANDS = ("Signum Pro", "Boris Becker", "Double AR", "Poly Star", "Super String",
                    "Tennis Only", "Weiss Cannon", "One Strings", "Tecnifibre", "Bow Brand")

_MM_PATTERNS = (
    r"\((\d\.\d+)\)",            # (1.25)
    r"\d{2}L?\s*/\s*(\d\.\d+)",  # 16/1.30, 17/1.25
    r"\b(1\d{2})\s*/\s*\d{2}L?",  # 125/16L
    r"(?<![\d/])(1\.\d{2,3})\b",  # 1.25 isolato
)
_GAUGE = re.compile(r"(?<![\d.])(15L?|16L?|17L?|18L?|19|20)g?(?![\d.])", re.I)


def fetch_twu() -> str:
    """Pagina di default: 51 lbs, swing Fast, solo poliestere.
    Le POST del form restituiscono una tabella vuota fuori da una sessione browser."""
    req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "ignore")


def _label_from_mm(mm):
    if mm >= 1.28:
        return "16"
    if mm >= 1.24:
        return "16L"
    if mm >= 1.19:
        return "17"
    if mm >= 1.16:
        return "17L"
    return "18"


def parse_name(name: str):
    name = re.sub(r"\s+", " ", name).strip()
    brand = next((b for b in MULTIWORD_BRANDS if name.startswith(b + " ")), name.split(" ")[0])
    rest = name[len(brand):].strip()
    mm = None
    for pat in _MM_PATTERNS:
        m = re.search(pat, rest)
        if m:
            v = m.group(1)
            mm = float(v) if "." in v else float(v) / 100
            break
    # togli solo la parte in mm, lasciando l'eventuale etichetta di calibro (17/1.25, 125/16L)
    rest = re.sub(r"\(\d\.\d+\)|/\s*\d\.\d+|\b1\d{2}\s*/|(?<![\d/])1\.\d{2,3}\b", " ", rest)
    g = _GAUGE.search(rest)
    if g:
        label = g.group(1).upper()
        rest = rest[:g.start()] + rest[g.end():]
    else:
        label = _label_from_mm(mm) if mm else None
    model = normalize_model(re.sub(r"\s+", " ", rest).strip())
    nb = normalize_brand(brand)
    return nb, model, label, mm if mm else gauge_to_mm(label, brand=nb, model=model)


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def parse_twu(html: str) -> list[dict]:
    head = re.search(r"<th>Item.*?</tr>", html, re.S)
    if not head:
        raise RuntimeError("TWU: tabella non trovata")
    cols = [re.sub("<[^>]+>", "", c).strip() for c in re.findall(r"<th[^>]*>(.*?)</th>", head.group(0), re.S)]
    idx = {c: i for i, c in enumerate(cols)}
    out = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", html[head.end():], re.S):
        cells = [re.sub("<[^>]+>", "", c).strip() for c in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(cells) != len(cols) or not cells[0].isdigit():
            continue
        name = re.sub(r"\s+", " ", cells[idx["String"]])
        brand, model, label, mm = parse_name(name)
        out.append({
            "id": string_id(brand, model, label),
            "twu_name": name,
            "brand": brand,
            "model": model,
            "gauge_label": label,
            "gauge_mm": mm,
            "ref_tension_lbs": int(_f(cells[idx["Ref. Ten. (lbs)"]]) or 0) or None,
            "swing": cells[idx["Swing Speed"]],
            "material": cells[idx["Material"]],
            "stiffness_lbin": _f(cells[idx["Stiffness (lb/in)"]]),
            "tension_loss_pct": _f(cells[idx["Tension Loss (%)"]]),
            "spin_potential": _f(cells[idx["Spin Potential"]]),
        })
    if not out:
        raise RuntimeError("TWU: tabella non trovata")
    seen = {}
    for r in out:
        seen[r["id"]] = seen.get(r["id"], 0) + 1
    for r in out:
        if seen[r["id"]] > 1:
            # stesso modello+calibro in più diametri (es. 1.25 e 1.20): disambigua con i mm
            mm = r["gauge_mm"]
            r["id"] = f"{r['id']}-{str(mm).replace('.', '')}" if mm else r["id"]
    # righe duplicate identiche nel database TWU: suffisso progressivo
    used = {}
    for r in out:
        n = used.get(r["id"], 0)
        used[r["id"]] = n + 1
        if n:
            r["id"] = f"{r['id']}-{n + 1}"
    return out


if __name__ == "__main__":
    html = fetch_twu()
    with open("data/raw/twu.html", "w", encoding="utf-8") as f:
        f.write(html)
    rows = [r for r in parse_twu(html)
            if in_scope(r["brand"], r["model"], r["gauge_label"], r["material"])]
    with open(sys.argv[1], "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)
    counts = {}
    for r in rows:
        counts[r["brand"]] = counts.get(r["brand"], 0) + 1
    print(len(rows), "corde TWU in ambito:", counts)

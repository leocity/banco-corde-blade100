"""TWU "Compare Strings": restituzione di energia e attriti per le corde già abbinate (spec v3 §5.1).

Fonte: https://twu.tennis-warehouse.com/learning_center/comparestrings.php (elenco con codici prodotto) e
POST similarstringcompare.php (JSON per coppia di corde). Una richiesta ogni 0,5 s, solo per le righe abbinate.
Lo spin TWU è il rapporto tra attrito corda-palla e attrito corda-corda: i due attriti spiegano lo spin, non sono
criteri indipendenti e non entrano nel punteggio.
"""
import json
import pathlib
import re
import time
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://twu.tennis-warehouse.com/learning_center/"
LIST_URL = BASE + "comparestrings.php"
PAIR_URL = BASE + "similarstringcompare.php"
MEASURED = ("exact", "probable")
NEW_FIELDS = ("energy_return_pct", "cof_string_string", "cof_string_ball")


def _norm(name):
    return re.sub(r"\s+", " ", name).strip()


def parse_options(html: str) -> dict[str, str]:
    """Nome normalizzato -> codice prodotto, dalla prima lista (le due liste della pagina sono uguali)."""
    start = html.find('<select id="stringA"')
    if start < 0:
        raise ValueError("TWU Compare: elenco delle corde non trovato")
    sel = html[start:html.find("</select>", start)]
    return {_norm(t): v for v, t in re.findall(r"<option value=([^>\s]+)>([^<]*)", sel) if _norm(t)}


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def parse_compare(payload: str) -> dict:
    """Prima corda della risposta (string1pcode) -> misure; "NA" o vuoto -> None."""
    try:
        d = json.loads(payload)
    except (json.JSONDecodeError, TypeError) as e:
        raise ValueError(f"TWU Compare: risposta non JSON ({e})") from e
    if not isinstance(d, dict) or not d.get("pcode1"):
        raise ValueError("TWU Compare: risposta senza pcode1")
    return {"pcode": d["pcode1"], "material": d.get("material1"), "stiffness_lbin": _num(d.get("stiffness1")),
            "tension_loss_pct": _num(d.get("tension1")), "energy_return_pct": _num(d.get("energy1")),
            "cof_string_string": _num(d.get("COFstatic1")), "cof_string_ball": _num(d.get("COFball1")),
            "spin_potential": _num(d.get("ratio1"))}


def _get(url, data=None):
    req = urllib.request.Request(url, data=data, headers={"User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=60).read().decode("utf-8", "ignore")


def fetch_compare(names: list[str], pause=0.5, get=_get) -> dict[str, dict]:
    """twu_name -> misure, per i soli nomi presenti nell'elenco del Compare. Qualsiasi errore di rete o di formato si propaga."""
    codes = parse_options(get(LIST_URL))
    out = {}
    for name in sorted({_norm(n) for n in names}):
        code = codes.get(name)
        if not code:
            continue
        body = urllib.parse.urlencode({"pcode": code, "string1pcode": code}).encode()
        out[name] = parse_compare(get(PAIR_URL, body))
        time.sleep(pause)
    return out


def consistent(row: dict, twu: dict) -> bool:
    """Stessa corda dei due strumenti TWU: rigidità entro 1 lb/in e spin entro 0,1 (se entrambi presenti)."""
    a, b = row.get("stiffness_lbin"), twu.get("stiffness_lbin")
    if a is None or b is None or abs(a - b) > 1:
        return False
    sa, sb = row.get("spin_potential"), twu.get("spin_potential")
    return sa is None or sb is None or abs(sa - sb) <= 0.1 + 1e-9


def merge_compare(records, twu_compare):
    """Aggiunge le misure nuove solo alle righe TWU misurate (exact/probable) e coerenti; restituisce (records, anomalie)."""
    anomalies = []
    for r in records:
        t = r.get("twu")
        if not t:
            continue
        row = twu_compare.get(_norm(t.get("twu_name") or ""))
        ok = bool(row) and t.get("match") in MEASURED
        if ok and not consistent(row, t):
            anomalies.append(r["id"])
            ok = False
        for k in NEW_FIELDS:
            t[k] = row[k] if ok else None
        t["twu_pcode"] = row["pcode"] if ok else None
    return records, anomalies


if __name__ == "__main__":
    matches = json.loads((ROOT / "data/agents/matches.json").read_text(encoding="utf-8"))
    names = [m["twu_name"] for m in matches if m.get("match") != "none" and m.get("twu_name")]
    rows = fetch_compare(names)
    (ROOT / "data/raw/twu_compare.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")
    print(len(rows), "corde dal Compare TWU su", len(set(names)), "nomi abbinati")

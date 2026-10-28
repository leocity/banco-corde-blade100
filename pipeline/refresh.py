"""Aggiornamento manuale (spec v3 §5.5): py -m pipeline.refresh [--offline]

Riscarica TWU (tabella + Compare), Racketpedia e legge il file Excel più recente, confronta con gli snapshot e,
solo se qualcosa è cambiato, aggiorna data/raw/, scrive data/changes/AAAA-MM-GG.md e ricostruisce la pagina.
Tutto si scarica in memoria prima di scrivere: un errore di rete o di formato non tocca nessun file.
Una corda TWU nuova entra da sola solo se il suo id coincide con un record esistente senza dato TWU;
le altre finiscono in data/pending_matches.json e validate_agents le salta finché non vengono riviste.
"""
import datetime
import json
import pathlib
import subprocess
import sys

from pipeline.provenance import record_source
from pipeline.twu_compare import consistent

ROOT = pathlib.Path(__file__).resolve().parent.parent
TWU_FIELDS = {"stiffness_lbin": 1, "spin_potential": 0.1, "tension_loss_pct": 1}
COMPARE_FIELDS = {"stiffness_lbin": 1, "spin_potential": 0.1, "tension_loss_pct": 1, "energy_return_pct": 1,
                  "cof_string_string": 0.005, "cof_string_ball": 0.005}
RP_FIELDS = {"kgmm": 0.05}
EXCEL_FIELDS = {"tl6": 0.1, "tl12": 0.1, "stretch50": 0.1, "stiff_index_avg": 0.1}
REBUILD = ["pipeline.validate_agents", "pipeline.merge", "pipeline.build", "pipeline.build_page"]


def diff(old, new, key, fields):
    o = {r[key]: r for r in old}
    n = {r[key]: r for r in new}
    changed = []
    for k in sorted(set(o) & set(n)):
        for f, tol in fields.items():
            a, b = o[k].get(f), n[k].get(f)
            if (a is None) != (b is None) or (a is not None and abs(a - b) > tol + 1e-9):
                changed.append((k, f, a, b))
    return {"added": [n[k] for k in sorted(set(n) - set(o))], "changed": changed, "removed": [o[k] for k in sorted(set(o) - set(n))]}


def classify_added(added, records):
    """Certa solo se l'id coincide con un record esistente senza dato TWU (es. una corda "solo catalogo")."""
    no_twu = {r["id"] for r in records if not r.get("twu")}
    certain = [r for r in added if r["id"] in no_twu]
    return certain, [r for r in added if r["id"] not in no_twu]


def _excel_flat(rows):
    out = []
    for r in rows:
        e = r.get("excel") or {}
        out.append({"id": r["id"], "tl6": e.get("tl6"), "tl12": e.get("tl12"), "stretch50": (e.get("stretch_pct") or {}).get("50"),
                    "stiff_index_avg": e.get("stiff_index_avg")})
    return out


def _fmt_change(c):
    k, f, a, b = c
    return f"- {k}: {f} {a} → {b}"


def report(date, diffs, certain, pending, anomalies):
    names = {"twu": "TWU", "twu_compare": "TWU Compare", "racketpedia": "Racketpedia", "excel": "il tuo file Excel"}
    label = {"twu": lambda r: f"{r['twu_name']} ({r['id']})", "twu_compare": lambda r: r["name"],
             "racketpedia": lambda r: f"{r.get('name')} ({r['url']})", "excel": lambda r: r["id"]}
    def section(title, lines):
        return f"## {title}\n\n" + ("\n".join(lines) if lines else "nessuna") + "\n"
    added = [f"- {names[s]}: {label[s](r)}" + (" — entra da sola (id già nel banco)" if s == "twu" and r in certain else "")
             for s, d in diffs.items() for r in d["added"]]
    changed = [f"{_fmt_change(c)} ({names[s]})" for s, d in diffs.items() for c in d["changed"]]
    removed = [f"- {names[s]}: {label[s](r)}" for s, d in diffs.items() for r in d["removed"]]
    anom = [f"- {n}: rigidità o spin diversi tra la tabella TWU e il Compare (le misure nuove non vengono usate)" for n in anomalies]
    pend = [f"- {r['twu_name']} → id proposto `{r['id']}`: verifica e aggiungilo a data/agents/matches_overrides.json, poi toglilo da data/pending_matches.json"
            for r in pending]
    return (f"# Aggiornamento del {date}\n\n" + section("Novità", added) + "\n" + section("Valori cambiati", changed) + "\n"
            + section("Sparite", removed) + "\n" + section("Anomalie", anom) + "\n" + section("Da abbinare", pend))


def _default_fetchers(root):
    from pipeline import rpedia_site
    from pipeline.excel_extract import load_excel
    from pipeline.scope import in_scope
    from pipeline.twu_compare import fetch_compare
    from pipeline.twu_extract import fetch_twu, parse_twu

    def twu():
        html = fetch_twu()
        return html, [r for r in parse_twu(html) if in_scope(r["brand"], r["model"], r["gauge_label"], r["material"])]

    def excel():
        files = sorted((root / "data" / "source").glob("*.xlsx"), key=lambda p: p.stat().st_mtime)
        if not files:
            return None
        f = files[-1]
        modified = datetime.date.fromtimestamp(f.stat().st_mtime).isoformat()
        known = _load(root / "data" / "raw" / "sources.json", {}).get("excel") or {}
        if known.get("file") == f.name:
            return None  # stesso file già estratto: la data di modifica di un clone non dice nulla
        return f.name, modified, load_excel(f)

    return {"twu": twu, "twu_compare": fetch_compare, "racketpedia": rpedia_site.fetch_all, "excel": excel}


def _load(p, default=None):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def _write(p, text):
    """Scrive mantenendo le fine riga CRLF se il file le aveva (alcuni snapshot vengono da Windows)."""
    crlf = p.exists() and b"\r\n" in p.read_bytes()[:4096]
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes((text.replace("\n", "\r\n") if crlf else text).encode("utf-8"))


def _dump(obj):
    return json.dumps(obj, ensure_ascii=False, indent=1)


def run(offline=False, today=None, root=ROOT, fetchers=None, rebuild=True):
    root = pathlib.Path(root)
    today = today or datetime.date.today().isoformat()
    raw = root / "data" / "raw"
    old_twu = _load(raw / "twu.json", [])
    old_cmp = _load(raw / "twu_compare.json", {})
    old_rp = _load(raw / "racketpedia.json", [])
    old_excel = _load(raw / "excel.json", [])
    records = (_load(root / "data" / "strings.json", {}) or {}).get("strings", [])
    matches = _load(root / "data" / "agents" / "matches.json", [])
    if offline:
        html, new_twu, new_cmp, new_rp, new_excel = None, old_twu, old_cmp, old_rp, None
    else:
        f = fetchers or _default_fetchers(root)
        try:
            html, new_twu = f["twu"]()
            names = sorted({m["twu_name"] for m in matches if m.get("match") != "none" and m.get("twu_name")})
            new_cmp = f["twu_compare"](names)
            new_rp = f["racketpedia"]()
            new_excel = f["excel"]()
        except Exception as e:  # noqa: BLE001 — qualsiasi errore: nessun file scritto
            print(f"Aggiornamento interrotto, nessun file modificato: {type(e).__name__}: {e}")
            return 2
    as_rows = lambda d: [{"name": k, **v} for k, v in d.items()]
    diffs = {"twu": diff(old_twu, new_twu, "twu_name", TWU_FIELDS),
             "twu_compare": diff(as_rows(old_cmp), as_rows(new_cmp), "name", COMPARE_FIELDS),
             "racketpedia": diff(old_rp, new_rp, "url", RP_FIELDS)}
    if new_excel:
        diffs["excel"] = diff(_excel_flat(old_excel), _excel_flat(new_excel[2]), "id", EXCEL_FIELDS)
    twu_by_name = {r["twu_name"]: r for r in new_twu}
    anomalies = sorted(n for n, row in new_cmp.items() if n in twu_by_name and not consistent(row, twu_by_name[n]))
    certain, pending = classify_added(diffs["twu"]["added"], records)
    if not any(d["added"] or d["changed"] or d["removed"] for d in diffs.values()) and not new_excel:
        print("Nessuna novità.")
        return 0

    # da qui in poi si scrive
    _write(raw / "twu.json", _dump(new_twu))
    if html is not None:
        _write(raw / "twu.html", html)
    _write(raw / "twu_compare.json", json.dumps(new_cmp, ensure_ascii=False, indent=1, sort_keys=True))
    _write(raw / "racketpedia.json", _dump(new_rp))
    src = raw / "sources.json"
    if not offline:
        record_source("twu", url="https://twu.tennis-warehouse.com/learning_center/reporter2.php", path=src, today=today)
        record_source("twu_compare", url="https://twu.tennis-warehouse.com/learning_center/comparestrings.php", path=src, today=today)
        record_source("racketpedia", url="https://www.racketpedia.com/en-GB/tennis-strings", path=src, today=today)
    if new_excel:
        _write(raw / "excel.json", _dump(new_excel[2]))
        record_source("excel", file=new_excel[0], modified=new_excel[1], path=src)
    old_pending = _load(root / "data" / "pending_matches.json", [])
    seen = {p["twu_name"] for p in old_pending}
    all_pending = old_pending + [{"twu_name": r["twu_name"], "id": r["id"], "brand": r["brand"], "model": r["model"], "gauge_mm": r["gauge_mm"],
                                  "found": today} for r in pending if r["twu_name"] not in seen]
    _write(root / "data" / "pending_matches.json", _dump(all_pending))
    md = report(today, diffs, certain, pending, anomalies)
    _write(root / "data" / "changes" / f"{today}.md", md)
    print(md)
    if rebuild:
        crlf = [f for f in (root / "data").rglob("*.json") if b"\r\n" in f.read_bytes()[:4096]]
        for mod in REBUILD:
            subprocess.run([sys.executable, "-m", mod], cwd=root, check=True)
        for f in crlf:  # i moduli scrivono LF: si rimettono le CRLF dove c'erano, per non sporcare i diff
            b = f.read_bytes().replace(b"\r\n", b"\n")
            f.write_bytes(b.replace(b"\n", b"\r\n"))
    return 1


if __name__ == "__main__":
    sys.exit({0: 0, 1: 0}.get(run(offline="--offline" in sys.argv), 2))

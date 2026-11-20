"""Confronta una «List Rank» di Kerry Hlady (Stiff Index a 40/50/60/65 lb, tabelle affiancate per categoria) con lo
String chart in uso. Scrive un report in data/changes/ e ritorna le corde nuove e i valori cambiati. Non modifica i dati:
l'aggiornamento resta manuale (lo String chart ha anche allungamento e recupero, la List Rank solo lo Stiff Index).
Uso: python3 -m pipeline.excel_rank_diff data/source/list_rank_oct72026.xlsx"""
import datetime
import pathlib
import sys

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHART = ROOT / "data" / "source" / "String chart Aug 262026.xlsx"
LBS = (40, 50, 60, 65)


def norm(s):
    return " ".join(str(s).lower().replace("-", " ").split())


def parse_rank(path):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    out, cat, heads = [], None, []
    for r in ws.iter_rows(values_only=True):
        r = list(r) + [None] * 40
        if isinstance(r[2], str) and r[3] is None and r[2] != "Company" and not r[2].startswith("List Rank"):
            cat = r[2].strip()
            continue
        if r[2] == "Company":
            heads = [i for i, v in enumerate(r) if v == "Company"]
            continue
        for i in heads:
            comp, name, ga, typ, shape, lbs, si = r[i:i + 7]
            if comp and name and lbs in LBS and si is not None:
                out.append({"cat": cat, "brand": str(comp).strip(), "model": str(name).strip(), "gauge": str(ga).strip(),
                            "lbs": lbs, "stiff_index": round(float(si), 3)})
    return out


def parse_chart(path=CHART):
    ws = openpyxl.load_workbook(path, read_only=True, data_only=True).worksheets[0]
    out = {}
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[0] and r[5] in LBS and r[11] is not None:
            out.setdefault((norm(r[0]), norm(r[1]), norm(r[2])), {})[r[5]] = round(float(r[11]), 3)
    return out


def diff(rank_rows, chart):
    rk = {}
    for r in rank_rows:
        if r["cat"] and "POLY" in r["cat"].upper():
            rk.setdefault((norm(r["brand"]), norm(r["model"]), norm(r["gauge"])), {})[r["lbs"]] = r["stiff_index"]
    new = sorted(k for k in rk if k not in chart)
    changed = sorted((k, chart[k], rk[k]) for k in rk if k in chart
                     and any(abs(rk[k].get(l, 0) - chart[k].get(l, 0)) > 0.01 for l in LBS if l in rk[k]))
    return {"poly": len(rk), "new": new, "changed": changed}


def report(path, res):
    name = pathlib.Path(path).name
    lines = [f"# Confronto Excel: {name} contro {CHART.name}", "", f"Corde poly nella classifica: {res['poly']}.", "",
             f"## Corde nuove ({len(res['new'])})"] + [f"- {' '.join(k)}" for k in res["new"]] + \
            ["", f"## Stiff Index cambiato ({len(res['changed'])})"] + \
            [f"- {' '.join(k)}: prima {a}, ora {b}" for k, a, b in res["changed"]]
    return "\n".join(lines) + "\n"


if __name__ == "__main__":
    src = sys.argv[1]
    res = diff(parse_rank(src), parse_chart())
    out = ROOT / "data" / "changes" / f"excel-rank-{datetime.date.today().isoformat()}.md"
    out.parent.mkdir(exist_ok=True)
    out.write_text(report(src, res), encoding="utf-8")
    print(f"{res['poly']} poly; nuove {len(res['new'])}; cambiate {len(res['changed'])} -> {out}")

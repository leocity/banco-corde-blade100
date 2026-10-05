"""Composizione e validazione degli output degli agenti (spec §5.3–5.4)."""
import glob
import json
import sys

MATCH_ENUM = {"exact", "probable", "proxy", "none"}
RPEDIA_ENUM = {"exact", "proxy", "none"}
RPEDIA_PREFIX = "https://www.racketpedia.com/"


def assemble_matches(excel, twu, agent_rows):
    """Match automatici per id + righe degli agenti + record solo-TWU."""
    twu_ids = {r["id"]: r for r in twu}
    agent = {r["id"]: r for r in agent_rows}
    out = []
    for e in excel:
        if e["id"] in twu_ids:
            out.append({"id": e["id"], "twu_name": twu_ids[e["id"]]["twu_name"], "match": "exact", "note": "id identico"})
        elif e["id"] in agent:
            out.append(agent[e["id"]])
        else:
            out.append({"id": e["id"], "twu_name": None, "match": "none", "note": "nessun risultato agente"})
    claimed = {m["twu_name"] for m in out if m["match"] == "exact"}
    ids = {m["id"] for m in out}
    for t in twu:
        if t["twu_name"] not in claimed and t["id"] not in ids:
            out.append({"id": t["id"], "twu_name": t["twu_name"], "match": "exact", "note": "solo TWU"})
    return out


def validate_matches(matches, excel, twu):
    errs = []
    names = {t["twu_name"] for t in twu}
    seen = set()
    for m in matches:
        if m["id"] in seen:
            errs.append(f"id duplicato: {m['id']}")
        seen.add(m["id"])
        if m.get("match") not in MATCH_ENUM:
            errs.append(f"{m['id']}: match non valido {m.get('match')!r}")
        if m.get("match") == "none" and m.get("twu_name"):
            errs.append(f"{m['id']}: match none con twu_name")
        if m.get("match") != "none" and m.get("twu_name") not in names:
            errs.append(f"{m['id']}: twu_name sconosciuto {m.get('twu_name')!r}")
    for e in excel:
        if e["id"] not in seen:
            errs.append(f"manca il match per {e['id']}")
    exact = [m["twu_name"] for m in matches if m.get("match") == "exact"]
    for n in names:
        if exact.count(n) != 1:
            errs.append(f"riga TWU {n!r} con {exact.count(n)} match exact (attesi 1)")
    return errs


def validate_rpedia(rows, ids):
    errs = []
    got = {r["id"] for r in rows}
    for i in sorted(set(ids) - got):
        errs.append(f"manca la riga Racketpedia per {i}")
    for r in rows:
        if r["id"] not in ids:
            errs.append(f"id sconosciuto: {r['id']}")
        if r.get("match") not in RPEDIA_ENUM:
            errs.append(f"{r['id']}: match non valido {r.get('match')!r}")
        if r.get("static_stiffness_kgmm") is not None and not str(r.get("url") or "").startswith(RPEDIA_PREFIX):
            errs.append(f"{r['id']}: stiffness senza url Racketpedia")
    return errs


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    excel, twu = _load("data/raw/excel.json"), _load("data/raw/twu.json")
    agent = [r for p in sorted(glob.glob("data/agents/matches_*.json")) for r in _load(p)]
    matches = assemble_matches(excel, twu, agent)
    with open("data/agents/matches.json", "w", encoding="utf-8") as f:
        json.dump(matches, f, ensure_ascii=False, indent=1)
    errs = validate_matches(matches, excel, twu)
    ids = {m["id"] for m in matches}
    rp_parts = sorted(glob.glob("data/agents/rpedia_*.json"))
    if rp_parts:
        rp = [r for p in rp_parts for r in _load(p)]
        with open("data/agents/rpedia.json", "w", encoding="utf-8") as f:
            json.dump(rp, f, ensure_ascii=False, indent=1)
        errs += validate_rpedia(rp, ids)
    print("\n".join(errs) or f"OK: {len(matches)} record, 0 errori")
    sys.exit(1 if errs else 0)

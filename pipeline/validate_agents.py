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
    # più varianti colore sulla stessa riga TWU: la prima resta exact, le altre diventano probable
    exact_seen = set()
    for i, m in enumerate(out):
        if m["match"] == "exact":
            if m["twu_name"] in exact_seen:
                out[i] = {**m, "match": "probable", "note": (m.get("note") or "") + " (variante colore)"}
            exact_seen.add(m["twu_name"])
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


def project_rpedia(rows, matches, twu):
    """Riporta le righe Racketpedia (prodotte sull'unione Excel+TWU) sugli id finali.
    Se un id Excel ha assorbito una riga TWU (match exact) e non ha dati propri, eredita quelli dell'id TWU."""
    by_id = {r["id"]: r for r in rows}
    twu_id_by_name = {t["twu_name"]: t["id"] for t in twu}
    out = []
    for m in matches:
        row = dict(by_id.get(m["id"]) or {"id": m["id"], "url": None, "static_stiffness_kgmm": None,
                                          "shape": None, "composition": None, "match": "none"})
        if row.get("static_stiffness_kgmm") is None and m["match"] == "exact":
            alt = by_id.get(twu_id_by_name.get(m["twu_name"]))
            if alt and alt.get("static_stiffness_kgmm") is not None:
                row = {**alt, "id": m["id"]}
        out.append(row)
    return out


def drop_pending(twu, pending):
    """Le righe TWU nuove ancora da rivedere (data/pending_matches.json, scritto da pipeline.refresh) non diventano record."""
    skip = {p["twu_name"] for p in pending}
    return [t for t in twu if t["twu_name"] not in skip]


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    excel, twu = _load("data/raw/excel.json"), _load("data/raw/twu.json")
    try:
        twu = drop_pending(twu, _load("data/pending_matches.json"))
    except FileNotFoundError:
        pass
    agent = [r for p in sorted(glob.glob("data/agents/matches_*.json")) for r in _load(p)]
    matches = assemble_matches(excel, twu, agent)
    with open("data/agents/matches.json", "w", encoding="utf-8") as f:
        json.dump(matches, f, ensure_ascii=False, indent=1)
    errs = validate_matches(matches, excel, twu)
    ids = {m["id"] for m in matches}
    rp_parts = sorted(glob.glob("data/agents/rpedia_*.json"))
    if rp_parts:
        rp = project_rpedia([r for p in rp_parts for r in _load(p)], matches, twu)
        with open("data/agents/rpedia.json", "w", encoding="utf-8") as f:
            json.dump(rp, f, ensure_ascii=False, indent=1)
        errs += validate_rpedia(rp, ids)
    print("\n".join(errs) or f"OK: {len(matches)} record, 0 errori")
    sys.exit(1 if errs else 0)

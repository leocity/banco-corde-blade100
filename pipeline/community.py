"""Cosa dicono i giocatori e i tester indipendenti (forum, recensioni) di controllo e potenza, tenuti separati.
Sono opinioni: non entrano in punteggi, pairing, classifiche o mappa. Il marketing del produttore (kind «brand») non conta.
Un parere vale una persona (autore distinto), non un messaggio."""
import re

LEVEL = {"basso": 1, "medio": 2, "alto": 3}
ATTRS = ("control", "power", "spin", "comfort", "durability")
MAX_EVIDENCE = 3
# nomi generici dei forum -> modelli del banco (brand, nome nel file) -> nomi dei modelli
FORUM_ALIASES = {}


def norm_model(name):
    return re.sub(r"[^a-z0-9]", "", (name or "").lower())


def _word(mean):
    return "alto" if mean >= 2.5 else "basso" if mean <= 1.5 else "medio"


def aggregate(sources, attr):
    """Un valore per autore (media dei suoi pareri), poi media tra autori. None se nessuna fonte indipendente dice qualcosa."""
    by_author = {}
    for s in sources:
        lv = LEVEL.get(s.get(attr))
        if s.get("kind") == "brand" or lv is None:
            continue
        key = (s.get("author") or s.get("url") or "").strip().lower() or s.get("url")
        by_author.setdefault(key, []).append((lv, s))
    if not by_author:
        return None
    vals = [sum(lv for lv, _ in v) / len(v) for v in by_author.values()]
    mean = sum(vals) / len(vals)
    flat = [lv for v in by_author.values() for lv, _ in v]
    evidence = []
    for v in by_author.values():
        lv, s = v[0]
        if s.get("url") and s.get("quote") and len(evidence) < MAX_EVIDENCE:
            evidence.append({"url": s["url"], "site": s.get("site") or "", "quote": s["quote"], "level": s.get(attr)})
    return {"n": len(by_author), "mean": round(mean, 2), "word": _word(mean), "split": 3 in flat and 1 in flat, "evidence": evidence}


def build_community(forum_files, records, aliases=None):
    """Per ogni corda del banco il parere aggregato del suo modello (vale per tutti i calibri: i forum parlano del modello)."""
    aliases = aliases or {}
    by = {}
    for r in records:
        by.setdefault((r["brand"], norm_model(r["model"])), []).append(r["id"])
    out = {}
    for f in forum_files:
        brand = f.get("brand")
        for m in f.get("models", []):
            names = aliases.get((brand, m.get("model")), [m.get("model")])
            ids = [i for n in names for i in by.get((brand, norm_model(n)), [])]
            if not ids:
                continue
            comm = {a: aggregate(m.get("sources", []), a) for a in ATTRS}
            comm = {a: v for a, v in comm.items() if v}
            if not comm:
                continue
            comm["scope"] = "model"
            for i in ids:
                out[i] = comm
    return out

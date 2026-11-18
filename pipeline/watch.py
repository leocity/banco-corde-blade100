"""Controllo manuale delle novita': py -m pipeline.watch [--offline]

Legge TWU, Racketpedia e i feed RSS dei canali YouTube in data/watch/channels.json e scrive SOLO
data/changes/watch-AAAA-MM-GG.md con cio' che c'e' da rivedere a mano. Non tocca data/raw, non cambia punteggi.
Ogni fonte e' indipendente: se una non risponde lo dice nel rapporto e le altre vanno avanti.
Esito: 0 nessuna novita' (o --offline), 1 novita' da rivedere, 2 nessuna fonte ha risposto.
Il feed YouTube mostra solo gli ultimi 15 video: va lanciato almeno ogni 2-3 settimane.
"""
import datetime
import json
import pathlib
import re
import sys
import xml.etree.ElementTree as ET

from pipeline.refresh import TWU_FIELDS, diff

ROOT = pathlib.Path(__file__).resolve().parent.parent
BRANDS_OF_INTEREST = ("restring", "toroline", "solinco")
AFFILIATE_WORDS = ("affiliate", "discount", "coupon", "promo code", "use code", "code ", "codice", "sconto", "sponsor", "% off", "ref=", "partner")
REVERIFY_DAYS = 90
FEED_URL = "https://www.youtube.com/feeds/videos.xml?channel_id={}"
NS = {"a": "http://www.w3.org/2005/Atom", "m": "http://search.yahoo.com/mrss/"}


def _norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def of_interest(row):
    return _norm(row.get("brand")) in BRANDS_OF_INTEREST


def affiliate_hits(text):
    """Parole-chiave di affiliazione trovate in una descrizione («not sponsored» non conta)."""
    t = re.sub(r"\b(not|non)\s+sponsored\b", " ", (text or "").lower())
    return [w.strip() for w in AFFILIATE_WORDS if w in t]


def parse_feed(xml_text):
    root = ET.fromstring(xml_text)
    out = []
    for e in root.findall("a:entry", NS):
        link = e.find("a:link", NS)
        desc = e.find("m:group/m:description", NS)
        out.append({"title": (e.findtext("a:title", "", NS) or "").strip(), "url": link.get("href") if link is not None else None,
                    "published": (e.findtext("a:published", "", NS) or "")[:10], "description": (desc.text or "") if desc is not None else ""})
    return out


def _days(today, iso):
    try:
        return (datetime.date.fromisoformat(today) - datetime.date.fromisoformat(iso)).days
    except (TypeError, ValueError):
        return None


def _load(p, default):
    return json.loads(p.read_text(encoding="utf-8")) if p.exists() else default


def _default_fetchers():
    from pipeline import rpedia_site
    from pipeline.scope import in_scope
    from pipeline.twu_extract import fetch_twu, parse_twu

    def twu():
        return [r for r in parse_twu(fetch_twu()) if in_scope(r["brand"], r["model"], r["gauge_label"], r["material"])]

    return {"twu": twu, "racketpedia": rpedia_site.fetch_all, "youtube": lambda cid: rpedia_site.fetch(FEED_URL.format(cid))}


def _section(title, lines):
    return f"## {title}\n\n" + ("\n".join(lines) if lines else "nessuna") + "\n"


def run(offline=False, today=None, root=ROOT, fetchers=None):
    root = pathlib.Path(root)
    today = today or datetime.date.today().isoformat()
    f = fetchers or (_default_fetchers() if not offline else {})
    cfg = _load(root / "data/watch/channels.json", {"keywords": [], "channels": []})
    keywords = [k.lower() for k in cfg.get("keywords", [])]
    old_twu, old_rp = _load(root / "data/raw/twu.json", []), _load(root / "data/raw/racketpedia.json", [])
    known_urls = {r.get("url") for r in _load(root / "data/reviews_indep.json", [])}
    errors, twu_lines, rp_lines, video_lines = [], [], [], []
    news = 0
    ok_sources = 0

    if not offline:
        try:
            d = diff(old_twu, f["twu"](), "twu_name", TWU_FIELDS)
            ok_sources += 1
            twu_lines = [f"- nuova: {r['twu_name']} (stiffness_lbin {r.get('stiffness_lbin')}, spin {r.get('spin_potential')})"
                         for r in d["added"] if of_interest(r)]
            twu_lines += [f"- cambiata: {k} {fld} {a} -> {b}" for k, fld, a, b in d["changed"]]
        except Exception as e:  # noqa: BLE001
            errors.append(f"TWU: non raggiungibile ({type(e).__name__}: {e})")
        try:
            d = diff(old_rp, f["racketpedia"](), "url", {"kgmm": 0.05})
            ok_sources += 1
            rp_lines = [f"- nuova: {r.get('name')} ({r.get('url')}), {r.get('gauge_mm')} mm, kg/mm {r.get('kgmm')}" for r in d["added"] if of_interest(r)]
            rp_lines += [f"- cambiata: {k} {fld} {a} -> {b}" for k, fld, a, b in d["changed"]]
        except Exception as e:  # noqa: BLE001
            errors.append(f"Racketpedia: non raggiungibile ({type(e).__name__}: {e})")
        yt_ok = 0
        for c in cfg.get("channels", []):
            try:
                entries = parse_feed(f["youtube"](c["id"]))
                yt_ok += 1
            except Exception as e:  # noqa: BLE001
                errors.append(f"YouTube {c['name']}: feed non raggiungibile ({type(e).__name__}: {e})")
                continue
            for v in entries:
                if v["url"] in known_urls or not any(k in v["title"].lower() for k in keywords):
                    continue
                hits = affiliate_hits(v["description"])
                video_lines.append(f"- [ ] {v['title']} - {c['name']} ({c['class']}), {v['published']}\n  {v['url']}\n  parole di affiliazione nella descrizione: "
                                   + (", ".join(hits) if hits else "nessuna (non prova l'indipendenza)"))
        ok_sources += 1 if yt_ok else 0
    news = len(twu_lines) + len(rp_lines) + len(video_lines)

    due = []
    for c in cfg.get("channels", []):
        n = _days(today, c.get("verified"))
        if n is None or n > REVERIFY_DAYS:
            due.append(f"- {c['name']} ({c['class']}): ultima verifica {c.get('verified') or 'mai'}, da riverificare (ogni {REVERIFY_DAYS} giorni)")

    head = f"# Controllo novita' del {today}\n\n"
    if offline:
        head += "Modalita' offline: nessuna fonte interrogata, solo il controllo delle verifiche dei canali.\n\n"
    md = (head + _section("Da rivedere: TWU (marche di interesse e valori cambiati)", twu_lines) + "\n"
          + _section("Da rivedere: Racketpedia (marche di interesse)", rp_lines) + "\n"
          + _section("Da guardare: video con una corda nel titolo (nessuno entra senza revisione umana)", video_lines) + "\n"
          + _section("Canali da riverificare", due) + "\n" + _section("Errori", errors)
          + "\nNessun dato e nessun punteggio e' stato modificato.\n")
    out = root / "data" / "changes" / f"watch-{today}.md"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(md, encoding="utf-8")
    print(md)
    if not offline and ok_sources == 0:
        return 2
    return 1 if news else 0


if __name__ == "__main__":
    sys.exit(run(offline="--offline" in sys.argv))

"""Racketpedia (dati gratuiti): rigidità statica kg/mm dalle pagine pubbliche di marca, con abbinamento alle nostre corde.

Fonte: https://www.racketpedia.com/en-GB/tennis-strings/brand/<marca>?p=N (le liste sono paginate a 10).
Ogni riga ha l'URL della scheda. Le righe abbinate sostituiscono quelle scritte dall'agente (rpedia_g*.json) e
da noi a mano: il sito è la fonte primaria.
"""
import html
import json
import os
import pathlib
import re
import ssl
import sys
import time
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = "https://www.racketpedia.com"
BRANDS = ["restring", "toroline", "kirschbaum", "head", "signum-pro", "solinco", "grapplesnake", "luxilon", "yonex",
          "babolat", "tecnifibre"]
BRAND_NAME = {"restring": "Re-String", "signum-pro": "Signum Pro"}
COLOURS = {"black", "blue", "pink", "orange", "green", "yellow", "white", "neon", "matcha", "pom", "gry", "grey", "red", "silver",
           "gold", "bronze", "sky", "mint", "lavender", "fluo", "pomegranate", "brown", "carbon", "desert", "lime", "purple",
           "gray", "anthracite", "amber", "petrol", "sand", "natural"}


def parse_brand_page(text):
    """Righe {url, name, gauge_mm, kgmm, shape, composition} da una pagina di marca."""
    text = re.sub(r"<script.*?</script>|<style.*?</style>", "", text, flags=re.S)
    firsts = {}
    for m in re.finditer(r'href="(/en-GB/tennis-string/[^"]+)"', text):
        firsts.setdefault(m.group(1), m.start())
    order = sorted(firsts.items(), key=lambda x: x[1])
    rows = []
    for i, (href, pos) in enumerate(order):
        seg = text[pos:order[i + 1][1] if i + 1 < len(order) else len(text)]
        plain = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", seg)))
        st = re.search(r"average static stiffness is ([\d.]+) kg/mm", plain)
        name = re.search(r'class="card-label[^"]*">\s*(.*?)\s*(?:&nbsp;|<)', seg, flags=re.S)
        name = html.unescape(name.group(1)).strip() if name else None
        if not st or not name:
            continue
        g = re.search(r"\b(1\d\d)$", name)
        shape = re.search(r"with ([a-z ]+?) shape", plain)
        comp = re.search(r"composition based on ([A-Za-z ]*)\.", plain)
        rows.append({"url": BASE + href, "name": name, "gauge_mm": int(g.group(1)) / 100 if g else None,
                     "kgmm": float(st.group(1)), "shape": shape.group(1) if shape else None,
                     "composition": (comp.group(1).strip() or None) if comp else None})
    return rows


def _norm(s):
    return re.sub(r"[^a-z0-9 ]", "", s.lower().replace("-", ""))


def model_key(name, brand_words):
    """Nome senza marca, colore e calibro finale: 'ReString Zero Sky Blue 123' -> 'zero'."""
    words = [w for w in _norm(name).split() if w not in brand_words and not re.fullmatch(r"1\d\d", w) and w not in COLOURS]
    return " ".join(words)


ALIAS = {"pom": "pomegranate", "yl": "yellow", "pk": "pink", "blk": "black", "bk": "black", "ble": "blue", "gry": "grey",
         "fluo": "neon", "ornage": "orange"}


def colours_of(text):
    """Colori citati in un nome (con abbreviazioni normalizzate), senza 'neon/fluo' che non distinguono."""
    ws = {ALIAS.get(w, w) for w in _norm(text).split()}
    return {w for w in ws if w in COLOURS and w not in ("neon", "carbon", "sky")}


def match_rows(records, site_rows, base_model):
    """Abbina ogni corda a una riga del sito. exact = stesso modello, calibro (±0,015 mm) e colore (se la nostra
    riga ne indica uno); proxy = stesso modello ma altro calibro o altro colore (il calibro più vicino, a parità
    di calibro il colore uguale). Restituisce righe nel formato rpedia_*.json."""
    out = []
    by_brand = {}
    for r in site_rows:
        r = {**r, "model_key": model_key(r["name"], set(_norm(r["brand"]).split()) | {"restring"})}
        by_brand.setdefault(_norm(r["brand"]), []).append(r)
    for rec in records:
        cands = by_brand.get(_norm(rec["brand"]), [])
        key = _norm(base_model(rec["model"]))
        same = [c for c in cands if c["model_key"] == key]
        if not same:
            continue
        g = rec.get("gauge_mm")
        mine = colours_of(rec["model"])
        same.sort(key=lambda c: (round(abs((c["gauge_mm"] or 9) - (g or 9)), 3) > 0.015, -len(mine & colours_of(c["name"])),
                                 abs((c["gauge_mm"] or 9) - (g or 9))))
        best = same[0]
        gauge_ok = g is not None and best["gauge_mm"] is not None and abs(best["gauge_mm"] - g) <= 0.015
        colour_ok = not mine or bool(mine & colours_of(best["name"]))
        exact = gauge_ok and colour_ok
        out.append({"id": rec["id"], "url": best["url"], "static_stiffness_kgmm": best["kgmm"],
                    "shape": best["shape"], "composition": best["composition"].title() if best["composition"] else None,
                    "match": "exact" if exact else "proxy", "site_name": best["name"]})
    return out


def apply_site(records, site_rows, base_model):
    """Aggiorna r['rpedia'] sulle corde: una riga esistente con URL presente nel sito viene verificata sul valore del sito;
    le righe mancanti o 'proxy' vengono sostituite dall'abbinamento migliore; una riga 'exact' con URL fuori dalla
    lista (scheda non elencata) si lascia. Restituisce il registro delle modifiche."""
    by_url = {r["url"]: r for r in site_rows}
    found = {m["id"]: m for m in match_rows(records, site_rows, base_model)}
    log = []
    for rec in records:
        old = rec.get("rpedia") or {}
        ov = old.get("static_stiffness_kgmm")
        new = found.get(rec["id"])
        if ov is not None and old.get("url") in by_url:
            s = by_url[old["url"]]
            if abs(s["kgmm"] - ov) > 1e-9:
                log.append((rec["id"], "verificato", ov, s["kgmm"], s["name"]))
                old["static_stiffness_kgmm"] = s["kgmm"]
            g = rec.get("gauge_mm")
            old_ok = old.get("match") == "exact" and g is not None and s["gauge_mm"] is not None and abs(s["gauge_mm"] - g) <= 0.015
            if new and new["match"] == "exact" and not old_ok:
                if new["url"] == old["url"]:
                    old["match"] = "exact"
                else:  # c'è una scheda dello stesso calibro e colore: meglio della proxy o di un abbinamento a calibro sbagliato
                    log.append((rec["id"], "sostituito", ov, new["static_stiffness_kgmm"], new["site_name"]))
                    rec["rpedia"] = {k: new[k] for k in ("url", "static_stiffness_kgmm", "shape", "composition", "match")}
            continue
        if ov is not None and old.get("match") == "exact":
            continue
        if new:
            log.append((rec["id"], "nuovo" if ov is None else "sostituito", ov, new["static_stiffness_kgmm"], new["site_name"]))
            rec["rpedia"] = {k: new[k] for k in ("url", "static_stiffness_kgmm", "shape", "composition", "match")}
    return log


def _ctx():
    ca = os.environ.get("SSL_CERT_FILE") or os.environ.get("REQUESTS_CA_BUNDLE") or "/root/.ccr/ca-bundle.crt"
    return ssl.create_default_context(cafile=ca if os.path.exists(ca) else None)


def fetch(url, retries=3):
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "banco-corde/1.0 (uso personale)"})
            with urllib.request.urlopen(req, timeout=40, context=_ctx()) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            if i == retries - 1:
                raise
            time.sleep(2 ** i)


def fetch_all():
    rows = []
    for slug in BRANDS:
        seen = set()
        for p in range(1, 12):
            page = parse_brand_page(fetch(f"{BASE}/en-GB/tennis-strings/brand/{slug}?p={p}"))
            new = [r for r in page if r["url"] not in seen]
            if not new:
                break
            for r in new:
                seen.add(r["url"])
                rows.append({**r, "brand": BRAND_NAME.get(slug, slug.title()), "brand_slug": slug})
            time.sleep(0.5)
    for r in rows:
        r["model_key"] = model_key(r["name"], set(_norm(r["brand"]).split()) | {"restring"})
    return rows


if __name__ == "__main__":
    rows = fetch_all()
    out = ROOT / "data" / "raw" / "racketpedia.json"
    out.write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(rows)} righe Racketpedia da {len(BRANDS)} marche -> {out}")

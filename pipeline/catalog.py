"""Completezza del catalogo: corde delle marche richieste che non hanno dati di laboratorio (spec v2 §3)."""
from pipeline.estimate import base_model
from pipeline.scope import gauge_to_mm, normalize_brand, normalize_gauge, normalize_model, string_id


def _key(brand, model):
    # i colori non fanno un prodotto nuovo (Wasabi Green = Wasabi)
    return normalize_brand(brand), base_model(normalize_model(model))


def _norm(item):
    brand, model = normalize_brand(item["brand"]), normalize_model(item["model"])
    label = normalize_gauge(item.get("gauge_label"))
    mm = item.get("gauge_mm") or gauge_to_mm(label, brand=brand, model=model)
    return brand, model, label, mm


def _present(records, item):
    brand, model, label, mm = _norm(item)
    sid = string_id(brand, model, label) if label else None
    for r in records:
        if sid and r["id"] == sid:
            return True
        if _key(r["brand"], r["model"]) == _key(brand, model) and mm and r.get("gauge_mm") \
                and abs(r["gauge_mm"] - mm) <= 0.02:
            return True
    return False


def add_catalog_only(records, catalog):
    out = list(records)
    for item in catalog:
        if _present(out, item):
            continue
        brand, model, label, mm = _norm(item)
        out.append({
            "id": string_id(brand, model, label or f"{mm:.2f}"),
            "brand": brand, "model": model, "gauge_label": label, "gauge_mm": mm,
            "shape": item.get("shape"), "shape_source": item.get("source_url"),
            "material": item.get("material") or "copoly",
            "is_target": True, "excel": None, "twu": None, "rpedia": None,
            "catalog_only": True, "preference": None, "coverage": 0,
        })
    return out


def missing_from(records, catalog):
    return [f"{i['brand']} {i['model']} {i.get('gauge_mm')}" for i in catalog if not _present(records, i)]


def clean_catalog(catalog, shapes, exclude):
    """Applica le forme già verificate (controllo incrociato) e toglie le righe non attendibili."""
    sh = {(normalize_brand(x["brand"]), base_model(normalize_model(x["model"]))): x for x in shapes}
    out = []
    for item in catalog:
        k = _key(item["brand"], item["model"])
        if any(_key(e["brand"], e["model"]) == k and abs(e["gauge_mm"] - (item.get("gauge_mm") or 0)) <= 0.005
               for e in exclude):
            continue
        if k in sh:
            item = {**item, "shape": sh[k]["shape"], "source_url": sh[k]["source"]}
        out.append(item)
    return out


def add_extra(records, extra):
    """Corde trovate nei cataloghi attuali (data/catalog_extra.json) con i loro dati gratuiti: TWU esatto e Racketpedia esatto."""
    out = list(records)
    for item in (extra or {}).get("add", []):
        brand, model, label, mm = _norm(item)
        # presente solo se stesso modello e calibro entro 0,015 mm (l'etichetta «17» vale sia 1,20 sia 1,23)
        if any(_key(r["brand"], r["model"]) == _key(brand, model) and r.get("gauge_mm") and abs(r["gauge_mm"] - mm) <= 0.015 for r in out):
            continue
        if any(r["id"] == string_id(brand, model, label) for r in out):
            label = f"{mm:.2f}"
        t, rp = item.get("twu"), item.get("rpedia")
        twu = ({"twu_name": t.get("name"), "match": "exact", "ref_tension_lbs": 51, "swing": "Fast", "stiffness_lbin": t.get("stiffness_lbin"),
                "tension_loss_pct": t.get("tension_loss_pct"), "spin_potential": t.get("spin_potential")} if t and t.get("stiffness_lbin") is not None else None)
        rped = ({"static_stiffness_kgmm": rp["kgmm"], "url": rp.get("url"), "match": "exact"} if rp and rp.get("kgmm") is not None else None)
        out.append({
            "id": string_id(brand, model, label or f"{mm:.2f}"),
            "brand": brand, "model": model, "gauge_label": label, "gauge_mm": mm,
            "shape": item.get("shape"), "shape_source": item.get("maker_url"), "material": item.get("material") or "copoly",
            "is_target": True, "excel": None, "twu": twu, "rpedia": rped,
            "catalog_only": not (twu or rped), "preference": None, "coverage": int(bool(twu)) + int(bool(rped)),
            "extra_source": item.get("maker_url"),
        })
    return out


def apply_rpedia_fixes(records, extra):
    """Schede Racketpedia trovate a mano: «exact» diventa una misura, «altro colore» resta un valore ricavato (proxy)."""
    by = {r["id"]: r for r in records}
    done = []
    for f in (extra or {}).get("fix_rpedia", []):
        r = by.get(f["id"])
        if not r or f.get("kgmm") is None:
            continue
        r["rpedia"] = {**(r.get("rpedia") or {}), "static_stiffness_kgmm": f["kgmm"], "url": f.get("url"),
                       "match": "exact" if f.get("match") == "exact" else "proxy", "note": f.get("note")}
        done.append(r["id"])
    return done

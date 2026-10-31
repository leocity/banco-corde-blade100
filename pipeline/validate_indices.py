"""Quanto gli indici costruiti (controllo, potenza, comfort…) concordano con ciò che dicono i tester indipendenti.
Solo recensioni dello stesso calibro e non di marca (la copia del produttore è marketing). Correlazione di rango, con n: serve a dire
quanto fidarsi dell'indice, non a cambiarlo."""
MIN_N = 6


def _ranks(xs):
    order = sorted(range(len(xs)), key=lambda i: xs[i])
    out = [0.0] * len(xs)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and xs[order[j + 1]] == xs[order[i]]:
            j += 1
        for k in range(i, j + 1):
            out[order[k]] = (i + j) / 2 + 1
        i = j + 1
    return out


def spearman(xs, ys):
    if len(xs) < 4:
        return None
    a, b = _ranks(xs), _ranks(ys)
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    num = sum((x - ma) * (y - mb) for x, y in zip(a, b))
    da, db = sum((x - ma) ** 2 for x in a), sum((y - mb) ** 2 for y in b)
    return None if da == 0 or db == 0 else round(num / (da * db) ** 0.5, 2)


def is_brand(src):
    site, note = (src.get("site") or "").lower(), (src.get("note") or "").lower()
    return "brand" in site or "shop" in site or "marketing" in note


def _inv(v):
    return None if v is None else 100 - v


# indice -> (livello recensito da confrontare, come si ricava dalle dimensioni)
INDICES = {
    "control": ("control", lambda d: d.get("control")),
    "power": ("power", lambda d: _inv(d.get("control"))),
    "comfort": ("comfort", lambda d: _inv(d.get("stiffness"))),
    "stiffness": ("stiffness", lambda d: d.get("stiffness")),
    "spin": ("spin", lambda d: d.get("spin")),
    "durability": ("durability", lambda d: d.get("durability")),
}


def index_validation(records):
    out = {}
    for key, (level, f) in INDICES.items():
        xs, ys = [], []
        for r in records:
            v = f((r.get("derived") or {}).get("dims") or {})
            lv = [s["levels"][level] for s in (r.get("reviews") or {}).get("sources", [])
                  if s.get("levels") and s["levels"].get(level) is not None and not s.get("gauge_mismatch") and not is_brand(s)]
            if v is not None and lv:
                xs.append(v)
                ys.append(sum(lv) / len(lv))
        out[key] = {"rho": spearman(xs, ys) if len(xs) >= MIN_N else None, "n": len(xs)}
    return out

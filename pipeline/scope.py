"""Normalizzazione di marca/modello/calibro e filtro di ambito (spec §3)."""
import re

BRAND_ALIASES = {
    "wlson": "Wilson",
    "wilson": "Wilson",
    "grapplesnake cube": "Grapplesnake",
    "grapplesnake": "Grapplesnake",
    "re-string": "Re-String",
    "restring": "Re-String",
    "re string": "Re-String",
    "krischbaum": "Kirschbaum",
    "kirschbaum": "Kirschbaum",
    "signum pro": "Signum Pro",
    "signum": "Signum Pro",
}

# chiave: modello in minuscolo, trattini -> spazi, spazi compressi
MODEL_ALIASES = {
    "confidental": "Confidential",
    "hyper g": "Hyper-G",
    "hyper g green": "Hyper-G",
    "hyper g soft": "Hyper-G Soft",
    "o toro": "O-Toro",
    "toro toro ornage": "Toro Toro Orange",
    "wasabi pom": "Wasabi Pom",
}

GAUGE_MM = {"16": 1.30, "16L": 1.25, "17": 1.20, "17L": 1.18}
GAUGES_IN_SCOPE = set(GAUGE_MM)
POLY_MATERIALS = {"poly", "copoly", "co-poly", "polyester"}

TARGET_ALL = {"Solinco", "Re-String", "Toroline", "Grapplesnake"}
TARGET_PREFIXES = {"Wilson": ("revolve",), "Babolat": ("rpm blast",)}
COMPETITOR_PREFIXES = {
    "Luxilon": ("alu power", "4g", "element"),
    "Yonex": ("poly tour pro", "poly tour rev", "poly tour spin"),
    "Head": ("lynx tour", "hawk"),
    "Tecnifibre": ("razor", "ice code"),
    "Kirschbaum": ("",),
    "Signum Pro": ("",),
}


def _key(s: str) -> str:
    return re.sub(r"\s+", " ", str(s).replace("-", " ")).strip().lower()


def normalize_brand(raw: str) -> str:
    collapsed = re.sub(r"\s+", " ", str(raw)).strip()
    return BRAND_ALIASES.get(collapsed.lower(), collapsed)


def normalize_model(raw: str) -> str:
    collapsed = re.sub(r"\s+", " ", str(raw)).strip()
    collapsed = re.sub(r"\s*-\s*", "-", collapsed)
    return MODEL_ALIASES.get(_key(collapsed), collapsed)


def normalize_gauge(raw) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip().upper()
    return s or None


def gauge_to_mm(label: str, declared_mm: float | None = None) -> float | None:
    if declared_mm:
        return declared_mm
    return GAUGE_MM.get(normalize_gauge(label))


def _model_matches(model: str, prefixes) -> bool:
    k = _key(model)
    return any(k.startswith(_key(p)) for p in prefixes)


def is_target(brand: str, model: str) -> bool:
    if brand in TARGET_ALL:
        return True
    return brand in TARGET_PREFIXES and _model_matches(model, TARGET_PREFIXES[brand])


def is_competitor(brand: str, model: str) -> bool:
    return brand in COMPETITOR_PREFIXES and _model_matches(model, COMPETITOR_PREFIXES[brand])


def in_scope(brand: str, model: str, gauge_label, material) -> bool:
    if normalize_gauge(gauge_label) not in GAUGES_IN_SCOPE:
        return False
    if str(material).strip().lower() not in POLY_MATERIALS:
        return False
    return is_target(brand, model) or is_competitor(brand, model)


def string_id(brand: str, model: str, gauge_label) -> str:
    raw = f"{brand} {model} {normalize_gauge(gauge_label)}".lower()
    return re.sub(r"[^a-z0-9]+", "-", raw).strip("-")

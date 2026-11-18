"""Recensioni indipendenti (data/reviews_indep.json, audit D §4): validatore. Nessuna frase senza visione del video."""
import re

CLASSES = {"indipendente", "indipendente con riserva", "non verificabile", "con affiliazioni", "commerciale"}
DATE = re.compile(r"^(≈\d{4}(-\d{2})?|\d{4}-\d{2}-\d{2})$")
KINDS = {"video", "articolo"}


def validate_indep(rows, string_ids):
    errs, seen = [], set()
    for i, r in enumerate(rows):
        w = f"riga {i} ({r.get('string_id')}, {r.get('url')})"
        if r.get("string_id") not in string_ids:
            errs.append(f"{w}: id corda inesistente")
        if not str(r.get("url") or "").startswith("https://"):
            errs.append(f"{w}: url non https")
        if r.get("class") not in CLASSES:
            errs.append(f"{w}: classe non valida")
        if r.get("date") is not None and not DATE.match(str(r.get("date"))):
            errs.append(f"{w}: data non valida (≈AAAA, ≈AAAA-MM, AAAA-MM-GG o null se ignota)")
        if r.get("kind") not in KINDS:
            errs.append(f"{w}: tipo non valido")
        if not r.get("channel"):
            errs.append(f"{w}: canale mancante")
        if not isinstance(r.get("verified_by_viewing"), bool):
            errs.append(f"{w}: verified_by_viewing deve essere vero o falso")
        if r.get("phrase") and not r.get("verified_by_viewing"):
            errs.append(f"{w}: frase senza visione del video")
        key = (r.get("string_id"), r.get("url"))
        if key in seen:
            errs.append(f"{w}: duplicata")
        seen.add(key)
    return errs

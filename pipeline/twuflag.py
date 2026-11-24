"""Corde con verdetto crosscheck «contradicted»: il loro dato TWU è contestato e non deve entrare nei calcoli.

Il blocco vale per punteggio, tensione di partenza, stime (anche come gemello di altre corde), ibridi ed export.
Il dato TWU resta nel record e nel blocco `lab` (la pagina continua a mostrarlo): il blocco è temporaneo,
`quarantine_twu` lo nasconde durante stime e derivazioni e `restore_twu` lo rimette.

Due motivi, entrambi bloccati (togli una voce da BLOCK_ISSUES per sbloccare quel motivo):
- «abbinamento»: la riga TWU non è della corda (calibro o modello sbagliato, riga proxy);
- «contestata»: la riga è della corda ma contraddice i test di gioco. Qui il verdetto nasce da fonti qualitative: è la
  scelta dichiarata del progetto per questi casi, non una regola generale (le recensioni non entrano nei calcoli)."""

BLOCK_ISSUES = ("abbinamento", "contestata")
TWU_STIFF_KINDS = ("misurata", "parente")
TWU_SPIN_KINDS = ("misurato", "parente")


def twu_flag(rec):
    """None se il dato TWU è utilizzabile, altrimenti {untrusted, reason, note, twu_name}."""
    if "twu_flag" in rec:
        return rec["twu_flag"]
    cc = rec.get("crosscheck") or {}
    t = rec.get("twu")
    if cc.get("verdict") != "contradicted" or not t:
        return None
    reason = cc.get("twu_issue") or ("abbinamento" if t.get("match") != "exact" else "contestata")
    if reason not in BLOCK_ISSUES:
        return None
    return {"untrusted": True, "reason": reason, "note": cc.get("note", ""), "twu_name": t.get("twu_name")}


def quarantine_twu(records):
    """Nasconde TWU (e le stime che ne derivano) nelle corde contestate; ritorna cosa ripristinare. Idempotente."""
    stash = []
    for r in records:
        f = twu_flag(r)
        if not f:
            continue
        r["twu_flag"] = f
        for field, kinds in (("twu", None), ("stiffness", TWU_STIFF_KINDS), ("spin", TWU_SPIN_KINDS)):
            v = r.get(field)
            if v and (kinds is None or v.get("kind") in kinds):
                stash.append((r, field, v))
                r[field] = None
    return stash


def restore_twu(records, stash):
    for r, field, v in stash:
        r[field] = v

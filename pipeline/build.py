"""merged.json + metriche derivate + note -> data/strings.json (spec §5–6)."""
import datetime
import json
import pathlib

from pipeline.derive import ANCHOR_TENSIONS, DEFAULT_WEIGHTS, derive_all

ROOT = pathlib.Path(__file__).resolve().parent.parent


def build(records, notes):
    discriminant = derive_all(records)
    for r in records:
        r["notes"] = notes.get(r["id"], {})
    twu_refs = {(r["twu"]["ref_tension_lbs"], r["twu"]["swing"]) for r in records if r["twu"]}
    ref = ", ".join(f"{t} lbs swing {'veloce' if s == 'Fast' else s}" for t, s in sorted(twu_refs))
    return {
        "generated": datetime.date.today().isoformat(),
        "weights_default": DEFAULT_WEIGHTS,
        "anchors": ANCHOR_TENSIONS,
        "discriminant": discriminant,
        "insight": notes.get("_insight", ""),
        "guide": {"twu_ref": ref},
        "strings": records,
    }


if __name__ == "__main__":
    records = json.loads((ROOT / "data" / "merged.json").read_text(encoding="utf-8"))
    p = ROOT / "data" / "notes.json"
    notes = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    out = build(records, notes)
    (ROOT / "data" / "strings.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    rs = sorted([r for r in records if r["derived"]["profile_score"] is not None],
                key=lambda r: -r["derived"]["profile_score"])
    print("top 10 punteggio:", [(r["id"], r["derived"]["profile_score"]) for r in rs[:10]])
    sim = sorted([r for r in records if r["preference"] != "liked"],
                 key=lambda r: -max([v for v in r["derived"]["similarity_liked"].values() if v is not None] or [-1]))
    print("top 10 somiglianza:", [(r["id"], r["derived"]["similarity_liked"]) for r in sim[:10]])
    print("discriminanti:", out["discriminant"])
    print("ancore:", [(r["id"], r["derived"]["subscores"], r["derived"]["similarity_liked"], r["derived"]["similarity_disliked"]) for r in records if r["preference"]])

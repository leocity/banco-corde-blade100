"""P4: nessuna nota promette durate (ore/settimane di gioco) né chiama «snapback» uno spin da percentile."""
import json
import pathlib
import re

from pipeline.notes_gen import generate_notes

ROOT = pathlib.Path(__file__).resolve().parent.parent
BAD = re.compile(r"\b(ore|settimane|settimana|snapback)\b", re.I)


def _rec(spin_band, dur_band):
    return {"id": "x", "twu": {"twu_name": "B M", "match": "exact", "spin_potential": 8.0, "tension_loss_pct": 40.0},
            "shape": "HEX", "spin": {"kind": "misurato", "value": 8.0}, "stiffness": {"kind": "misurata", "value_lbin": 200.0},
            "derived": {"dims": {"stiffness": 50}, "subscores": {"spin": spin_band, "durability": dur_band},
                        "similarity_liked": {}, "similarity_disliked": {}}}


def test_generated_notes_have_no_durations_or_snapback():
    for sp in (90, 50, 10):
        for du in (90, 50, 10):
            r = _rec(sp, du)
            notes = generate_notes(r)
            assert not any(BAD.search(v) for v in notes.values()), (sp, du, notes)


def test_manual_notes_have_no_durations_or_snapback():
    notes = json.loads((ROOT / "data/notes.json").read_text(encoding="utf-8"))
    for sid, n in notes.items():
        if isinstance(n, dict):
            for k, v in n.items():
                assert not BAD.search(v), (sid, k, v)


def test_built_notes_clean():
    d = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
    for s in d["strings"]:
        for k, v in s["notes"].items():
            assert not BAD.search(v), (s["id"], k, v)

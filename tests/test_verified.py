"""Il blocco `verified` della pagina online (unica copia, recuperata il 2026-11-18) deve arrivare nei dati della pagina."""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent


def test_verified_block_survives_build():
    out = json.loads((ROOT / "data" / "strings.json").read_text(encoding="utf-8"))
    assert out["verified"] == {"date": "2026-11-17", "note": "A5 1,25; Caviar 1,24/1,20; Enso Pro 16L 1,24 (TW Europe, Toroline, Racketpedia)"}

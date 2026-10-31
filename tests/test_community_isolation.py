"""I pareri dei tester sono opinioni: non devono mai entrare in pairing, punteggi, classifiche, mappa o usura."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
FORBIDDEN = ["web/pairing.js", "web/choose.js", "web/map.js", "web/compare.js", "web/wear.js", "web/state.js", "web/trials.js", "web/persist.js",
             "pipeline/pairing.py", "pipeline/dims.py", "pipeline/derive.py", "pipeline/estimate.py"]


def test_community_never_feeds_scores_rankings_map_or_wear():
    offenders = [f for f in FORBIDDEN if "community" in (ROOT / f).read_text(encoding="utf-8")]
    assert offenders == []


def test_pairing_and_dims_are_identical_with_or_without_community():
    import json
    data = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
    for r in data["strings"]:
        assert "community" not in r["derived"], r["id"]

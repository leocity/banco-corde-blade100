"""I pareri dei tester sono opinioni: non devono mai entrare in pairing, punteggi, classifiche, mappa o usura."""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
# v6: confronti e consigli vivono in cmp.js, next.js, rulers.js, hybrid.js; né recensioni né pareri dei forum ci entrano
FORBIDDEN = ["web/cmp.js", "web/next.js", "web/rulers.js", "web/hybrid.js", "web/state.js", "web/persist.js",
             "pipeline/pairing.py", "pipeline/lab.py", "pipeline/dims.py", "pipeline/derive.py", "pipeline/estimate.py"]


def test_community_never_feeds_scores_rankings_map_or_wear():
    offenders = [f for f in FORBIDDEN if "community" in (ROOT / f).read_text(encoding="utf-8")]
    assert offenders == []


def test_pairing_and_dims_are_identical_with_or_without_community():
    import json
    data = json.loads((ROOT / "data/strings.json").read_text(encoding="utf-8"))
    for r in data["strings"]:
        assert "community" not in r["derived"], r["id"]


def test_reviews_never_feed_comparisons_or_advice():
    for f in ["web/cmp.js", "web/next.js", "web/rulers.js", "web/hybrid.js", "pipeline/lab.py"]:
        src = (ROOT / f).read_text(encoding="utf-8")
        assert "review" not in src and "indep" not in src, f

"""P5: pipeline.watch legge TWU, Racketpedia e i feed YouTube (fetcher iniettati, mai rete) e scrive solo data/changes/watch-<data>.md."""
import json
import pathlib

import pytest

from pipeline import watch

ROOT = pathlib.Path(__file__).resolve().parent.parent
FEED = """<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <entry><title>ReString SLAP review</title><link rel="alternate" href="https://www.youtube.com/watch?v=AAA"/>
  <published>2026-11-10T10:00:00+00:00</published>
  <media:group><media:description>Use code TEST10 for 10% off. Affiliate link below.</media:description></media:group></entry>
 <entry><title>Vlog di una domenica</title><link rel="alternate" href="https://www.youtube.com/watch?v=BBB"/>
  <published>2026-11-09T10:00:00+00:00</published><media:group><media:description>niente</media:description></media:group></entry>
 <entry><title>O-Toro Tour dopo 3 mesi</title><link rel="alternate" href="https://www.youtube.com/watch?v=CCC"/>
  <published>2026-11-01T10:00:00+00:00</published><media:group><media:description>Not sponsored.</media:description></media:group></entry>
</feed>"""


def twu_row(name, brand, stiff=200.0, spin=7.0):
    return {"twu_name": name, "id": name.lower().replace(" ", "-"), "brand": brand, "model": "M", "stiffness_lbin": stiff,
            "tension_loss_pct": 30.0, "spin_potential": spin}


def rp_row(url, name, brand):
    return {"url": url, "name": name, "brand": brand, "gauge_mm": 1.23, "kgmm": 0.9}


@pytest.fixture
def root(tmp_path):
    (tmp_path / "data/raw").mkdir(parents=True)
    (tmp_path / "data/watch").mkdir(parents=True)
    (tmp_path / "data/raw/twu.json").write_text(json.dumps([twu_row("Toroline O-Toro 17", "Toroline")]), encoding="utf-8")
    (tmp_path / "data/raw/racketpedia.json").write_text(json.dumps([rp_row("https://rp/a", "A", "Toroline")]), encoding="utf-8")
    (tmp_path / "data/watch/channels.json").write_text(json.dumps({
        "keywords": ["slap", "o-toro"],
        "channels": [{"id": "UC1", "name": "TK Tennis", "class": "indipendente", "verified": "2026-11-18", "feed_checked_url": None},
                     {"id": "UC2", "name": "Vecchio", "class": "non verificabile", "verified": "2026-01-01"}]}), encoding="utf-8")
    return tmp_path


def fetchers(**over):
    f = {"twu": lambda: [twu_row("Toroline O-Toro 17", "Toroline", stiff=210.0), twu_row("Re-String Slap 17", "Re-String"),
                         twu_row("Wilson Nuova 16", "Wilson")],
         "racketpedia": lambda: [rp_row("https://rp/a", "A", "Toroline"), rp_row("https://rp/b", "ReString Slap", "Re-String"),
                                 rp_row("https://rp/c", "Altra", "Wilson")],
         "youtube": lambda cid: FEED}
    f.update(over)
    return f


def snapshot(root):
    return {str(p.relative_to(root)): p.read_bytes() for p in root.rglob("*") if p.is_file()}


def test_writes_only_the_report(root):
    before = snapshot(root)
    assert watch.run(today="2026-11-18", root=root, fetchers=fetchers()) == 1
    after = snapshot(root)
    new = set(after) - set(before)
    assert new == {"data/changes/watch-2026-11-18.md"}
    assert all(after[k] == before[k] for k in before)


def test_report_content(root):
    watch.run(today="2026-11-18", root=root, fetchers=fetchers())
    md = (root / "data/changes/watch-2026-11-18.md").read_text(encoding="utf-8")
    assert "Re-String Slap 17" in md and "Wilson Nuova 16" not in md          # solo marche di interesse
    assert "stiffness_lbin" in md and "200.0" in md and "210.0" in md          # valore cambiato
    assert "https://rp/b" in md and "https://rp/c" not in md
    assert "https://www.youtube.com/watch?v=AAA" in md and "https://www.youtube.com/watch?v=CCC" in md
    assert "watch?v=BBB" not in md                                              # il titolo non cita nessuna corda
    assert "affiliate" in md.lower() and "TK Tennis" in md and "indipendente" in md
    assert "Vecchio" in md and "da riverificare" in md                          # verifica canale oltre 90 giorni
    assert "- [ ]" in md                                                        # casella manuale


def test_videos_already_in_reviews_are_not_new(root):
    (root / "data/reviews_indep.json").write_text(json.dumps([{"url": "https://www.youtube.com/watch?v=AAA"}]), encoding="utf-8")
    watch.run(today="2026-11-18", root=root, fetchers=fetchers())
    md = (root / "data/changes/watch-2026-11-18.md").read_text(encoding="utf-8")
    assert "watch?v=AAA" not in md and "watch?v=CCC" in md


def test_nothing_new_returns_0(root):
    f = fetchers(twu=lambda: [twu_row("Toroline O-Toro 17", "Toroline")], racketpedia=lambda: [rp_row("https://rp/a", "A", "Toroline")],
                 youtube=lambda cid: "<feed xmlns='http://www.w3.org/2005/Atom'></feed>")
    (root / "data/watch/channels.json").write_text(json.dumps({"keywords": ["slap"], "channels": [
        {"id": "UC1", "name": "TK", "class": "indipendente", "verified": "2026-11-18"}]}), encoding="utf-8")
    assert watch.run(today="2026-11-18", root=root, fetchers=f) == 0
    assert (root / "data/changes/watch-2026-11-18.md").exists()


def test_one_source_failing_is_reported_not_fatal(root):
    def boom():
        raise OSError("rete giu'")
    assert watch.run(today="2026-11-18", root=root, fetchers=fetchers(twu=boom)) == 1
    md = (root / "data/changes/watch-2026-11-18.md").read_text(encoding="utf-8")
    assert "TWU: non raggiungibile" in md and "rete giu'" in md and "https://rp/b" in md


def test_all_sources_failing_returns_2(root):
    def boom(*a):
        raise OSError("x")
    assert watch.run(today="2026-11-18", root=root, fetchers={"twu": boom, "racketpedia": boom, "youtube": boom}) == 2


def test_offline_makes_no_fetch(root):
    def boom(*a):
        raise AssertionError("rete usata in offline")
    watch.run(offline=True, today="2026-11-18", root=root, fetchers={"twu": boom, "racketpedia": boom, "youtube": boom})
    md = (root / "data/changes/watch-2026-11-18.md").read_text(encoding="utf-8")
    assert "offline" in md.lower() and "da riverificare" in md


def test_affiliate_keywords():
    assert watch.affiliate_hits("Use code ABC for 10% off") and watch.affiliate_hits("Affiliate links") == ["affiliate"]
    assert watch.affiliate_hits("Not sponsored") == []


def test_real_channels_file():
    d = json.loads((ROOT / "data/watch/channels.json").read_text(encoding="utf-8"))
    ok = {"indipendente", "indipendente con riserva", "non verificabile", "con affiliazioni", "commerciale"}
    assert len(d["channels"]) >= 15
    for c in d["channels"]:
        assert c["id"].startswith("UC") and len(c["id"]) == 24 and c["name"] and c["class"] in ok and c["verified"] == "2026-11-18"
    assert len({c["id"] for c in d["channels"]}) == len(d["channels"])

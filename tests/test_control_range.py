"""Il controllo è un indice, non una misura: il margine dice quanto cambierebbe con l'errore delle sue basi (rigidità stimata, un gradino dello strumento)."""
from pipeline.dims import RECOVER_STEP, control_range, dim_populations, dimensions
from tests.test_dims import rec


def pop10():
    return dim_populations([rec(i) for i in range(10)])


def test_range_contains_the_point_value():
    pop = pop10()
    for i in range(10):
        r = rec(i)
        lo, hi = control_range(r, pop)
        assert lo <= dimensions(r, pop)["values"]["control"] <= hi


def test_estimated_stiffness_widens_the_range():
    pop = pop10()
    measured = rec(5)
    estimated = rec(5, stiff_kind="da Racketpedia")
    estimated["stiffness"].update(low=estimated["stiffness"]["value_lbin"] - 25, high=estimated["stiffness"]["value_lbin"] + 25)
    a, b = control_range(measured, pop), control_range(estimated, pop)
    assert (b[1] - b[0]) > (a[1] - a[0])


def test_one_instrument_step_in_recovery_keeps_ranges_overlapping():
    pop = pop10()
    a, b = rec(4), rec(4)
    b["excel"]["recover_pct"]["50"] = a["excel"]["recover_pct"]["50"] + RECOVER_STEP
    ra, rb = control_range(a, pop), control_range(b, pop)
    assert ra[0] <= rb[1] and rb[0] <= ra[1]


def test_none_when_no_control_inputs():
    pop = pop10()
    r = rec(5, twu=False, excel=False)
    r["stiffness"] = None
    assert control_range(r, pop) is None

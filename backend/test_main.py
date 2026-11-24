from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.main import MAX_BYTES, app

client = TestClient(app)
samples = Path(__file__).resolve().parents[1] / "samples"


def validate(content: bytes):
    return client.post("/api/validate", content=content, headers={"Content-Type": "text/csv"})


def test_sample_and_corrected_catalogue():
    sample = validate((samples / "catalog.csv").read_bytes())
    assert sample.status_code == 200
    result = sample.json()
    assert (result["total_rows"], result["valid_rows"]) == (4, 1)
    assert [(issue["row"], issue["field"]) for issue in result["issues"]] == [
        (3, "price"), (4, "sku"), (5, "name")
    ]
    corrected = validate((samples / "catalog-fixed.csv").read_bytes())
    assert corrected.json() == {"total_rows": 4, "valid_rows": 4, "issues": []}


@pytest.mark.parametrize("content", [b"", b"wrong,headers,here", b"\xff", b'sku,name,price\nA,"oops,1'])
def test_file_errors(content):
    assert validate(content).status_code == 422


def test_limits_and_media_type():
    assert validate(b"x" * (MAX_BYTES + 1)).status_code == 413
    assert client.post("/api/validate", content=b"hello").status_code == 415


def test_multiline_records_and_nonfinite_prices():
    result = validate(b'sku,name,price\nA,"Line\nbreak",1\nB,Pen,NaN\n\n').json()
    assert (result["total_rows"], result["valid_rows"]) == (2, 1)
    assert result["issues"][0]["row"] == 4


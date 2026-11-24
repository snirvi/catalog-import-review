import csv
import io
from decimal import Decimal, InvalidOperation
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

MAX_BYTES = 1024 * 1024
COLUMNS = {"sku", "name", "price"}
ROOT = Path(__file__).resolve().parents[1]

app = FastAPI(title="Catalog Import Review")


class RowIssue(BaseModel):
    row: int
    field: str
    message: str


class Review(BaseModel):
    total_rows: int
    valid_rows: int
    issues: list[RowIssue]


def review_csv(content: bytes) -> Review:
    reader = csv.reader(io.StringIO(content.decode("utf-8-sig"), newline=""), strict=True)
    header = next(reader, [])
    if len(header) != len(COLUMNS) or set(header) != COLUMNS:
        raise ValueError("Use exactly these column headers: sku, name, price.")

    issues: list[RowIssue] = []
    seen_skus: set[str] = set()
    total = valid = 0
    while True:
        line = reader.line_num + 1
        row = next(reader, None)
        if row is None:
            break
        if not row:
            continue
        total += 1
        if len(row) != len(header):
            issues.append(RowIssue(row=line, field="row", message="Expected three columns."))
            continue

        values = dict(zip(header, (cell.strip() for cell in row)))
        before = len(issues)
        sku = values["sku"]
        if not sku:
            issues.append(RowIssue(row=line, field="sku", message="Enter a SKU."))
        elif sku in seen_skus:
            issues.append(RowIssue(row=line, field="sku", message="This SKU already appears above."))
        if sku:
            seen_skus.add(sku)
        if not values["name"]:
            issues.append(RowIssue(row=line, field="name", message="Enter a product name."))
        try:
            price = Decimal(values["price"])
            if not price.is_finite() or price < 0:
                raise InvalidOperation
        except InvalidOperation:
            issues.append(RowIssue(row=line, field="price", message="Enter a finite, non-negative price."))
        valid += int(len(issues) == before)

    if not total:
        raise ValueError("Add at least one product row.")
    return Review(total_rows=total, valid_rows=valid, issues=issues)


@app.post(
    "/api/validate",
    response_model=Review,
    openapi_extra={"requestBody": {"required": True, "content": {
        "text/csv": {"schema": {"type": "string", "format": "binary"}}
    }}},
)
async def validate(request: Request) -> Review:
    if request.headers.get("content-type", "").split(";")[0].strip().lower() != "text/csv":
        raise HTTPException(415, "Send the CSV with Content-Type: text/csv.")
    contents = bytearray()
    async for chunk in request.stream():
        if len(contents) + len(chunk) > MAX_BYTES:
            raise HTTPException(413, "Choose a CSV file of 1 MiB or less.")
        contents.extend(chunk)
    try:
        return review_csv(bytes(contents))
    except UnicodeDecodeError:
        raise HTTPException(422, "Save the CSV as UTF-8 and try again.") from None
    except csv.Error:
        raise HTTPException(422, "Check the CSV for malformed quoting or very long fields.") from None
    except ValueError as error:
        raise HTTPException(422, str(error)) from None


dist = ROOT / "frontend" / "dist"
if dist.is_dir():
    app.mount("/", StaticFiles(directory=dist, html=True), name="frontend")


import csv
import io

from fastapi import HTTPException, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook


def rows_response(filename: str, headers: list[str], rows: list[list], fmt: str) -> StreamingResponse:
    if fmt == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(headers)
        writer.writerows(rows)
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}.csv"'},
        )
    if fmt == "xlsx":
        workbook = Workbook()
        sheet = workbook.active
        sheet.append(headers)
        for row in rows:
            sheet.append(row)
        buffer = io.BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        return StreamingResponse(
            iter([buffer.getvalue()]),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}.xlsx"'},
        )
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="format must be 'csv' or 'xlsx'")

from datetime import datetime, timezone
from typing import Annotated

from pydantic import AfterValidator


def assume_utc(value: datetime | None) -> datetime | None:
    """DB timestamps are stored naive-but-UTC (datetime.utcnow()). Without an
    explicit offset, JavaScript's Date parser treats an ISO string as *local*
    time, silently shifting every quiz deadline by the client's UTC offset -
    this stamps the offset back on before the value is serialized to JSON.
    """
    if value is not None and value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


UTCDateTime = Annotated[datetime, AfterValidator(assume_utc)]
OptionalUTCDateTime = Annotated[datetime | None, AfterValidator(assume_utc)]

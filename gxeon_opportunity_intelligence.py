"""GXEON Bazaar opportunity intelligence (pure, read-only seller API classification).

CDP Bazaar catalogs describe *vendors selling API calls*. They do not prove
customer requests, assigned tasks, bounties, GXEON buyers, or USDC settlements.
No network requests, wallet actions or payments are performed in this module.
"""
from dataclasses import dataclass, asdict
from decimal import Decimal
from typing import Any
from urllib.parse import urlsplit
import re

USDC_DECIMALS = 6
USDC_BASE = "0x833589fCD6edb6e08f4c7c32d4f71b54bdA02913".lower()
BASE_MAINNET = "eip155:8453"
MAX_PREVIEW_ITEMS = 25

@dataclass(frozen=True)
class Opportunity:
    resource: str
    service_name: str
    category: str
    status: str
    network: str | None
    price_usdc: str | None
    unique_payers_30d: int | None
    calls_30d: int | None
    capability_match: bool
    funded_job_verified: bool
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

def _valid_resource(value: Any) -> str:
    if not isinstance(value, str) or not value or len(value) > 2048:
        raise ValueError("BAZAAR_RESOURCE_URL_INVALID")
    try:
        parsed = urlsplit(value)
        if (parsed.scheme not in ("http", "https") or not parsed.hostname
                or parsed.username or parsed.password):
            raise ValueError("BAZAAR_RESOURCE_URL_INVALID")
    except (TypeError, ValueError):
        raise ValueError("BAZAAR_RESOURCE_URL_INVALID") from None
    return value

def _count(quality: dict[str, Any], *keys: str) -> int | None:
    for key in keys:
        value = quality.get(key)
        if type(value) is int and value >= 0:
            return value
    return None

def _usdc_amount(raw: Any) -> str | None:
    if isinstance(raw, bool) or not isinstance(raw, (str, int)):
        return None
    text = str(raw)
    if not re.fullmatch(r"[0-9]{1,30}", text):
        return None
    return str(Decimal(text) / (10 ** USDC_DECIMALS))

def classify(resource: dict[str, Any], capabilities: set[str] | None = None) -> Opportunity:
    if not isinstance(resource, dict):
        raise ValueError("BAZAAR_INVALID_ITEM")
    caps = {c.lower() for c in (capabilities or set())}
    url = _valid_resource(resource.get("resource"))
    accepts = resource.get("accepts") or []
    if not isinstance(accepts, list):
        accepts = []
    payment = next((p for p in accepts[:16]
                    if isinstance(p, dict) and p.get("network") == BASE_MAINNET
                    and isinstance(p.get("asset"), str)
                    and p["asset"].lower() == USDC_BASE), None)
    raw_amount = payment.get("amount", payment.get("maxAmountRequired")) if payment else None
    price = _usdc_amount(raw_amount)
    quality = resource.get("quality")
    quality = quality if isinstance(quality, dict) else {}
    input_tags = resource.get("tags")
    input_tags = input_tags if isinstance(input_tags, list) else []
    tags = [tag.lower() for tag in input_tags[:20] if isinstance(tag, str)]
    match = bool(caps.intersection(tags))
    return Opportunity(
        resource=url,
        service_name=str(resource.get("serviceName") or resource.get("description") or url)[:160],
        category="SELLER_API",
        status="GXEON_COMPATIBLE_TAG_SIGNAL" if match else "CAPABILITY_GAP",
        network=payment["network"] if payment else None,
        price_usdc=price,
        unique_payers_30d=_count(quality, "l30DaysUniquePayers", "uniquePayers30d"),
        calls_30d=_count(quality, "l30DaysTotalCalls", "calls30d"),
        capability_match=match,
        funded_job_verified=False,
        reason="Catalog advertises another seller's API, not a funded bounty or GXEON payment.",
    )

def classify_catalog(payload: dict[str, Any], capabilities: set[str] | None = None) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise ValueError("BAZAAR_CATALOG_REQUIRED")
    records = payload.get("items", payload.get("resources", []))
    if not isinstance(records, list):
        raise ValueError("BAZAAR_ARRAY_REQUIRED")
    if len(records) > MAX_PREVIEW_ITEMS:
        raise ValueError("BAZAAR_PREVIEW_TOO_LARGE")
    return [classify(record, capabilities).to_dict() for record in records]

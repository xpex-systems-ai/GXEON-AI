"""GXEON opportunity intelligence: pure, side-effect-free x402 classification.

Never interprets an API listing as a funded job or a received payment.
No wallet signing, API consumption, or financial transactions occur here.
"""
from dataclasses import dataclass, asdict
from decimal import Decimal, InvalidOperation
from typing import Any

USDC_DECIMALS = 6
USDC_BASE = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913".lower()
BASE_MAINNET = "eip155:8453"

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

def classify(resource: dict[str, Any], capabilities: set[str] | None = None) -> Opportunity:
    capabilities = {c.lower() for c in (capabilities or set())}
    url = str(resource.get("resource") or "")
    if not url.startswith(("https://", "http://")):
        raise ValueError("Resource must contain an HTTP(S) URL")
    accepts = resource.get("accepts") or []
    payment = next((p for p in accepts if p.get("network") == BASE_MAINNET
                    and str(p.get("asset", "")).lower() == USDC_BASE), None)
    price = None
    if payment:
        raw = payment.get("amount", payment.get("maxAmountRequired"))
        try:
            if raw is not None and str(raw).isdigit():
                price = str(Decimal(str(raw)) / (10 ** USDC_DECIMALS))
        except (InvalidOperation, ValueError):
            pass
    quality = resource.get("quality") or {}
    def count(*keys: str) -> int | None:
        for key in keys:
            val = quality.get(key)
            if isinstance(val, int) and not isinstance(val, bool) and val >= 0:
                return val
        return None
    tags = [str(t).lower() for t in resource.get("tags", []) if isinstance(t, str)]
    match = bool(capabilities.intersection(tags))
    # Discovery records are sellers, NOT proof of a buyer order.
    return Opportunity(
        resource=url,
        service_name=str(resource.get("serviceName") or resource.get("description") or url)[:160],
        category="SELLER_API",
        status="GXEON_COMPATIBLE" if match else "CAPABILITY_GAP",
        network=payment.get("network") if payment else None,
        price_usdc=price,
        unique_payers_30d=count("l30DaysUniquePayers", "uniquePayers30d"),
        calls_30d=count("l30DaysTotalCalls", "calls30d"),
        capability_match=match,
        funded_job_verified=False,
        reason="Catalog listing is an offer to sell API access, not a funded bounty."
    )

def classify_catalog(payload: dict[str, Any], capabilities: set[str] | None = None) -> list[dict[str, Any]]:
    records = payload.get("items", payload.get("resources", []))
    if not isinstance(records, list):
        raise ValueError("Expected items/resources array")
    return [classify(record, capabilities).to_dict() for record in records if isinstance(record, dict)]

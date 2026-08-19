"""Async HTTP client with exponential backoff retry logic."""

import asyncio
import logging
import random
from typing import Any, Dict, Optional

import httpx

log = logging.getLogger(__name__)


async def fetch_with_retry(
    url: str,
    json_payload: Dict[str, Any],
    max_retries: int = 3,
    base_delay: float = 0.5,
    max_delay: float = 5.0,
    headers: Optional[Dict[str, str]] = None,
) -> Optional[Dict[str, Any]]:
    """
    Perform an HTTP POST request with JSON payload, retrying on transient failures
    using exponential backoff.

    Args:
        url: Target endpoint URL.
        json_payload: JSON payload to send.
        max_retries: Maximum number of attempts (including the initial try).
        base_delay: Base delay in seconds for backoff calculation.
        max_delay: Maximum delay to wait between retries.
        headers: Optional HTTP request headers.

    Returns:
        Parsed JSON response on success; None if all retries fail.
    """
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, json=json_payload, headers=headers)
            response.raise_for_status()
            return response.json()
        except (httpx.RequestError, httpx.HTTPStatusError) as exc:
            if isinstance(exc, httpx.HTTPStatusError) and exc.response.status_code in (429, 401, 403, 404):
                log.warning(f"HTTP {exc.response.status_code} received: {exc}. Raising immediately for fallback.")
                raise exc
            if attempt == max_retries - 1:
                log.error(f"Request failed after {max_retries} attempts: {exc}")
                raise
            # Exponential backoff with jitter
            delay = min(base_delay * (2 ** attempt), max_delay)
            jitter = random.uniform(0, delay * 0.1)
            await asyncio.sleep(delay + jitter)
    return None
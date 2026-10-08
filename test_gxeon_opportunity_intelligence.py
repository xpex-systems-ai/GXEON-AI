import unittest

from gxeon_opportunity_intelligence import classify, classify_catalog

BASE_USDC = "0x833589fCD6edb6e08f4c7C32D4f71b54bdA02913"

class TestOpportunity(unittest.TestCase):
    def test_seller_api_is_never_funded_job_or_money_received(self):
        r = classify({
            "resource": "https://app.tenna.ai/api/x402/tenna/solana_launch_verification",
            "tags": ["verification"],
            "accepts": [{"network": "eip155:8453", "asset": BASE_USDC, "amount": "10000"}],
            "quality": {"l30DaysTotalCalls": 19, "l30DaysUniquePayers": 5},
        }, {"verification"})
        self.assertEqual(r.price_usdc, "0.01")
        self.assertEqual(r.category, "SELLER_API")
        self.assertEqual(r.status, "GXEON_COMPATIBLE_TAG_SIGNAL")
        self.assertFalse(r.funded_job_verified)
        self.assertEqual(r.calls_30d, 19)
        self.assertEqual(r.unique_payers_30d, 5)

    def test_empty_catalog(self):
        self.assertEqual(classify_catalog({"items": []}), [])

    def test_invalid_resources_and_credentials(self):
        for url in ["javascript:alert(1)", "file:///etc/passwd",
                    "https://admin:password@example.com", "https://"]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                classify({"resource": url})

    def test_schema_and_size_limits(self):
        with self.assertRaises(ValueError):
            classify_catalog({"items": [{}]})
        with self.assertRaises(ValueError):
            classify_catalog({"items": "not a list"})
        with self.assertRaises(ValueError):
            classify_catalog({"items": [{"resource": "https://ok.test"}] * 26})
        with self.assertRaises(ValueError):
            classify_catalog(None)

    def test_untrusted_quality_and_accepts_fail_closed(self):
        r = classify({"resource": "https://example.com", "accepts": [None, "nope"],
                      "quality": "fake", "tags": None})
        self.assertIsNone(r.price_usdc)
        self.assertIsNone(r.calls_30d)
        self.assertIsNone(r.unique_payers_30d)
        self.assertFalse(r.capability_match)

    def test_atomic_price_is_exact_and_only_base_usdc(self):
        r = classify({"resource": "https://example.com",
                      "accepts": [{"asset": BASE_USDC, "network": "eip155:8453",
                                   "amount": "10000000000000000000"}]})
        self.assertEqual(r.price_usdc, "10000000000000")
        r_wrong = classify({"resource": "https://example.com",
                            "accepts": [{"asset": BASE_USDC, "network": "eip155:1", "amount": "10000"}]})
        self.assertIsNone(r_wrong.price_usdc)
        self.assertIsNone(r_wrong.network)

    def test_boolean_and_float_amounts_are_not_money(self):
        for amount in [True, -1, 0.1, "1e6", "abcd"]:
            with self.subTest(amount=amount):
                r = classify({"resource": "https://example.com", "accepts": [
                    {"asset": BASE_USDC, "network": "eip155:8453", "amount": amount}]})
                self.assertIsNone(r.price_usdc)

if __name__ == "__main__":
    unittest.main()

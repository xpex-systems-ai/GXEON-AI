import unittest
from gxeon_opportunity_intelligence import classify, classify_catalog

BASE_USDC = "0x833589fCD6eDb6E08f4C7C32D4f71b54bdA02913"
class TestOpportunity(unittest.TestCase):
    def test_seller_is_not_funded_job(self):
        r = classify({"resource":"https://example.org/api", "tags":["verification"],
          "accepts":[{"network":"eip155:8453","asset":BASE_USDC,"amount":"10000"}],
          "quality":{"l30DaysTotalCalls":19,"l30DaysUniquePayers":5}}, {"verification"})
        self.assertEqual(r.price_usdc,"0.01")
        self.assertEqual(r.category,"SELLER_API")
        self.assertFalse(r.funded_job_verified)
        self.assertTrue(r.capability_match)
        self.assertEqual(r.calls_30d,19)
    def test_empty_catalog(self):
        self.assertEqual(classify_catalog({"items":[]}), [])
    def test_invalid_url(self):
        with self.assertRaises(ValueError):
            classify({"resource":"javascript:alert(1)"})
if __name__ == "__main__":
    unittest.main()

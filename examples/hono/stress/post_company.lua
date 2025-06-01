wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.body = [[
{
  "company": {
    "name": "BenchCo",
    "email": "bench@co.com",
    "phone": "+1234567890",
    "address": {
      "street": "Bench St",
      "city": "Benchville",
      "zip": "12345",
      "country": "Benchland"
    }
  },
  "owner": {
    "name": "Bench Owner",
    "email": "owner@bench.com",
    "role": "CEO"
  }
}
]]

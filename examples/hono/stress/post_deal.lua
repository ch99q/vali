wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.body = [[
{
  "title": "Big Bench Deal",
  "value": 100000,
  "stage": "Negotiation",
  "companyId": "11111111-1111-1111-1111-111111111111",
  "notes": "High value benchmark deal"
}
]]

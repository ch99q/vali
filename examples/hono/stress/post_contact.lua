wrk.method = "POST"
wrk.headers["Content-Type"] = "application/json"
wrk.body = [[
{
  "name": "Bench Contact",
  "companyId": "11111111-1111-1111-1111-111111111111",
  "email": "contact@bench.com",
  "phone": "+1234567899",
  "position": "Manager",
  "notes": "VIP"
}
]]

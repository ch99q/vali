#!/bin/zsh

# Usage: ./stress.sh <host> <companyId> <contactId> <dealId>
# Example: ./stress.sh http://localhost:8000 11111111-1111-1111-1111-111111111111 22222222-2222-2222-2222-222222222222 33333333-3333-3333-3333-333333333333

HOST=${1:-http://localhost:8000}
COMPANY_ID=${2:-00000000-0000-0000-0000-000000000000}
CONTACT_ID=${3:-22222222-2222-2222-2222-222222222222}
DEAL_ID=${4:-33333333-3333-3333-3333-333333333333}

# POST /company
wrk -t2 -c32 -d10s -s post_company.lua $HOST/company

echo "\n---"

# POST /contact (with companyId replaced)
sed "s/00000000-0000-0000-0000-000000000000/$COMPANY_ID/g" post_contact.lua > _tmp_post_contact.lua
wrk -t2 -c32 -d10s -s _tmp_post_contact.lua $HOST/contact
rm _tmp_post_contact.lua

echo "\n---"

# POST /deal (with companyId replaced)
sed "s/00000000-0000-0000-0000-000000000000/$COMPANY_ID/g" post_deal.lua > _tmp_post_deal.lua
wrk -t2 -c32 -d10s -s _tmp_post_deal.lua $HOST/deal
rm _tmp_post_deal.lua

echo "\n---"

# GET /company/:id (200)
wrk -t2 -c32 -d10s -s get_company.lua $HOST/company/$COMPANY_ID

echo "\n---"

# GET /contact/:id (404, using company id)
wrk -t2 -c32 -d10s -s get_contact.lua $HOST/contact/$COMPANY_ID

echo "\n---"

# GET /contact/:id (200, using real contact id)
wrk -t2 -c32 -d10s -s get_contact.lua $HOST/contact/$CONTACT_ID

echo "\n---"

# GET /deal/:id (404, using company id)
wrk -t2 -c32 -d10s -s get_deal.lua $HOST/deal/$COMPANY_ID

echo "\n---"

# GET /deal/:id (200, using real deal id)
wrk -t2 -c32 -d10s -s get_deal.lua $HOST/deal/$DEAL_ID

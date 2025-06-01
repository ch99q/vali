import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import app from "./mod.ts";

Deno.test("POST /company creates company and owner, validates, and persists", async () => {
  const body = {
    company: {
      name: "TestCo",
      email: "test@co.com",
      phone: "+1234567890",
      website: "https://testco.com",
      address: {
        street: "123 Main St",
        city: "Testville",
        zip: "12345",
        country: "Testland"
      },
      industry: "Software",
      tags: ["b2b", "saas"],
      notes: "A test company."
    },
    owner: {
      name: "Alice Owner",
      email: "alice@co.com",
      phone: "+1234567891",
      role: "CEO",
      isActive: true
    }
  };
  const res = await app.request("/company", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assert(data.company.id);
  assertEquals(data.company.name, body.company.name);
  assertEquals(data.owner.name, body.owner.name);
  assertEquals(data.owner.companyId, data.company.id);
  // Check optional fields
  assertEquals(data.company.website, body.company.website);
  assertEquals(data.company.industry, body.company.industry);
  assertEquals(data.company.tags.length, 2);
  assertEquals(data.company.notes, body.company.notes);
  assertEquals(data.owner.isActive, true);
});

Deno.test("POST /company fails with missing required fields", async () => {
  const res = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: { name: "", email: "", phone: "" },
      owner: { name: "", email: "", role: "" }
    }),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assert(data.error);
  assert(Array.isArray(data.issues));
  for (const issue of data.issues) {
    assert(issue.path.includes("company") || issue.path.includes("owner"));
    assert(typeof issue.type === "string");
  }
});

Deno.test("GET /company/:id returns the created company", async () => {
  // Create first
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "GetCo",
        email: "get@co.com",
        phone: "+1234567892",
        address: { street: "1 Get St", city: "GetCity", zip: "54321", country: "Getland" }
      },
      owner: { name: "Bob", email: "bob@get.com", role: "CTO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { company } = await createRes.json();
  const res = await app.request(`/company/${company.id}`);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.id, company.id);
  assertEquals(data.name, "GetCo");
});

Deno.test("GET /company/:id returns 404 for not found", async () => {
  const res = await app.request(`/company/nonexistent-id`);
  assertEquals(res.status, 404);
  const data = await res.json();
  assert(data.error);
});

Deno.test("DELETE /company/:id deletes the company", async () => {
  // Create first
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "DeleteCo",
        email: "del@co.com",
        phone: "+1234567893",
        address: { street: "1 Del St", city: "DelCity", zip: "99999", country: "Delland" }
      },
      owner: { name: "Del Owner", email: "del@owner.com", role: "COO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { company } = await createRes.json();
  const res = await app.request(`/company/${company.id}`, { method: "DELETE" });
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.id, company.id);
  // Should not be found after delete
  const getRes = await app.request(`/company/${company.id}`);
  assertEquals(getRes.status, 404);
});

Deno.test("DELETE /company/:id returns 404 for not found", async () => {
  const res = await app.request(`/company/nonexistent-id`, { method: "DELETE" });
  assertEquals(res.status, 404);
  const data = await res.json();
  assert(data.error);
});

Deno.test("GET /user/:id returns the created owner", async () => {
  // Create company/owner
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "UserCo",
        email: "user@co.com",
        phone: "+1234567899",
        address: { street: "1 User St", city: "UserCity", zip: "55555", country: "Userland" }
      },
      owner: { name: "User Owner", email: "user@owner.com", role: "CIO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { owner } = await createRes.json();
  const res = await app.request(`/user/${owner.id}`);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.id, owner.id);
  assertEquals(data.name, "User Owner");
  assertEquals(data.companyId, data.companyId);
});

Deno.test("GET /user/:id returns 404 for not found", async () => {
  const res = await app.request(`/user/nonexistent-id`);
  assertEquals(res.status, 404);
  const data = await res.json();
  assert(data.error);
});

Deno.test("POST /contact creates a contact and validates", async () => {
  // Create a company to link
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "ContactCo",
        email: "contact@co.com",
        phone: "+1234567894",
        address: { street: "1 Contact St", city: "ContactCity", zip: "11111", country: "Contactland" }
      },
      owner: { name: "Contact Owner", email: "contact@owner.com", role: "CRO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { company } = await createRes.json();
  const contactBody = {
    name: "Charlie Contact",
    companyId: company.id,
    email: "charlie@contact.com",
    phone: "+1234567895",
    position: "Manager",
    notes: "VIP contact"
  };
  const res = await app.request("/contact", {
    method: "POST",
    body: JSON.stringify(contactBody),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assert(data.id);
  assertEquals(data.name, contactBody.name);
  assertEquals(data.companyId, company.id);
  assertEquals(data.email, contactBody.email);
  assertEquals(data.phone, contactBody.phone);
  assertEquals(data.position, contactBody.position);
  assertEquals(data.notes, contactBody.notes);
});

Deno.test("POST /contact fails with missing required fields", async () => {
  const res = await app.request("/contact", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assert(data.error);
  assert(Array.isArray(data.issues));
  for (const issue of data.issues) {
    assert(issue.path.startsWith("contact"));
    assert(typeof issue.type === "string");
  }
});

Deno.test("GET /contact/:id returns the created contact", async () => {
  // Create a company and contact
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "ContactGetCo",
        email: "contactget@co.com",
        phone: "+1234567896",
        address: { street: "1 CG St", city: "CGCity", zip: "22222", country: "CGland" }
      },
      owner: { name: "CG Owner", email: "cg@owner.com", role: "CFO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { company } = await createRes.json();
  const contactBody = {
    name: "GetContact",
    companyId: company.id,
    email: "get@contact.com"
  };
  const contactRes = await app.request("/contact", {
    method: "POST",
    body: JSON.stringify(contactBody),
    headers: { "content-type": "application/json" }
  });
  const contact = await contactRes.json();
  const res = await app.request(`/contact/${contact.id}`);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.id, contact.id);
  assertEquals(data.name, contactBody.name);
  assertEquals(data.companyId, company.id);
});

Deno.test("GET /contact/:id returns 404 for not found", async () => {
  const res = await app.request(`/contact/nonexistent-id`);
  assertEquals(res.status, 404);
  const data = await res.json();
  assert(data.error);
});

Deno.test("POST /deal creates a deal and validates", async () => {
  // Create a company to link
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "DealCo",
        email: "deal@co.com",
        phone: "+1234567897",
        address: { street: "1 Deal St", city: "DealCity", zip: "33333", country: "Dealland" }
      },
      owner: { name: "Deal Owner", email: "deal@owner.com", role: "CSO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { company } = await createRes.json();
  const dealBody = {
    title: "Big Sale",
    value: 100000,
    stage: "Negotiation",
    companyId: company.id,
    notes: "High value deal"
  };
  const res = await app.request("/deal", {
    method: "POST",
    body: JSON.stringify(dealBody),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 200);
  const data = await res.json();
  assert(data.id);
  assertEquals(data.title, dealBody.title);
  assertEquals(data.companyId, company.id);
  assertEquals(data.value, dealBody.value);
  assertEquals(data.stage, dealBody.stage);
  assertEquals(data.notes, dealBody.notes);
});

Deno.test("POST /deal fails with missing required fields", async () => {
  const res = await app.request("/deal", {
    method: "POST",
    body: JSON.stringify({}),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assert(data.error);
  assert(Array.isArray(data.issues));
  for (const issue of data.issues) {
    assert(issue.path.startsWith("deal"));
    assert(typeof issue.type === "string");
  }
});

Deno.test("GET /deal/:id returns the created deal", async () => {
  // Create a company and deal
  const createRes = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: {
        name: "DealGetCo",
        email: "dealget@co.com",
        phone: "+1234567898",
        address: { street: "1 DG St", city: "DGCity", zip: "44444", country: "DGland" }
      },
      owner: { name: "DG Owner", email: "dg@owner.com", role: "CMO" }
    }),
    headers: { "content-type": "application/json" }
  });
  const { company } = await createRes.json();
  const dealBody = {
    title: "Get Deal",
    value: 50000,
    stage: "Proposal",
    companyId: company.id
  };
  const dealRes = await app.request("/deal", {
    method: "POST",
    body: JSON.stringify(dealBody),
    headers: { "content-type": "application/json" }
  });
  const deal = await dealRes.json();
  const res = await app.request(`/deal/${deal.id}`);
  assertEquals(res.status, 200);
  const data = await res.json();
  assertEquals(data.id, deal.id);
  assertEquals(data.title, dealBody.title);
  assertEquals(data.companyId, company.id);
});

Deno.test("GET /deal/:id returns 404 for not found", async () => {
  const res = await app.request(`/deal/nonexistent-id`);
  assertEquals(res.status, 404);
  const data = await res.json();
  assert(data.error);
});

Deno.test("Validation fails for invalid company and returns validation issues", async () => {
  const res = await app.request("/company", {
    method: "POST",
    body: JSON.stringify({
      company: { name: "", email: "not-an-email", phone: "bad" },
      owner: { name: "", email: "bad", role: "" }
    }),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assert(data.error);
  if (data.issues) {
    for (const issue of data.issues) {
      assert(issue.path.includes("company") || issue.path.includes("owner"));
      assert(typeof issue.type === "string");
    }
  }
});

Deno.test("Validation fails for invalid contact and returns validation issues", async () => {
  const res = await app.request("/contact", {
    method: "POST",
    body: JSON.stringify({ name: "", companyId: "", email: "bad" }),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assert(data.error);
  if (data.issues) {
    for (const issue of data.issues) {
      assert(issue.path.startsWith("contact"));
      assert(typeof issue.type === "string");
    }
  }
});

Deno.test("Validation fails for invalid deal and returns validation issues", async () => {
  const res = await app.request("/deal", {
    method: "POST",
    body: JSON.stringify({ title: "", value: -1, stage: "", companyId: "" }),
    headers: { "content-type": "application/json" }
  });
  assertEquals(res.status, 400);
  const data = await res.json();
  assert(data.error);
  if (data.issues) {
    for (const issue of data.issues) {
      assert(issue.path.startsWith("deal"));
      assert(typeof issue.type === "string");
    }
  }
});

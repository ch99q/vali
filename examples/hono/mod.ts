import { Hono } from '@hono/hono'
import { v } from "@ch99q/vali";

// --- Logging utility (Degrades RPS 5x) ---
const log = (level: 'info' | 'warn' | 'error' | 'debug', msg: string, meta?: Record<string, unknown>) => {
  const entry = { level, msg, ...meta, time: new Date().toISOString() };
  if (level === 'error') console.error(entry);
  else if (level === 'warn') console.warn(entry);
  else if (level === 'debug') console.debug(entry);
  else console.log(entry);
};

// --- In-memory store (replace with DB in prod) ---
const db = {
  companies: new Map<string, Company>(),
  users: new Map<string, Owner>(),
  contacts: new Map<string, Contact>(),
  deals: new Map<string, Deal>(),
};

// --- Seed initial data for benchmarking ---
const seedCompanyId = "11111111-1111-1111-1111-111111111111";
const seedContactId = "22222222-2222-2222-2222-222222222222";
const seedDealId = "33333333-3333-3333-3333-333333333333";

const seedCompany: Company = {
  id: seedCompanyId,
  name: "SeedCo",
  email: "seed@co.com",
  phone: "+1234567890",
  address: {
    street: "Seed St",
    city: "Seedville",
    zip: "12345",
    country: "Seedland"
  }
};
db.companies.set(seedCompanyId, seedCompany);

const seedOwner: Owner = {
  id: "44444444-4444-4444-4444-444444444444",
  name: "Seed Owner",
  email: "owner@seed.com",
  role: "CEO",
  companyId: seedCompanyId
};
db.users.set(seedOwner.id, seedOwner);

const seedContact: Contact = {
  id: seedContactId,
  name: "Seed Contact",
  companyId: seedCompanyId,
  email: "contact@seed.com"
};
db.contacts.set(seedContactId, seedContact);

const seedDeal: Deal = {
  id: seedDealId,
  title: "Seed Deal",
  value: 1000,
  stage: "Negotiation",
  companyId: seedCompanyId
};
db.deals.set(seedDealId, seedDeal);

// --- Schemas ---
const companySchema = v.object({
  name: v.string().min(1).max(100),
  email: v.email(),
  phone: v.string().regex(/^[+\d][\d\s-]{7,20}$/),
  website: v.string().regex(/^(https?:\/\/)?([\w\-]+\.)+[\w\-]+(\/[\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/).optional(),
  address: v.object({
    street: v.string().min(1).max(200),
    city: v.string().min(1).max(100),
    state: v.string().min(1).max(100).optional(),
    zip: v.string().regex(/^[A-Za-z0-9\s-]{3,12}$/),
    country: v.string().min(2).max(56)
  }),
  industry: v.string().min(2).max(100).optional(),
  tags: v.array(v.string().min(1).max(30)).max(20).optional(),
  notes: v.string().max(1000).optional()
}).path('company');

const userSchema = v.object({
  name: v.string().min(1).max(100),
  email: v.email(),
  phone: v.string().regex(/^[+\d][\d\s-]{7,20}$/).optional(),
  role: v.string().min(2).max(50),
  isActive: v.boolean().optional(),
  companyId: v.string().optional()
}).path('user');

const contactSchema = v.object({
  name: v.string().min(1).max(100),
  email: v.email().optional(),
  phone: v.string().regex(/^[+\d][\d\s-]{7,20}$/).optional(),
  position: v.string().min(2).max(100).optional(),
  companyId: v.string(),
  notes: v.string().max(1000).optional()
}).path('contact');

const dealSchema = v.object({
  title: v.string().min(1).max(200),
  value: v.number().min(0),
  stage: v.string().min(2).max(50),
  companyId: v.string(),
  contactId: v.string().optional(),
  ownerId: v.string().optional(),
  closeDate: v.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  notes: v.string().max(1000).optional()
}).path('deal');

// --- Types ---
type Company = v.infer<typeof companySchema> & { id: string };
type Owner = v.infer<typeof userSchema> & { id: string };
type Contact = v.infer<typeof contactSchema> & { id: string };
type Deal = v.infer<typeof dealSchema> & { id: string };

// --- Transaction system (for rollback) ---
type TransactionType = ReturnType<typeof transaction>;
const transaction = () => {
  const rollbacks: (() => void)[] = [];
  return {
    reverse(fn: () => void) { rollbacks.push(fn); },
    rollback() { while (rollbacks.length > 0) { try { console.log("Rolling back", rollbacks.length), rollbacks.pop()?.(); } catch (e) { log('error', 'Rollback failed', { error: e }); } } }
  };
};

const app = new Hono<{ Variables: { transaction: TransactionType } }>();

app.use('*', async (c, next) => {
  c.set('transaction', transaction());
  await next();
});

// --- Company Endpoints ---
app.post('/company', async (c) => {
  const { reverse } = c.get('transaction');

  const body = v.object({
    company: companySchema,
    owner: userSchema
  }).check(await c.req.json());

  // Create a new company.
  const company: Company = { ...body.company, id: crypto.randomUUID() };
  log('info', 'Creating company', { company });
  db.companies.set(company.id, company);
  reverse(() => { db.companies.delete(company.id); });

  // Create a new owner.
  const owner: Owner = { ...body.owner, id: crypto.randomUUID(), companyId: company.id };
  log('info', 'Creating owner', { owner });
  db.users.set(owner.id, owner);
  reverse(() => { db.users.delete(owner.id); });

  return c.json({ company, owner });
});

app.get('/company/:id', (c) => {
  const id = c.req.param('id');

  const company = db.companies.get(id);
  v.find().path("company").check(!!company);

  return c.json(company);
});

app.delete('/company/:id', (c) => {
  const id = c.req.param('id');

  const company = db.companies.get(id);
  v.find().path("company").check(!!company);

  db.companies.delete(id);
  return c.json({ id })
});

// --- User/Owner Endpoints ---
app.get('/user/:id', (c) => {
  const id = c.req.param('id');
  const user = db.users.get(id);
  v.find().path("user").check(!!user);
  return c.json(user);
});

// --- Contact Endpoints ---
app.post('/contact', async (c) => {
  const body = await c.req.json();

  // Validate and create a new contact.
  const contactData = contactSchema.check(body);
  const contact: Contact = { ...contactData, id: crypto.randomUUID() };
  db.contacts.set(contact.id, contact);

  return c.json(contact);
});

app.get('/contact/:id', (c) => {
  const id = c.req.param('id');
  const contact = db.contacts.get(id);
  v.find().path("contact").check(!!contact);

  return c.json(contact);
});

// --- Deal Endpoints ---
app.post('/deal', async (c) => {
  const body = await c.req.json();

  const dealData = dealSchema.check(body);
  const deal: Deal = { ...dealData, id: crypto.randomUUID() };
  db.deals.set(deal.id, deal);

  return c.json(deal);
});

app.get('/deal/:id', (c) => {
  const id = c.req.param('id');

  const deal = db.deals.get(id);
  v.find().path("deal").check(!!deal);

  return c.json(deal);
});

// --- Error Handler ---
app.onError((err, c) => {
  // Rollback transactions.
  const { rollback } = c.get('transaction');
  rollback();

  if (err instanceof v.ValidationError) {
    log('error', 'Validation error', { error: err });
    return c.json({ error: err.message, issues: err.issues }, 400);
  }

  log('error', 'Unhandled error', { error: err });
  return c.json({ error: err.message }, 500);
});

export default app;

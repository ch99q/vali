import { Hono } from '@hono/hono'
import { v } from "@ch99q/vali";

const app = new Hono()

const schema = v.object({
  name: v.string().min(1).max(100),
  age: v.number().min(0).max(120),
  email: v.email(),
  tags: v.array(v.string()).min(1).max(10).optional(),
  address: v.object({
    street: v.string().min(1).max(200),
    city: v.string().min(1).max(100),
    zip: v.string().regex(/^\d{5}(-\d{4})?$/)
  }).optional()
});

app.get('/', async (c) => {
  const data = schema.check(await c.req.json<v.infer<typeof schema>>());

  throw new Error('This is a test error')

  return c.json({
    message: 'Hello, Hono!'
  });
})

app.onError((err, c) => {
  if (err instanceof v.ValidationError) {
    err.issues
  }
  console.error('Error occurred:', err)
  return c.json({ error: 'Internal Server Error' }, 500)
})

export default app

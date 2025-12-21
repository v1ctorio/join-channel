import { Hono } from 'hono'

export const slack = new Hono()

const SLACK_SINGING_SECRET = Deno.env.get("SLACK_SINGING_SECRET")


slack.get("/events",(c) => {
  
  return c.text("Hello slack, you seem authentic")

})
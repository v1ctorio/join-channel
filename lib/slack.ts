import { Hono } from 'hono'
import { cloneRawRequest } from "hono/request"
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
export const slack = new Hono()

const SLACK_SINGING_SECRET = Deno.env.get("SLACK_SINGING_SECRET") ?? ""

slack.use(async (c, next) => {
  const reqBody = await (await cloneRawRequest(c.req)).text()
  const timestamp = Number(c.req.header('X-Slack-Request-Timestamp')) || 0 
  const slackSignature = c.req.header("x-slack-signature") || ""

  if ((Math.floor(Date.now() / 1000) - timestamp) > 60 * 5){
    return c.text("Invalid timestamp")
  }
  const baseStringToSign = 'v0:' + timestamp + ':' + reqBody
  const signature = createHmac('sha256', SLACK_SINGING_SECRET).update(baseStringToSign).digest("hex")
  
  
  if (!safeCompare(signature, slackSignature)){
    return c.text("Invalid signature")
  }
  await next()
})


slack.post("/events",async(c) => {
  const body = await c.req.json()
  switch (body["type"]){
    case "url_verification":
      return c.text(body["challenge"])
      break;
  }
  return c.text("Hello slack, you seem authentic")

})

slack.get('/', (c)=> {
  return c.text("I don't know why slack would make a GET request but sure, this request seems legit.")
})


function safeCompare(a: string, b:string): boolean {
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')

  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA,bufB)
}
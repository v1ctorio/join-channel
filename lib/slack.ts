import { Hono } from 'hono'
import { cloneRawRequest } from "hono/request"
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
export const slack = new Hono()

const SLACK_SINGING_SECRET = Deno.env.get("SLACK_SINGING_SECRET") ?? ""

slack.use(async (c, next) => {
  const rawreqBody = await (await cloneRawRequest(c.req)).arrayBuffer()
  const reqBody = new TextDecoder('utf-8').decode(rawreqBody)

  const timestamp = Number(c.req.header('X-Slack-Request-Timestamp')) || 0 
  const slackSignature = c.req.header("x-slack-signature") || ""

  console.log("Received slack req, ", reqBody)
  if ((Math.floor(Date.now() / 1000) - timestamp) > 60 * 5){
    console.log("rejecting for invalid timestamp")
    return c.text("Invalid timestamp")
  }
  const baseStringToSign = 'v0:' + timestamp + ':' + reqBody
  const signature = "v0=" + createHmac('sha256', SLACK_SINGING_SECRET).update(baseStringToSign).digest("hex")
  
  
  if (!safeCompare(signature, slackSignature)){
    console.log("rejecting for invalid signature")
    return c.text("Invalid signature")
  }
  await next()
})


slack.post("/events",async(c) => {
  const body: SlackEventRes = await c.req.json()
  c.status(200)
  console.log("got genuine event")
  switch (body["type"]){
    case "url_verification":
      return c.text(body["challenge"])
    case "event_callback":
      return c.text('')
  }
  return c.text("Hello slack, you seem authentic")

})

slack.get('/', (c)=> {
  return c.text("I don't know why slack would make a GET request but sure, this request seems legit.")
})


function safeCompare(a: string, b:string): boolean {
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')

  console.log(`comparing ${a} to ${b}`)//TODO REMOVE THIS IN PRODUCTION DO NOT LEAK ENV IN LOGS GNG

  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA,bufB)
}

interface EventCallback {
  type: 'event_callback'
  token: string
  team_id: string
  api_app_id: string
  event_id: string
  event_time: number
}
interface UrlVerificationCallback {
  token: string,
  challenge: string,
  type: 'url_verification'
}
interface LinkSharedEvent extends EventCallback {
  event: {
  type: string
  channel: string
  is_bot_user_member: boolean
  user: string
  message_ts: string
  unfurl_id: string
  thread_ts: string
  source: string
  links: {
    domain:string,
    url:string
  }[]
  user_locale: string
  }
}

type SlackEventRes = LinkSharedEvent | UrlVerificationCallback
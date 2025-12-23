import { Hono } from 'hono'
import { cloneRawRequest } from "hono/request"
import { Buffer } from "node:buffer";
import { createHmac, timingSafeEqual } from "node:crypto";
export const slack = new Hono()

const SLACK_SINGING_SECRET = Deno.env.get("SLACK_SINGING_SECRET") ?? ""
const SLACK_XOXB_TOKEN = Deno.env.get("SLACK_XOXB_TOKEN") ?? ""

const URL_TO_UNFURL = 'http://joinmychannel.vic.wf/'

slack.use(async (c, next) => {
  const rawreqBody = await (await cloneRawRequest(c.req)).arrayBuffer()
  const reqBody = new TextDecoder('utf-8').decode(rawreqBody)

  const timestamp = Number(c.req.header('X-Slack-Request-Timestamp')) || 0 
  const slackSignature = c.req.header("x-slack-signature") || ""

  console.log("Received slack req, ", c.req,'\n', reqBody)
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
  if(body.type == 'url_verification') {
      return c.text(body["challenge"])
  } else if (body.type == "event_callback") {

    unfurl(body.event.unfurl_id, body.event.source, body.event.links[0].url)

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
  source: 'conversations_history' | 'composer'
  links: {
    domain:string,
    url:string
  }[]
  user_locale: string
  }
}

type SlackEventRes = LinkSharedEvent | UrlVerificationCallback


async function unfurl(unfurl_id: string, source: 'conversations_history' | 'composer', urlToUnfurl: string) {
  const res = await fetch('https://slack.com/api/chat.unfurl',{
    method: "POST",
    body: JSON.stringify({
      token: SLACK_XOXB_TOKEN,
      unfurl_id,
      source,
      user_auth_required: false,
      unfurls: {
        [urlToUnfurl]: {
          hide_color: false,
          blocks:[
            {
  "type": "section",
  "text": {
    "type": "mrkdwn",
    "text": "New Paid Time Off request from <example.com|Fred Enriquez>\n\n<https://example.com|View request>"
  }
}
          ]
        }
      }
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SLACK_XOXB_TOKEN}`
    }
  })

  console.log(await res.json())
}
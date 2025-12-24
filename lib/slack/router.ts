import { Hono } from 'hono'
import { cloneRawRequest } from "hono/request"
import { createHmac } from "node:crypto";
import { safeCompare, SlackEventRes } from "./utils.ts";
import { postMessage, unfurlById } from './methods.ts';
import rawConfig from '../../joinchannel.config.json' with { type: 'json' } 

const config: Record<string, any> = rawConfig
export const slack = new Hono()

const SLACK_SINGING_SECRET = Deno.env.get("SLACK_SINGING_SECRET") ?? ""


slack.use(async (c, next) => {
  const rawreqBody = await (await cloneRawRequest(c.req)).arrayBuffer()
  const reqBody = new TextDecoder('utf-8').decode(rawreqBody)

  const timestamp = Number(c.req.header('X-Slack-Request-Timestamp')) || 0 
  const slackSignature = c.req.header("x-slack-signature") || ""

  console.log("Received slack req, ",'\n', reqBody)
  if ((Math.floor(Date.now() / 1000) - timestamp) > 60 * 5){
    console.log("rejecting for invalid timestamp")
    c.status(401)
    return c.text("Invalid timestamp")
  }
  const baseStringToSign = 'v0:' + timestamp + ':' + reqBody
  const signature = "v0=" + createHmac('sha256', SLACK_SINGING_SECRET).update(baseStringToSign).digest("hex")
  
  
  if (!safeCompare(signature, slackSignature)){
    c.status(401)
    console.log("rejecting for invalid signature")
    return c.text("Invalid signature")
  }
  await next()
})


slack.post("/events",async(c) => {
  const body: SlackEventRes = await c.req.json()
  c.status(200)
  console.log("is genuine event")


  if(body.type == 'url_verification') {
      return c.text(body["challenge"])
  } else if (body.type == "event_callback") {

    unfurlById(body.event.unfurl_id, body.event.source, decodeURI(body.event.links[0].url))

    return c.text('')
  }
  return c.text("Hello slack, you seem authentic")

})


slack.post('/interactivity', async (c) => {
  console.log('is genuine interaction payload')

  const body = await c.req.parseBody()
  const payload = JSON.parse(body["payload"] as string)
  console.log(payload)

  const action_id = payload["actions"][0]["action_id"]

  c.status(200)


    if (action_id === 'the-click-button') {

      const user = payload["user"]


      const text = (config["approvalMessage"]["text"] as string).replaceAll("{mention}",`<@${user.id}>`).replaceAll("{username}",user.username)

      const ApprovalMsgBlocks: any[] = [
		{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": text
			}
		},
		{
			"type": "divider"
		},
		{
			"type": "actions",
			"elements": [
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": config["approvalMessage"]["approveButtonCaption"],
						"emoji": true
					},
					"value": user.id,
					"action_id": "approve"
				},
				{
					"type": "button",
					"text": {
						"type": "plain_text",
						"text": config["approvalMessage"]["deleteButtonCaption"],
						"emoji": true
					},
					"value": user.id,
					"action_id": "delete"
				}
			]
		}
	];
      postMessage(config["approvalMessage"]["channel"], ApprovalMsgBlocks)

      if (config["confirmationMessage"]) {
        postMessage(user.id, config["confirmationMessage"])
      }


      }
      

  



  return c.text("")
  
})


slack.get('/', (c)=> {
  return c.text("I don't know why slack would make a GET request but sure, this request seems legit.")
})


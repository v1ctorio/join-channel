import config, { EnvT} from '../env.ts'
import { Hono } from 'hono'
import { cloneRawRequest } from "hono/request"
import { env } from 'hono/adapter'
import { createHmac } from "node:crypto";
import { BlockActionInteractionPayload, safeCompare, SlackEventRes, ApprovalMessageBlocks } from "./utils.ts";
import { deleteMessage, inviteUser, postMessage, unfurlById, updateMessage } from './methods.ts';

const slack = new Hono()


slack.use(async (c, next) => {

  const { SLACK_SINGING_SECRET } =  env<EnvT>(c)
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

    const text = `*${config.title}*\n\n${config.body}`

    unfurlById(body.event.unfurl_id, body.event.source, decodeURI(body.event.links[0].url), {mrkdwn: text, buttonCaption: config.actionButtonCaption}, env<EnvT>(c).SLACK_XOXB_TOKEN )

    return c.text('')
  }
  return c.text("Hello slack, you seem authentic")

})


slack.post('/interactivity', async (c) => {
  console.log('is genuine interaction payload')

  const body = await c.req.parseBody()
  const payload = JSON.parse(body["payload"] as string)
  console.log(payload)

  const XOXB = env<EnvT>(c).SLACK_XOXB_TOKEN

  const action_id = payload["actions"][0]["action_id"]

  c.status(200)

//TODO. awaiting IS TOO SLOW AND SLACK GETS MAD IF YOU DON'T REPLY FAST ENOUGH but not doing so could kill the process on serverless
    if (action_id === 'the-click-button') {
        handleRequestButtonPayload(payload, XOXB)
      } else if (action_id === 'approve') {
        handleApproveButtonPayload(payload, XOXB) 
      } else if (action_id === 'delete') {
        handleDeleteButtonPayload(payload, XOXB)
      }
      

  



  return c.text("")
  
})


slack.get('/', (c)=> {
  return c.text("I don't know why slack would make a GET request but sure, this request seems legit.")
})


async function handleRequestButtonPayload(payload:BlockActionInteractionPayload, xoxb: string) {
      const user = payload["user"]


      const text = (config["approvalMessage"]["text"] as string).replaceAll("{mention}",`<@${user.id}>`).replaceAll("{username}",user.username)

      const approvalMessageBlocks = ApprovalMessageBlocks(user.id,text,config["approvalMessage"]["approveButtonCaption"],config["approvalMessage"]["deleteButtonCaption"])

      await postMessage(config["approvalMessage"]["channel"], approvalMessageBlocks, xoxb)

      if (config["confirmationMessage"]) {
        await postMessage(user.id, config["confirmationMessage"], xoxb)
      }


}

async function handleApproveButtonPayload(payload: BlockActionInteractionPayload, xoxb: string) {
  const user = payload.actions[0]?.value as string

  const oldMsg = payload.message

  const text = oldMsg.blocks[0].text.text
  const succesfullyInvited = inviteUser(config.channel_id, user, xoxb);


  if (!succesfullyInvited) {
    await postMessage(config["approvalMessage"]["channel"], 'Error inviting user. Make sure I am in the target channel.  Read the logs for the full error.', xoxb)
    return
  }


  const updatedBlocks: any[] = [
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
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": `*${config.approvalMessage.approveButtonCaption}* was clicked.`
      }
    }
	];

  await updateMessage(payload.channel.id, oldMsg.ts, updatedBlocks, xoxb)

}

async function handleDeleteButtonPayload(payload: BlockActionInteractionPayload, xoxb: string) {
  
  const oldMsg = payload.message

  await deleteMessage(payload.channel.id, oldMsg.ts, xoxb)
}

export default slack;
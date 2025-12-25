import { Buffer } from "node:buffer";
import { timingSafeEqual } from "node:crypto";

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



// from https://docs.slack.dev/reference/interaction-payloads/block_actions-payload
export interface BlockActionInteractionPayload {
  type: 'block_actions';
  team: {
    id: string;
    domain: string;
  };
  user: {
    id: string;
    username: string;
    team_id: string;
  };
  api_app_id: string;
  token: string;
  container: {
    type: string;
    message_ts: string;
    attachment_id: number;
    channel_id: string;
    is_ephemeral: boolean;
    is_app_unfurl: boolean;
  };
  trigger_id: string;
  channel: {
    id: string;
    name: string;
  };
  message: {
    //do i even need ts
    ts: string;
  };
  response_url: string;
  actions: {
    action_id: string;
    block_id: string;
    text: {
      type: 'plain_text';
      text: string;
      emoji: boolean
    }
    value: string;
    type: 'button' //ts doesn't use any more message components
    action_ts: string
  }[];
} 

export type SlackEventRes = LinkSharedEvent | UrlVerificationCallback


export function safeCompare(a: string, b:string): boolean {
  const bufA = Buffer.from(a, 'utf-8')
  const bufB = Buffer.from(b, 'utf-8')

  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA,bufB)
}
import { Hono } from "hono";
import { EnvT } from "./env.ts";
import { env } from "hono/adapter";
import { Layout } from "./browser.tsx";
import { streamText } from 'hono/streaming'
import config from './env.ts'
import { stream } from "asset:///node/undici/api.d.ts";
const hono = new Hono()


const TestC = async ({ text, delay }: { text: string; delay: number }) => {
  await new Promise((resolve) => setTimeout(resolve, delay));
  return <p style={{ color: "green" }}>{text}</p>;
};


hono.get("/redirect/slack", (c) => {
    return c.redirect("")
})

hono.get("/hackclub", (c) => {

    const {HCA_CLIENT_ID, HCA_REDIRECT_URI} = env<EnvT>(c)

    const oidc_link = new URL("https://auth.hackclub.com/oauth/authorize")
    oidc_link.searchParams.append('client_id', HCA_CLIENT_ID)
    oidc_link.searchParams.append('redirect_uri', HCA_REDIRECT_URI)
    oidc_link.searchParams.append('response_type', 'code')
    // yeah no oidc_link.searchParams.append('scope', 'openid\+slack_id')


    return c.redirect(oidc_link.href + "&scope=openid+slack_id")
})

hono.get("/hackclub/callback", async (c) => {

    const {HCA_CLIENT_ID, HCA_CLIENT_SECRET, HCA_REDIRECT_URI} = env<EnvT>(c)

    const code = c.req.query("code")

    if (!code) {
        return c.html(<Layout>
            <p>Code not provided. Log in at <a href="/hackclub">/hackclub</a>.</p>
        </Layout>)
    }







    
    return streamText(c, async (stream) => {
        await stream.writeln("Trying to retrieve oauth token...")
        let hcatR: HCATokenRes = {} as HCATokenRes
        try {

            hcatR = (await HCACodeToToken(code, HCA_CLIENT_ID, HCA_CLIENT_SECRET, HCA_REDIRECT_URI))
        } catch (e) {
            console.log(e)
            await stream.writeln("Invalid token provided. Aborting.")
            return;
        }
        if(!hcatR.access_token) {
            await stream.writeln("Unable to fetch token. Aborting.")
            return;
        }
        const token = hcatR.access_token
        await stream.sleep(300)

        await stream.writeln("Successfully retrieved token. ")
        await stream.sleep(100)

        await stream.writeln("Retrieving your slack ID...")
        await stream.sleep(100)

        await stream.write("Hi there, ")

        stream.sleep(500)
        
        const uInfo = await HCAFetchUserInfo(token).catch(async e=> {
            console.log(e)
        })
        if (!uInfo) {
            await stream.write("<Error fetching slack ID>")
            return
        }
        await stream.writeln(uInfo.slack_id)

        await stream.writeln("Sending your channel join request...")
        await stream.sleep(1000)

        //TODO actually send the channel join request

        await stream.writeln(`"${config.confirmationMessage}"`)


        
    })
})

export default hono;


async function HCACodeToToken(code:string, client_id: string, client_secret: string, redirect_uri: string): Promise<HCATokenRes> {

    const params = new URLSearchParams()
    params.append("client_id", client_id)
    params.append("client_secret", client_secret)
    params.append("redirect_uri", redirect_uri)
    params.append("code", code)
    params.append("grant_type", "authorization_code")   
    
    const res = await fetch('https://auth.hackclub.com/oauth/token', {
        method: "POST",
        body: params.toString(),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })

    const j = await res.json()
    console.log(j)
    return j
}

async function HCAFetchUserInfo(access_token:string): Promise<{ sub: string, slack_id: string }> {
    const res = await fetch('https://auth.hackclub.com/oauth/userinfo', {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${access_token}`
        }
    })

    const j = await res.json()
    console.log(j)

    return j;
}


interface HCATokenRes {
    access_token: string;
    token_type: 'Bearer',
    id_token: string
}
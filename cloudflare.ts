import { Hono } from 'hono'
import slack from './lib/slack/router.ts'
import auth from './lib/auth/auth.tsx'
import { getSite } from "./lib/browser.tsx";


const app = new Hono()




app.route('/slack', slack)
app.route('/auth', auth)
app.get('/',getSite)


export default app;

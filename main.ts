import { Hono } from 'hono'
import {slack} from './lib/slack.ts'
const app = new Hono()

app.get('/', (c) => {
  return c.text('Hello Hono!') 
})



app.route('/slack', slack)


Deno.serve(app.fetch)

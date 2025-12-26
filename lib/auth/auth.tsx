import { Hono } from "hono";
import hackclub from './hackclub.tsx'

const hono = new Hono()

hono.route('/hackclub', hackclub)

export default hono;
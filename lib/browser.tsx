import { FC } from "hono/jsx";
import { createMiddleware } from "hono/factory";
import config, { EnvT } from "./env.ts";
import { env } from "hono/adapter";

export const Layout: FC = (props) => {
    return (
        <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title>{config.title}</title>
                <link rel="stylesheet" href="/static/style.css"/>
            </head>
            <body>{props.children}</body>
        </html>
    );
};

export const getSite = createMiddleware(async (c) => {
    const { HCA_CLIENT_ID, HCA_CLIENT_SECRET, } = env<EnvT>(c);
    
    return c.html(<Layout>
        <h1>{config.title}</h1>
        <p class="body">{config.body}</p>

        {HCA_CLIENT_SECRET && <LogInWithHackClubButton/>}

    </Layout>)
});


const LogInWithHackClubButton: FC= (props) => {

    return <a href="/auth/hackclub"> <button type="button" class="hca-button">
        <img  loading="lazy"src="https://assets.hackclub.com/icon-square.svg" alt="Hack Club logo" height={30} width={30}/>
        Execute with Hack Club
        </button> </a>

}

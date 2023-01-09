import * as dotenv from 'dotenv'
dotenv.config();

import { APIGatewayEvent, Context } from 'aws-lambda'
import { App, ExpressReceiver, LogLevel, ReceiverEvent } from '@slack/bolt'


const expressReceiver = new ExpressReceiver ({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  processBeforeResponse: true
});

const app = new App({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  token: `${process.env.SLACK_BOT_TOKEN}`,
  receiver: expressReceiver,
  logLevel: LogLevel.DEBUG
  
});

function parseRequestBody(stringBody: string | null, contentType: string | undefined) {
  try {
    if (!stringBody) {
        return "";
    }

    let result: any = {};

    if (contentType && contentType === "application/json") {
        return JSON.parse(stringBody);
    }

    let keyValuePairs: string[] = stringBody.split("&");
    keyValuePairs.forEach(function (pair: string): void {
        let individualKeyValuePair: string[] = pair.split("=");
        result[individualKeyValuePair[0]] = decodeURIComponent(individualKeyValuePair[1] || "");
    });
    return JSON.parse(JSON.stringify(result));

} catch {
    return "";
}
}
export async function handler (event: APIGatewayEvent, context: Context) {
  console.log(event.body)
  const payload = parseRequestBody(event.body,event.headers["content-type"]);
  console.log(payload)
  /*if(payload && payload.type && payload.type === 'url_verification'){
    console.log("verified")
    return {
      statusCode: 200,
      body: payload.challenge
    };
  }*/

  app.command('/sayhello', async({body, ack}) => {
    ack();
    await app.client.chat.postEphemeral({
      token: process.env.SLACK_BOT_TOKEN,
      channel: body.channel_id,
      text: "Greetings, user!" ,
      user: body.user_id
    });
  });

  app.message('Hello', async ({ message, say }) => {
    await say("Hi :wave:");
  });
  
  const slackEvent: ReceiverEvent = {
    body: payload,
    ack: async (response) => {
      return new Promise<void>((resolve,reject) => {
        return {
          statusCode: 200,
          body: response ?? ""
        };
      });
    },
  };
  
  await app.processEvent(slackEvent);

  return {
    statusCode: 200,
    body: ""
  }
}
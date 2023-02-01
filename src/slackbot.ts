import { APIGatewayEvent, Context } from 'aws-lambda'
import { App, ExpressReceiver, LogLevel, ReceiverEvent, LinkUnfurls, SectionBlock } from '@slack/bolt'
import * as HubspotClient from './hubspotClient';
import * as Url from 'url';

import * as dotenv from 'dotenv'
dotenv.config();

const expressReceiver = new ExpressReceiver({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  processBeforeResponse: true
});

const app = new App({
  signingSecret: `${process.env.SLACK_SIGNING_SECRET}`,
  token: `${process.env.SLACK_BOT_TOKEN}`,
  receiver: expressReceiver,
  logLevel: LogLevel.DEBUG

});

app.command('/sayhello', async ({ body, ack }) => {
  ack();
  await app.client.chat.postEphemeral({
    token: process.env.SLACK_BOT_TOKEN,
    channel: body.channel_id,
    text: "Greetings, user!",
    user: body.user_id
  });
});

app.message('Hello', async ({ message }) => {
  await app.client.chat.postMessage({
    token: process.env.SLACK_BOT_TOKEN,
    channel: message.channel,
    thread_ts: message.ts,
    text: "Hello :wave:"
  });
});

app.event('link_shared', async ({ payload }) => {

  let urls = getUrls(payload.links);

  const data = parseSlackUrl(payload.links)

  const unfurls: LinkUnfurls = {}

  for (var key in urls) {
    
    const testData = await HubspotClient.getCampaignData(data[key]);

    var blocks: SectionBlock[] =
      [{
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*<https://app.hubspot.com/contacts/4393631/record/2-7462670/${data}|${testData?.properties['campaign_name']}>*`
        }
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Status:*\n${testData?.properties['hs_pipeline_stage']}`
          },
          {
            type: "mrkdwn",
            text: `*Company:*\n${testData?.properties['company']}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Completed Components:*\n${testData?.properties['campaign_components_completed']}`
          },
          {
            type: "mrkdwn",
            text: `*Campaign Type:*\n${testData?.properties['campaign_type']}`
          }
        ]
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*Campaign Launch Date:*\n${testData?.properties['campaign_launch_date']}`
          },
          {
            type: "mrkdwn",
            text: `*Campaign End Date:*\n${testData?.properties['campaign_end_date']}`
          }
        ]
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Description*\n${testData?.properties['campaign_description']}`
        }
      }
      ]

    unfurls[`${urls[key].href}`] = {
      color: "#fd9a32",
      blocks
    }
    console.log(unfurls)
    await app.client.chat.unfurl({
      token: process.env.SLACK_BOT_TOKEN,
      channel: payload.channel,
      ts: payload.message_ts,
      unfurls: unfurls
    });
  }


})


function parseSlackUrl(payload: any) {

  var qArray = new Array<any>();
  const links = payload
  Object.entries(links).forEach(([key, value]) => {
    var q = Url.parse(links[`${key}`].url)
    qArray.push(q.pathname?.split('/').reverse()[1])
  });
  return qArray
}

function getUrls(payload: any) {
  let uriArray = new Array<Url.UrlWithStringQuery>();
  const links = payload
  Object.entries(links).forEach(([key, value]) => {
    var q = Url.parse(links[`${key}`].url)
    uriArray.push(q)
  });
  return uriArray

}

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

  }
  catch {
    return "";
  }
}
export async function handler(event: APIGatewayEvent, context: Context) {
  const payload = parseRequestBody(event.body, event.headers["content-type"]);
  if (payload && payload.type && payload.type === 'url_verification') {
    console.log("verified")
    return {
      statusCode: 200,
      body: payload.challenge
    };
  }

  const slackEvent: ReceiverEvent = {
    body: payload,
    ack: async (response) => {
      return new Promise<void>((resolve, reject) => {
        resolve();
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
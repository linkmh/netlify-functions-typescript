const hubspot = require('@hubspot/api-client');
const { SimplePublicObject, SimplePublicObjectWithAssociations } = require('@hubspot/api-client/lib/codegen/crm/companies');

//  Hubspot Client secret
const hubspotClient = new hubspot.Client({
  accessToken: process.env.HUBSPOT_SECRET_TOKEN
});

const properties = [
  "campaign_name",
  "hs_pipeline_stage",
  "hs_pipeline",
  "campaign_type",
  "joyous_crew",
  "campaign_launch_date",
  "campaign_end_date",
  "company",
  "report_due_date",
  "gcal_link",
  "report_gcal_link",
  "campaign_gcal_id",
  "report_gcal_id",
  "joyous_lead",
  "campaign_description",
  "campaign_components_completed"
];
const propertiesWithHistory = [
  "campaign_launch_date",
  "hs_pipeline_stage"
];
const associations = [
  "COMPANY",
  "CONTACT"
];

const archived = false;
const idProperty = undefined;

async function getCampaignData(objectId) {
  try {
    const apiResponse = await hubspotClient.crm.objects.basicApi.getById(process.env.HUBSPOT_OBJECT_TYPE, objectId, properties, propertiesWithHistory, associations, archived, idProperty);
    apiResponse.properties.hs_pipeline_stage = await getCampaignPipelineStage(apiResponse.properties.hs_pipeline_stage,apiResponse.properties.hs_pipeline)
    console.log()
    return apiResponse;
  } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
  }
}

async function getCampaignPipelineStage(hs_pipeline_stage,hs_pipeline) {
  try {
    const pipelineId = await getCampaignPipeline(hs_pipeline)
    const apiResponse = await hubspotClient.crm.pipelines.pipelineStagesApi.getById(process.env.HUBSPOT_OBJECT_TYPE,pipelineId,hs_pipeline_stage)
    return apiResponse.label;
  } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
  }
}

async function getCampaignPipeline(hs_pipeline) {
  try {
    const apiResponse = await hubspotClient.crm.pipelines.pipelinesApi.getById(process.env.HUBSPOT_OBJECT_TYPE,hs_pipeline)
    return apiResponse.id;
  } catch (e) {
    e.message === 'HTTP request failed'
      ? console.error(JSON.stringify(e.response, null, 2))
      : console.error(e)
  }
}

exports.getCampaignData = getCampaignData;
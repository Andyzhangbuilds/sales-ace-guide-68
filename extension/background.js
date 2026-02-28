// ============================================
// SALES AGENT OVERLAY — background.js
// Includes client context for AI coaching
// ============================================

const CONFIG = {
  ANTHROPIC_API_KEY: "",
  ASSEMBLYAI_API_KEY: "",
  HUBSPOT_ACCESS_TOKEN: "",
  SUPABASE_URL: "",
  SUPABASE_KEY: "",
};

// ─── Load saved keys on startup ───────────────────────────────────────────────
chrome.storage.sync.get([
  "anthropicKey", "assemblyaiKey", "hubspotToken",
  "supabaseUrl", "supabaseKey"
], (data) => {
  if (data.anthropicKey)  CONFIG.ANTHROPIC_API_KEY    = data.anthropicKey;
  if (data.assemblyaiKey) CONFIG.ASSEMBLYAI_API_KEY   = data.assemblyaiKey;
  if (data.hubspotToken)  CONFIG.HUBSPOT_ACCESS_TOKEN = data.hubspotToken;
  if (data.supabaseUrl)   CONFIG.SUPABASE_URL         = data.supabaseUrl;
  if (data.supabaseKey)   CONFIG.SUPABASE_KEY         = data.supabaseKey;
});

// ─── Session state ────────────────────────────────────────────────────────────
let sessionData = {
  transcript: [],
  insights: [],
  buyingSignals: [],
  objections: [],
  talkTime: 0,
  listenTime: 0,
  score: 0,
  nextBestAction: "",
  contactInfo: {},
  clientContext: null,
  platform: null,
  startedAt: null,
};

// ─── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {

    case "OVERLAY_READY":
      sessionData.platform  = message.platform;
      sessionData.startedAt = new Date().toISOString();
      console.log("[SalesAgent] Meeting started:", message.platform);
      break;

    case "CLIENT_LOADED":
      sessionData.clientContext = message.payload;
      console.log("[SalesAgent] Client loaded:", message.payload?.client_name);
      break;

    case "TRANSCRIPT_UPDATE":
      handleTranscriptUpdate(
        message.payload,
        message.payload.tabId || sender.tab?.id
      );
      break;

    case "END_MEETING_SYNC":
      handleEndMeeting(message.payload, sender.tab?.id);
      sendResponse({ status: "syncing" });
      break;

    case "UPDATE_CONFIG":
      if (message.payload.anthropicKey)  CONFIG.ANTHROPIC_API_KEY    = message.payload.anthropicKey;
      if (message.payload.assemblyaiKey) CONFIG.ASSEMBLYAI_API_KEY   = message.payload.assemblyaiKey;
      if (message.payload.hubspotToken)  CONFIG.HUBSPOT_ACCESS_TOKEN = message.payload.hubspotToken;
      if (message.payload.supabaseUrl)   CONFIG.SUPABASE_URL         = message.payload.supabaseUrl;
      if (message.payload.supabaseKey)   CONFIG.SUPABASE_KEY         = message.payload.supabaseKey;
      console.log("[SalesAgent] Config updated ✅");
      break;

    case "GET_SESSION":
      sendResponse(sessionData);
      break;

    case "STOP_CAPTURE":
      // Forward stop signal to any open capture windows
      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" }).catch(() => {});
      break;

    case "RESET_SESSION":
      resetSession();
      break;
  }
  return true;
});

// ─── Handle transcript segment ────────────────────────────────────────────────
async function handleTranscriptUpdate(payload, tabId) {
  const { text, speaker, durationMs } = payload;

  sessionData.transcript.push({
    text,
    speaker,
    timestamp: new Date().toISOString()
  });

  if (speaker === "advisor") sessionData.talkTime += durationMs;
  else sessionData.listenTime += durationMs;

  const totalTime  = sessionData.talkTime + sessionData.listenTime;
  const talkRatio  = totalTime > 0
    ? Math.round((sessionData.talkTime / totalTime) * 100)
    : 50;

  // Get AI insights every 5 transcript segments
  if (sessionData.transcript.length % 5 === 0) {
    const insights = await getAIInsights();

    if (insights) {
      sessionData.insights       = insights.insights      || [];
      sessionData.buyingSignals  = insights.buyingSignals || [];
      sessionData.objections     = insights.objections    || [];
      sessionData.nextBestAction = insights.nextBestAction || "";
      sessionData.score          = insights.score         || sessionData.score;
      sessionData.contactInfo    = {
        ...sessionData.contactInfo,
        ...insights.contactInfo
      };

      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: "INSIGHT_UPDATE",
          payload: {
            score:          sessionData.score,
            insights:       sessionData.insights,
            talkRatio,
            buyingSignals:  sessionData.buyingSignals,
            objections:     sessionData.objections,
            nextBestAction: sessionData.nextBestAction,
            rebuttal:       insights.rebuttal || "",
          }
        });
      }
    }
  }
}

// ─── Get AI insights from Claude ─────────────────────────────────────────────
async function getAIInsights() {
  if (!CONFIG.ANTHROPIC_API_KEY) {
    console.warn("[SalesAgent] No Anthropic key");
    return null;
  }

  try {
    const recentTranscript = sessionData.transcript
      .slice(-20)
      .map(t => `[${t.speaker}]: ${t.text}`)
      .join("\n");

    const client = sessionData.clientContext || {};

    const clientContext = client.client_name ? `
CLIENT PROFILE:
- Name:               ${client.client_name}
- Age:                ${client.age || "Unknown"}
- Profession:         ${client.profession || "Unknown"}
- Income Range:       ${client.income_range || "Unknown"}
- Risk Profile:       ${client.risk_profile || "Unknown"}
- Customer Segment:   ${client.customer_segment || "Unknown"}
- Net Worth:          ${client.estimated_net_worth || "Unknown"}
- Revenue Potential:  ${client.potential_revenue || "Unknown"}
- Target Products:    ${(client.product_offerings || []).join(", ") || "None"}
- Benefits to Use:    ${client.product_benefits || "None"}
- Additional Notes:   ${client.additional_notes || "None"}
    `.trim() : "No client profile loaded — give general sales coaching.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: `You are a real-time sales coach for a financial advisor. 
Use the client profile to give highly personalized, specific coaching based on exactly what was just said.
Focus on the client's risk profile, income, and target products when giving advice.
If an objection is raised, generate a specific rebuttal using the product benefits provided.
Return ONLY a valid JSON object with no markdown, no code blocks, no extra text:
{
  "score": <0-100 integer representing call quality>,
  "insights": [
    "<coaching tip 1 specific to this client>",
    "<coaching tip 2 specific to this client>",
    "<coaching tip 3 specific to this client>"
  ],
  "buyingSignals": ["<signal 1>", "<signal 2>"],
  "objections": ["<objection 1>", "<objection 2>"],
  "nextBestAction": "<one specific action the advisor should take right now>",
  "rebuttal": "<if an objection was raised, give a tailored rebuttal using the client benefits and profile — otherwise empty string>",
  "contactInfo": {
    "name": "<client name from profile>",
    "company": "<company if mentioned>",
    "email": "<email if mentioned>",
    "painPoints": ["<pain point 1>", "<pain point 2>"],
    "budget": "<income range or budget mentioned>",
    "timeline": "<timeline if mentioned>"
  }
}`,
        messages: [{
          role: "user",
          content: `${clientContext}\n\nLive call transcript (most recent):\n${recentTranscript}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error("[SalesAgent] AI insights error:", err);
    return null;
  }
}

// ─── Handle end of meeting ────────────────────────────────────────────────────
async function handleEndMeeting(payload, tabId) {
  console.log("[SalesAgent] Generating call summary...");

  const summary = await generateCallSummary(
    payload.durationSeconds,
    payload.client
  );

  if (summary) {
    await syncToHubSpot(summary, payload);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, {
        type: "CRM_SYNC_COMPLETE",
        payload: { success: true }
      });
    }
  }

  resetSession();
}

// ─── Generate full call summary ───────────────────────────────────────────────
async function generateCallSummary(durationSeconds, clientOverride) {
  if (!CONFIG.ANTHROPIC_API_KEY) return null;

  try {
    const fullTranscript = sessionData.transcript
      .map(t => `[${t.speaker}]: ${t.text}`)
      .join("\n");

    const client = clientOverride || sessionData.clientContext || {};

    const clientContext = client.client_name ? `
CLIENT: ${client.client_name}
SEGMENT: ${client.customer_segment}
PRODUCTS DISCUSSED: ${(client.product_offerings || []).join(", ")}
NET WORTH: ${client.estimated_net_worth}
REVENUE POTENTIAL: ${client.potential_revenue}
    `.trim() : "";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You are a sales call analyst for a financial advisor. 
Analyze the transcript and return ONLY a valid JSON object with no markdown:
{
  "summary": "<2-3 sentence overview of what happened>",
  "outcome": "<won/lost/follow_up_needed/proposal_requested/not_interested>",
  "contactName": "<full name>",
  "contactEmail": "<email if mentioned>",
  "contactPhone": "<phone if mentioned>",
  "company": "<company if mentioned>",
  "jobTitle": "<job title>",
  "painPoints": ["<pain point 1>", "<pain point 2>"],
  "budget": "<budget or income range>",
  "timeline": "<when they want to move forward>",
  "nextSteps": ["<next step 1>", "<next step 2>"],
  "followUpDate": "<YYYY-MM-DD suggested follow-up date>",
  "dealValue": "<estimated deal value>",
  "competitorsMentioned": ["<competitor 1>"],
  "keyQuotes": ["<important quote 1>", "<important quote 2>"],
  "productsInterested": ["<product 1>", "<product 2>"],
  "objectionsSummary": ["<objection raised 1>", "<objection raised 2>"]
}`,
        messages: [{
          role: "user",
          content: `${clientContext}\n\nFull transcript (${Math.round(durationSeconds / 60)} minutes):\n\n${fullTranscript}`
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);

  } catch (err) {
    console.error("[SalesAgent] Summary error:", err);
    return null;
  }
}

// ─── Sync to HubSpot ──────────────────────────────────────────────────────────
async function syncToHubSpot(summary, meetingPayload) {
  if (!CONFIG.HUBSPOT_ACCESS_TOKEN) {
    console.warn("[SalesAgent] No HubSpot token");
    return;
  }

  const BASE    = "https://api.hubapi.com";
  const HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CONFIG.HUBSPOT_ACCESS_TOKEN}`,
  };

  try {
    // ── Step 1: Find or create contact ────────────────────────────────────
    let contactVid = null;

    if (summary.contactEmail) {
      const searchRes = await fetch(
        `${BASE}/crm/v3/objects/contacts/search`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            filterGroups: [{
              filters: [{
                propertyName: "email",
                operator: "EQ",
                value: summary.contactEmail
              }]
            }]
          })
        }
      );
      const searchData = await searchRes.json();

      if (searchData.total > 0) {
        // Update existing
        contactVid = searchData.results[0].id;
        await fetch(`${BASE}/crm/v3/objects/contacts/${contactVid}`, {
          method: "PATCH",
          headers: HEADERS,
          body: JSON.stringify({
            properties: {
              firstname: summary.contactName?.split(" ")[0] || "",
              lastname:  summary.contactName?.split(" ").slice(1).join(" ") || "",
              phone:     summary.contactPhone || "",
              company:   summary.company || "",
              jobtitle:  summary.jobTitle || "",
            }
          })
        });
        console.log("[SalesAgent] Updated contact:", contactVid);
      } else {
        // Create new
        const createRes = await fetch(
          `${BASE}/crm/v3/objects/contacts`,
          {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({
              properties: {
                email:     summary.contactEmail,
                firstname: summary.contactName?.split(" ")[0] || "",
                lastname:  summary.contactName?.split(" ").slice(1).join(" ") || "",
                phone:     summary.contactPhone || "",
                company:   summary.company || "",
                jobtitle:  summary.jobTitle || "",
              }
            })
          }
        );
        const createData = await createRes.json();
        contactVid = createData.id;
        console.log("[SalesAgent] Created contact:", contactVid);
      }
    }

    if (contactVid) {
      // ── Step 2: Log call note ──────────────────────────────────────────
      const client = meetingPayload.client || sessionData.clientContext || {};

      const noteBody = `
📞 SALES CALL SUMMARY
─────────────────────────────────
Platform  : ${meetingPayload.platform || "Meeting"}
Duration  : ${Math.round(meetingPayload.durationSeconds / 60)} minutes
Date      : ${new Date(meetingPayload.endedAt).toLocaleDateString()}
Outcome   : ${(summary.outcome || "").toUpperCase().replace(/_/g, " ")}

CLIENT PROFILE
──────────────
Segment         : ${client.customer_segment || "Unknown"}
Risk Profile    : ${client.risk_profile || "Unknown"}
Income Range    : ${client.income_range || "Unknown"}
Net Worth       : ${client.estimated_net_worth || "Unknown"}
Revenue Potential: ${client.potential_revenue || "Unknown"}
Products Discussed: ${(client.product_offerings || []).join(", ") || "Unknown"}

CALL SUMMARY
──────────────
${summary.summary || "No summary available"}

PAIN POINTS
${(summary.painPoints || []).map(p => `• ${p}`).join("\n") || "• None identified"}

PRODUCTS INTERESTED
${(summary.productsInterested || []).map(p => `• ${p}`).join("\n") || "• None specified"}

OBJECTIONS RAISED
${(summary.objectionsSummary || []).map(o => `• ${o}`).join("\n") || "• None raised"}

BUDGET    : ${summary.budget    || "Not discussed"}
TIMELINE  : ${summary.timeline  || "Not discussed"}
DEAL VALUE: ${summary.dealValue || "Not discussed"}

NEXT STEPS
${(summary.nextSteps || []).map(s => `• ${s}`).join("\n") || "• None agreed"}

COMPETITORS MENTIONED
${(summary.competitorsMentioned || []).join(", ") || "None"}

KEY QUOTES
${(summary.keyQuotes || []).map(q => `"${q}"`).join("\n") || "None captured"}
      `.trim();

      const engRes = await fetch(
        `${BASE}/engagements/v1/engagements`,
        {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            engagement: {
              active: true,
              type: "NOTE",
              timestamp: Date.now(),
            },
            associations: {
              contactIds: [parseInt(contactVid)],
            },
            metadata: {
              body: noteBody,
            }
          })
        }
      );
      const engData = await engRes.json();
      console.log("[SalesAgent] ✅ Note logged:", engData.engagement?.id);

      // ── Step 3: Create follow-up task ──────────────────────────────────
      if (summary.followUpDate) {
        const followUpTs = new Date(summary.followUpDate).getTime();
        const taskRes = await fetch(
          `${BASE}/engagements/v1/engagements`,
          {
            method: "POST",
            headers: HEADERS,
            body: JSON.stringify({
              engagement: {
                active: true,
                type: "TASK",
                timestamp: followUpTs,
              },
              associations: {
                contactIds: [parseInt(contactVid)],
              },
              metadata: {
                body: `Follow up after sales call.\n\nNext steps:\n${
                  (summary.nextSteps || []).map(s => `• ${s}`).join("\n")
                }`,
                subject: `Follow up with ${summary.contactName || "prospect"} — ${
                  (summary.outcome || "").replace(/_/g, " ")
                }`,
                status: "NOT_STARTED",
                priority: "HIGH",
                taskType: "TODO",
                completionDate: followUpTs,
              }
            })
          }
        );
        const taskData = await taskRes.json();
        console.log("[SalesAgent] ✅ Task created:", taskData.engagement?.id);
      }
    }

    console.log("[SalesAgent] ✅ HubSpot sync complete!");

  } catch (err) {
    console.error("[SalesAgent] HubSpot error:", err);
  }
}

// ─── Reset session ────────────────────────────────────────────────────────────
function resetSession() {
  sessionData = {
    transcript:    [],
    insights:      [],
    buyingSignals: [],
    objections:    [],
    talkTime:      0,
    listenTime:    0,
    score:         0,
    nextBestAction: "",
    contactInfo:   {},
    clientContext: null,
    platform:      null,
    startedAt:     null,
  };
  console.log("[SalesAgent] Session reset");
}

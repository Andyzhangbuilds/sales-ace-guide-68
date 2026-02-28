// ============================================
// SALES AGENT OVERLAY — background.js
// ============================================

const CONFIG = {
  ANTHROPIC_API_KEY: "YOUR_ANTHROPIC_API_KEY",
  HUBSPOT_ACCESS_TOKEN: "YOUR_HUBSPOT_TOKEN",
};

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
  platform: null,
  startedAt: null,
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "OVERLAY_READY":
      sessionData.platform = message.platform;
      sessionData.startedAt = new Date().toISOString();
      break;
    case "TRANSCRIPT_UPDATE":
      handleTranscriptUpdate(message.payload, sender.tab?.id);
      break;
    case "END_MEETING_SYNC":
      handleEndMeeting(message.payload, sender.tab?.id);
      sendResponse({ status: "syncing" });
      break;
    case "UPDATE_CONFIG":
      CONFIG.ANTHROPIC_API_KEY = message.payload.anthropicKey || CONFIG.ANTHROPIC_API_KEY;
      CONFIG.HUBSPOT_ACCESS_TOKEN = message.payload.hubspotToken || CONFIG.HUBSPOT_ACCESS_TOKEN;
      break;
    case "RESET_SESSION":
      sessionData = {
        transcript: [], insights: [], buyingSignals: [], objections: [],
        talkTime: 0, listenTime: 0, score: 0, nextBestAction: "",
        contactInfo: {}, platform: null, startedAt: null
      };
      break;
  }
  return true;
});

async function handleTranscriptUpdate(payload, tabId) {
  const { text, speaker, durationMs } = payload;
  sessionData.transcript.push({ text, speaker, timestamp: new Date().toISOString() });

  if (speaker === "advisor") sessionData.talkTime += durationMs;
  else sessionData.listenTime += durationMs;

  const totalTime = sessionData.talkTime + sessionData.listenTime;
  const talkRatio = totalTime > 0 ? Math.round((sessionData.talkTime / totalTime) * 100) : 50;

  if (sessionData.transcript.length % 5 === 0) {
    const insights = await getAIInsights();
    if (insights) {
      sessionData.insights = insights.insights || [];
      sessionData.buyingSignals = insights.buyingSignals || [];
      sessionData.objections = insights.objections || [];
      sessionData.nextBestAction = insights.nextBestAction || "";
      sessionData.score = insights.score || sessionData.score;

      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          type: "INSIGHT_UPDATE",
          payload: {
            score: sessionData.score,
            insights: sessionData.insights,
            talkRatio,
            buyingSignals: sessionData.buyingSignals,
            objections: sessionData.objections,
            nextBestAction: sessionData.nextBestAction,
          }
        });
      }
    }
  }
}

async function getAIInsights() {
  try {
    const recentTranscript = sessionData.transcript
      .slice(-20)
      .map(t => `[${t.speaker}]: ${t.text}`)
      .join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: `You are a real-time sales coach. Return ONLY a JSON object with no markdown:
{
  "score": <0-100>,
  "insights": [<up to 3 short coaching tips>],
  "buyingSignals": [<short phrases of buying interest>],
  "objections": [<objections raised>],
  "nextBestAction": "<one clear sentence>",
  "contactInfo": {
    "name": "", "company": "", "email": "",
    "painPoints": [], "budget": "", "timeline": ""
  }
}`,
        messages: [{ role: "user", content: `Transcript:\n\n${recentTranscript}` }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("[SalesAgent] AI error:", err);
    return null;
  }
}

async function handleEndMeeting(payload, tabId) {
  const summary = await generateCallSummary(payload.durationSeconds);
  if (summary) {
    await syncToHubSpot(summary, payload);
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: "CRM_SYNC_COMPLETE", payload: { success: true } });
    }
  }
  sessionData = {
    transcript: [], insights: [], buyingSignals: [], objections: [],
    talkTime: 0, listenTime: 0, score: 0, nextBestAction: "",
    contactInfo: {}, platform: null, startedAt: null
  };
}

async function generateCallSummary(durationSeconds) {
  try {
    const fullTranscript = sessionData.transcript
      .map(t => `[${t.speaker}]: ${t.text}`)
      .join("\n");

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
        system: `You are a sales call analyst. Return ONLY a JSON object:
{
  "summary": "",
  "outcome": "<won/lost/follow_up_needed/proposal_requested/not_interested>",
  "contactName": "", "contactEmail": "", "contactPhone": "",
  "company": "", "jobTitle": "",
  "painPoints": [], "budget": "", "timeline": "",
  "nextSteps": [], "followUpDate": "<YYYY-MM-DD>",
  "dealValue": "", "competitorsmentioned": [],
  "keyQuotes": []
}`,
        messages: [{ role: "user", content: `Transcript (${Math.round(durationSeconds / 60)} mins):\n\n${fullTranscript}` }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("[SalesAgent] Summary error:", err);
    return null;
  }
}

async function syncToHubSpot(summary, meetingPayload) {
  const BASE = "https://api.hubapi.com";
  const HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CONFIG.HUBSPOT_ACCESS_TOKEN}`,
  };

  try {
    let contactId = null;

    if (summary.contactEmail) {
      const searchRes = await fetch(`${BASE}/crm/v3/objects/contacts/search`, {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({
          filterGroups: [{ filters: [{ propertyName: "email", operator: "EQ", value: summary.contactEmail }] }]
        })
      });
      const searchData = await searchRes.json();

      if (searchData.total > 0) {
        contactId = searchData.results[0].id;
      } else {
        const createRes = await fetch(`${BASE}/crm/v3/objects/contacts`, {
          method: "POST", headers: HEADERS,
          body: JSON.stringify({
            properties: {
              email: summary.contactEmail,
              firstname: summary.contactName?.split(" ")[0] || "",
              lastname: summary.contactName?.split(" ").slice(1).join(" ") || "",
              phone: summary.contactPhone || "",
              company: summary.company || "",
              jobtitle: summary.jobTitle || "",
            }
          })
        });
        const createData = await createRes.json();
        contactId = createData.id;
      }
    }

    if (contactId) {
      const noteBody = `
📞 SALES CALL SUMMARY
Platform: ${meetingPayload.platform}
Duration: ${Math.round(meetingPayload.durationSeconds / 60)} minutes

${summary.summary}

OUTCOME: ${summary.outcome?.toUpperCase()}
PAIN POINTS: ${(summary.painPoints || []).join(", ")}
BUDGET: ${summary.budget || "Not discussed"}
TIMELINE: ${summary.timeline || "Not discussed"}
NEXT STEPS: ${(summary.nextSteps || []).join(", ")}
      `.trim();

      await fetch(`${BASE}/crm/v3/objects/notes`, {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({
          properties: { hs_note_body: noteBody, hs_timestamp: new Date().toISOString() },
          associations: [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 202 }] }]
        })
      });

      if (summary.followUpDate) {
        await fetch(`${BASE}/crm/v3/objects/tasks`, {
          method: "POST", headers: HEADERS,
          body: JSON.stringify({
            properties: {
              hs_task_subject: `Follow up with ${summary.contactName || "prospect"}`,
              hs_task_body: (summary.nextSteps || []).join("\n"),
              hs_timestamp: new Date(summary.followUpDate).toISOString(),
              hs_task_status: "NOT_STARTED",
              hs_task_priority: "HIGH",
            },
            associations: [{ to: { id: contactId }, types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 204 }] }]
          })
        });
      }
    }

    console.log("[SalesAgent] ✅ HubSpot synced");
  } catch (err) {
    console.error("[SalesAgent] HubSpot error:", err);
  }
}

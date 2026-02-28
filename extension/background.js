// ============================================
// SALES AGENT OVERLAY — background.js
// Uses HubSpot Engagements API v1 for notes
// and tasks (no extra scopes needed)
// ============================================

// ─── Config (populated from popup storage) ───────────────────────────────────
const CONFIG = {
  ANTHROPIC_API_KEY: "",
  ASSEMBLYAI_API_KEY: "",
  HUBSPOT_ACCESS_TOKEN: "",
};

// ─── Load saved keys from storage on startup ─────────────────────────────────
chrome.storage.sync.get(["anthropicKey", "assemblyaiKey", "hubspotToken"], (data) => {
  if (data.anthropicKey)  CONFIG.ANTHROPIC_API_KEY    = data.anthropicKey;
  if (data.assemblyaiKey) CONFIG.ASSEMBLYAI_API_KEY   = data.assemblyaiKey;
  if (data.hubspotToken)  CONFIG.HUBSPOT_ACCESS_TOKEN = data.hubspotToken;
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
  platform: null,
  startedAt: null,
};

// ─── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "OVERLAY_READY":
      sessionData.platform = message.platform;
      sessionData.startedAt = new Date().toISOString();
      console.log("[SalesAgent] Meeting started on:", message.platform);
      break;
    case "TRANSCRIPT_UPDATE":
      handleTranscriptUpdate(message.payload, sender.tab?.id);
      break;
    case "END_MEETING_SYNC":
      handleEndMeeting(message.payload, sender.tab?.id);
      sendResponse({ status: "syncing" });
      break;
    case "UPDATE_CONFIG":
      if (message.payload.anthropicKey)  CONFIG.ANTHROPIC_API_KEY    = message.payload.anthropicKey;
      if (message.payload.assemblyaiKey) CONFIG.ASSEMBLYAI_API_KEY   = message.payload.assemblyaiKey;
      if (message.payload.hubspotToken)  CONFIG.HUBSPOT_ACCESS_TOKEN = message.payload.hubspotToken;
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
  sessionData.transcript.push({ text, speaker, timestamp: new Date().toISOString() });

  if (speaker === "advisor") sessionData.talkTime += durationMs;
  else sessionData.listenTime += durationMs;

  const totalTime = sessionData.talkTime + sessionData.listenTime;
  const talkRatio = totalTime > 0 ? Math.round((sessionData.talkTime / totalTime) * 100) : 50;

  if (sessionData.transcript.length % 5 === 0) {
    const insights = await getAIInsights();
    if (insights) {
      sessionData.insights       = insights.insights      || [];
      sessionData.buyingSignals  = insights.buyingSignals || [];
      sessionData.objections     = insights.objections    || [];
      sessionData.nextBestAction = insights.nextBestAction || "";
      sessionData.score          = insights.score         || sessionData.score;
      sessionData.contactInfo    = { ...sessionData.contactInfo, ...insights.contactInfo };

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
          }
        });
      }
    }
  }
}

// ─── Get AI insights from Claude ─────────────────────────────────────────────
async function getAIInsights() {
  if (!CONFIG.ANTHROPIC_API_KEY) return null;
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
        system: `You are a real-time sales coach. Return ONLY a JSON object with no markdown or extra text:
{
  "score": <0-100 integer>,
  "insights": [<up to 3 short coaching tips for right now>],
  "buyingSignals": [<short phrases indicating buying interest>],
  "objections": [<objections or concerns raised>],
  "nextBestAction": "<one clear sentence on what to do next>",
  "contactInfo": {
    "name": "<prospect name if mentioned>",
    "company": "<company if mentioned>",
    "email": "<email if mentioned>",
    "painPoints": [],
    "budget": "<budget if mentioned>",
    "timeline": "<timeline if mentioned>"
  }
}`,
        messages: [{ role: "user", content: `Transcript:\n\n${recentTranscript}` }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "{}";
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("[SalesAgent] AI insights error:", err);
    return null;
  }
}

// ─── Handle end of meeting ────────────────────────────────────────────────────
async function handleEndMeeting(payload, tabId) {
  console.log("[SalesAgent] Generating call summary...");
  const summary = await generateCallSummary(payload.durationSeconds);
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
async function generateCallSummary(durationSeconds) {
  if (!CONFIG.ANTHROPIC_API_KEY) return null;
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
        system: `You are a sales call analyst. Return ONLY a JSON object with no markdown:
{
  "summary": "<2-3 sentence overview>",
  "outcome": "<won/lost/follow_up_needed/proposal_requested/not_interested>",
  "contactName": "<full name>",
  "contactEmail": "<email>",
  "contactPhone": "<phone>",
  "company": "<company name>",
  "jobTitle": "<their job title>",
  "painPoints": [],
  "budget": "<budget if mentioned>",
  "timeline": "<timeline if mentioned>",
  "nextSteps": [],
  "followUpDate": "<YYYY-MM-DD suggested follow-up>",
  "dealValue": "<estimated value if mentioned>",
  "competitorsMentioned": [],
  "keyQuotes": []
}`,
        messages: [{
          role: "user",
          content: `Call transcript (${Math.round(durationSeconds / 60)} minutes):\n\n${fullTranscript}`
        }]
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

// ─── Sync to HubSpot ──────────────────────────────────────────────────────────
async function syncToHubSpot(summary, meetingPayload) {
  if (!CONFIG.HUBSPOT_ACCESS_TOKEN) {
    console.warn("[SalesAgent] No HubSpot token found");
    return;
  }

  const BASE = "https://api.hubapi.com";
  const HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CONFIG.HUBSPOT_ACCESS_TOKEN}`,
  };

  try {
    // ── Step 1: Find or create contact ────────────────────────────────────────
    let contactVid = null;

    if (summary.contactEmail) {
      const searchRes = await fetch(`${BASE}/crm/v3/objects/contacts/search`, {
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
      });
      const searchData = await searchRes.json();

      if (searchData.total > 0) {
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
        const createRes = await fetch(`${BASE}/crm/v3/objects/contacts`, {
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
        });
        const createData = await createRes.json();
        contactVid = createData.id;
        console.log("[SalesAgent] Created contact:", contactVid);
      }
    }

    // ── Step 2: Log call note via Engagements API v1 ──────────────────────────
    const noteBody = `
📞 SALES CALL SUMMARY
─────────────────────────────
Platform : ${meetingPayload.platform || "Meeting"}
Duration : ${Math.round(meetingPayload.durationSeconds / 60)} minutes
Date     : ${new Date(meetingPayload.endedAt).toLocaleDateString()}
Outcome  : ${(summary.outcome || "").toUpperCase().replace(/_/g, " ")}

SUMMARY
${summary.summary || "No summary available"}

PAIN POINTS
${(summary.painPoints || []).map(p => `• ${p}`).join("\n") || "• None identified"}

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

    if (contactVid) {
      const engRes = await fetch(`${BASE}/engagements/v1/engagements`, {
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
      });
      const engData = await engRes.json();
      console.log("[SalesAgent] ✅ Note logged:", engData.engagement?.id);

      // ── Step 3: Create follow-up task ─────────────────────────────────────
      if (summary.followUpDate) {
        const followUpTs = new Date(summary.followUpDate).getTime();
        const taskRes = await fetch(`${BASE}/engagements/v1/engagements`, {
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
              body: `Follow up after sales call.\n\nNext steps:\n${(summary.nextSteps || []).map(s => `• ${s}`).join("\n")}`,
              subject: `Follow up with ${summary.contactName || "prospect"} — ${(summary.outcome || "").replace(/_/g, " ")}`,
              status: "NOT_STARTED",
              priority: "HIGH",
              taskType: "TODO",
              completionDate: followUpTs,
            }
          })
        });
        const taskData = await taskRes.json();
        console.log("[SalesAgent] ✅ Task created:", taskData.engagement?.id);
      }
    }

    console.log("[SalesAgent] ✅ HubSpot sync complete!");
  } catch (err) {
    console.error("[SalesAgent] HubSpot sync error:", err);
  }
}

// ─── Reset session ────────────────────────────────────────────────────────────
function resetSession() {
  sessionData = {
    transcript: [], insights: [], buyingSignals: [], objections: [],
    talkTime: 0, listenTime: 0, score: 0, nextBestAction: "",
    contactInfo: {}, platform: null, startedAt: null,
  };
  console.log("[SalesAgent] Session reset");
}

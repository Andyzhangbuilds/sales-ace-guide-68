// ============================================
// SALES AGENT OVERLAY — background.js
// Uses tabCapture to bypass Meet CSP
// Uses HubSpot Engagements API v1
// ============================================

// ─── Config ───────────────────────────────────────────────────────────────────
const CONFIG = {
  ANTHROPIC_API_KEY: "",
  ASSEMBLYAI_API_KEY: "",
  HUBSPOT_ACCESS_TOKEN: "",
};

// ─── Load saved keys on startup ───────────────────────────────────────────────
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

// ─── Tab capture state ────────────────────────────────────────────────────────
let assemblySocket = null;
let captureTabId = null;

// ─── Message handler ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case "OVERLAY_READY":
      sessionData.platform = message.platform;
      sessionData.startedAt = new Date().toISOString();
      break;
    case "TRANSCRIPT_UPDATE":
      handleTranscriptUpdate(message.payload, sender.tab?.id);
      break;
    case "START_TAB_CAPTURE":
      captureTabId = sender.tab?.id;
      startTabCapture(message.payload.assemblyaiKey, captureTabId);
      break;
    case "STOP_TAB_CAPTURE":
      stopTabCapture();
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

// ─── Tab Audio Capture ────────────────────────────────────────────────────────
async function startTabCapture(assemblyaiKey, tabId) {
  try {
    chrome.tabCapture.capture(
      { audio: true, video: false },
      async (stream) => {
        if (!stream) {
          console.error("[SalesAgent] Tab capture failed:", chrome.runtime.lastError?.message);
          return;
        }

        console.log("[SalesAgent] 🎤 Tab audio captured successfully");

        // Get AssemblyAI token
        const tokenRes = await fetch("https://api.assemblyai.com/v2/realtime/token", {
          method: "POST",
          headers: {
            "Authorization": assemblyaiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ expires_in: 3600 })
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.token) {
          console.error("[SalesAgent] AssemblyAI token failed:", tokenData);
          return;
        }

        // Connect WebSocket to AssemblyAI
        assemblySocket = new WebSocket(
          `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenData.token}`
        );

        assemblySocket.onopen = () => {
          console.log("[SalesAgent] ✅ AssemblyAI WebSocket connected");

          const audioContext = new AudioContext({ sampleRate: 16000 });
          const source = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(4096, 1, 1);

          processor.onaudioprocess = (e) => {
            if (assemblySocket?.readyState !== WebSocket.OPEN) return;
            const inputData = e.inputBuffer.getChannelData(0);
            const int16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            assemblySocket.send(int16.buffer);
          };

          source.connect(processor);
          processor.connect(audioContext.destination);
        };

        assemblySocket.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.message_type === "FinalTranscript" && data.text?.trim()) {
            console.log("[SalesAgent] 📝 Transcript:", data.text);
            handleTranscriptUpdate({
              text: data.text,
              speaker: "advisor",
              durationMs: (data.audio_duration * 1000) || 2000
            }, tabId);
          }
        };

        assemblySocket.onerror = (err) => {
          console.error("[SalesAgent] AssemblyAI socket error:", err);
        };

        assemblySocket.onclose = () => {
          console.log("[SalesAgent] AssemblyAI socket closed");
        };
      }
    );
  } catch (err) {
    console.error("[SalesAgent] startTabCapture error:", err);
  }
}

function stopTabCapture() {
  if (assemblySocket) {
    assemblySocket.close();
    assemblySocket = null;
  }
  console.log("[SalesAgent] Tab capture stopped");
}

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

      const targetTab = tabId || captureTabId;
      if (targetTab) {
        chrome.tabs.sendMessage(targetTab, {
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
  "insights": [<up to 3 short coaching tips>],
  "buyingSignals": [<buying interest phrases>],
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
    console.error("[SalesAgent] AI insights error:", err);
    return null;
  }
}

// ─── Handle end of meeting ────────────────────────────────────────────────────
async function handleEndMeeting(payload, tabId) {
  console.log("[SalesAgent] Generating call summary...");
  stopTabCapture();
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
  "summary": "",
  "outcome": "<won/lost/follow_up_needed/proposal_requested/not_interested>",
  "contactName": "", "contactEmail": "", "contactPhone": "",
  "company": "", "jobTitle": "",
  "painPoints": [], "budget": "", "timeline": "",
  "nextSteps": [], "followUpDate": "<YYYY-MM-DD>",
  "dealValue": "", "competitorsMentioned": [], "keyQuotes": []
}`,
        messages: [{
          role: "user",
          content: `Transcript (${Math.round(durationSeconds / 60)} mins):\n\n${fullTranscript}`
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
    console.warn("[SalesAgent] No HubSpot token");
    return;
  }

  const BASE = "https://api.hubapi.com";
  const HEADERS = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${CONFIG.HUBSPOT_ACCESS_TOKEN}`,
  };

  try {
    let contactVid = null;

    if (summary.contactEmail) {
      const searchRes = await fetch(`${BASE}/crm/v3/objects/contacts/search`, {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({
          filterGroups: [{
            filters: [{ propertyName: "email", operator: "EQ", value: summary.contactEmail }]
          }]
        })
      });
      const searchData = await searchRes.json();

      if (searchData.total > 0) {
        contactVid = searchData.results[0].id;
        await fetch(`${BASE}/crm/v3/objects/contacts/${contactVid}`, {
          method: "PATCH", headers: HEADERS,
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
      } else {
        const createRes = await fetch(`${BASE}/crm/v3/objects/contacts`, {
          method: "POST", headers: HEADERS,
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
      }
    }

    if (contactVid) {
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

      await fetch(`${BASE}/engagements/v1/engagements`, {
        method: "POST", headers: HEADERS,
        body: JSON.stringify({
          engagement: { active: true, type: "NOTE", timestamp: Date.now() },
          associations: { contactIds: [parseInt(contactVid)] },
          metadata: { body: noteBody }
        })
      });

      if (summary.followUpDate) {
        const followUpTs = new Date(summary.followUpDate).getTime();
        await fetch(`${BASE}/engagements/v1/engagements`, {
          method: "POST", headers: HEADERS,
          body: JSON.stringify({
            engagement: { active: true, type: "TASK", timestamp: followUpTs },
            associations: { contactIds: [parseInt(contactVid)] },
            metadata: {
              body: `Follow up after sales call.\n\nNext steps:\n${(summary.nextSteps || []).map(s => `• ${s}`).join("\n")}`,
              subject: `Follow up with ${summary.contactName || "prospect"}`,
              status: "NOT_STARTED",
              priority: "HIGH",
              taskType: "TODO",
              completionDate: followUpTs,
            }
          })
        });
      }

      console.log("[SalesAgent] ✅ HubSpot sync complete!");
    }
  } catch (err) {
    console.error("[SalesAgent] HubSpot error:", err);
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

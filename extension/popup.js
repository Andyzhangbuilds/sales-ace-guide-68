// ============================================
// SALES AGENT OVERLAY — popup.js
// tabCapture must run from popup (not service worker)
// ============================================

let captureStream = null;

document.addEventListener("DOMContentLoaded", () => {

  // ─── Load saved keys ─────────────────────────────────────────────────────
  chrome.storage.sync.get(["anthropicKey", "assemblyaiKey", "hubspotToken"], (data) => {
    console.log("[SalesAgent Popup] Loaded keys:", {
      anthropicKey:  data.anthropicKey  ? "✅" : "❌",
      assemblyaiKey: data.assemblyaiKey ? "✅" : "❌",
      hubspotToken:  data.hubspotToken  ? "✅" : "❌",
    });
    if (data.anthropicKey)  document.getElementById("anthropic-key").value  = data.anthropicKey;
    if (data.assemblyaiKey) document.getElementById("assemblyai-key").value = data.assemblyaiKey;
    if (data.hubspotToken)  document.getElementById("hubspot-token").value  = data.hubspotToken;
  });

  // ─── Check if on a meeting tab ───────────────────────────────────────────
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || "";
    const isOnMeeting =
      url.includes("meet.google.com") ||
      url.includes("teams.microsoft.com") ||
      url.includes("zoom.us");

    if (isOnMeeting) {
      document.getElementById("status-dot").classList.add("active");
      document.getElementById("status-text").textContent = "Meeting detected ✅";
      document.getElementById("status-text").style.color = "#63ffb4";
    }
  });

});

// ─── Save all 3 keys ─────────────────────────────────────────────────────────
document.getElementById("btn-save-config").addEventListener("click", () => {
  const anthropicKey  = document.getElementById("anthropic-key").value.trim();
  const assemblyaiKey = document.getElementById("assemblyai-key").value.trim();
  const hubspotToken  = document.getElementById("hubspot-token").value.trim();

  console.log("[SalesAgent Popup] Saving:", {
    anthropicKey:  anthropicKey  ? "✅" : "❌",
    assemblyaiKey: assemblyaiKey ? "✅" : "❌",
    hubspotToken:  hubspotToken  ? "✅" : "❌",
  });

  chrome.storage.sync.set({ anthropicKey, assemblyaiKey, hubspotToken }, () => {
    if (chrome.runtime.lastError) {
      console.error("[SalesAgent Popup] Save error:", chrome.runtime.lastError);
      return;
    }
    chrome.runtime.sendMessage({
      type: "UPDATE_CONFIG",
      payload: { anthropicKey, assemblyaiKey, hubspotToken }
    });
    const msg = document.getElementById("save-msg");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 2000);
  });
});

// ─── Show Overlay + Start Tab Capture ────────────────────────────────────────
document.getElementById("btn-show-overlay").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;

    // Show the overlay on the meeting page
    chrome.tabs.sendMessage(tab.id, { type: "SHOW_OVERLAY" });

    // Get AssemblyAI key
    chrome.storage.sync.get(["assemblyaiKey"], (data) => {
      if (!data.assemblyaiKey) {
        console.warn("[SalesAgent] No AssemblyAI key — enter it in config");
        window.close();
        return;
      }

      // tabCapture MUST be called from popup with user gesture
      chrome.tabCapture.capture({ audio: true, video: false }, (stream) => {
        if (!stream) {
          console.error("[SalesAgent] Tab capture failed:", chrome.runtime.lastError?.message);
          window.close();
          return;
        }

        console.log("[SalesAgent] 🎤 Tab audio captured! Starting transcription...");
        captureStream = stream;

        // Start AssemblyAI transcription directly here in popup
        startAssemblyAI(stream, data.assemblyaiKey, tab.id);
      });
    });

    window.close();
  });
});

// ─── AssemblyAI transcription (runs in popup context) ────────────────────────
async function startAssemblyAI(stream, assemblyaiKey, tabId) {
  try {
    // Get temp token from AssemblyAI
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
      console.error("[SalesAgent] AssemblyAI token error:", tokenData);
      return;
    }

    console.log("[SalesAgent] ✅ AssemblyAI token received");

    // Open WebSocket to AssemblyAI
    const socket = new WebSocket(
      `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenData.token}`
    );

    socket.onopen = () => {
      console.log("[SalesAgent] ✅ AssemblyAI WebSocket open — streaming audio");

      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (socket.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        socket.send(int16.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.message_type === "FinalTranscript" && data.text?.trim()) {
        console.log("[SalesAgent] 📝 Transcript:", data.text);

        // Send transcript to background for AI processing
        chrome.runtime.sendMessage({
          type: "TRANSCRIPT_UPDATE",
          payload: {
            text: data.text,
            speaker: "advisor",
            durationMs: (data.audio_duration * 1000) || 2000,
            tabId: tabId
          }
        });
      }
    };

    socket.onerror = (err) => console.error("[SalesAgent] Socket error:", err);
    socket.onclose = () => console.log("[SalesAgent] Socket closed");

  } catch (err) {
    console.error("[SalesAgent] AssemblyAI error:", err);
  }
}

// ─── End meeting & sync ───────────────────────────────────────────────────────
document.getElementById("btn-end-sync").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "END_MEETING_SYNC",
        payload: {
          platform: "popup-triggered",
          durationSeconds: 0,
          endedAt: new Date().toISOString()
        }
      });

      // Stop stream
      if (captureStream) {
        captureStream.getTracks().forEach(t => t.stop());
        captureStream = null;
      }

      window.close();
    }
  });
});

// ─── Reset session ────────────────────────────────────────────────────────────
document.getElementById("link-reset").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "RESET_SESSION" });
  if (captureStream) {
    captureStream.getTracks().forEach(t => t.stop());
    captureStream = null;
  }
  window.close();
});

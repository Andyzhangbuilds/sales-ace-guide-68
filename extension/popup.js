// ============================================
// SALES AGENT OVERLAY — popup.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  // ─── Load saved keys into fields ───────────────────────────────────────────
  chrome.storage.sync.get(["anthropicKey", "assemblyaiKey", "hubspotToken"], (data) => {
    console.log("[SalesAgent Popup] Loaded keys:", data);
    if (data.anthropicKey)  document.getElementById("anthropic-key").value  = data.anthropicKey;
    if (data.assemblyaiKey) document.getElementById("assemblyai-key").value = data.assemblyaiKey;
    if (data.hubspotToken)  document.getElementById("hubspot-token").value  = data.hubspotToken;
  });

  // ─── Check if on a meeting tab ─────────────────────────────────────────────
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

// ─── Save all 3 keys ───────────────────────────────────────────────────────
document.getElementById("btn-save-config").addEventListener("click", () => {

  const anthropicKey  = document.getElementById("anthropic-key").value.trim();
  const assemblyaiKey = document.getElementById("assemblyai-key").value.trim();
  const hubspotToken  = document.getElementById("hubspot-token").value.trim();

  console.log("[SalesAgent Popup] Saving keys...", {
    anthropicKey:  anthropicKey  ? "✅ present" : "❌ empty",
    assemblyaiKey: assemblyaiKey ? "✅ present" : "❌ empty",
    hubspotToken:  hubspotToken  ? "✅ present" : "❌ empty",
  });

  chrome.storage.sync.set({ anthropicKey, assemblyaiKey, hubspotToken }, () => {
    if (chrome.runtime.lastError) {
      console.error("[SalesAgent Popup] Save error:", chrome.runtime.lastError);
      return;
    }

    console.log("[SalesAgent Popup] ✅ All keys saved successfully");

    // Notify background service worker immediately
    chrome.runtime.sendMessage({
      type: "UPDATE_CONFIG",
      payload: { anthropicKey, assemblyaiKey, hubspotToken }
    });

    // Show success message
    const msg = document.getElementById("save-msg");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 2000);
  });

});

// ─── Show overlay on active tab ────────────────────────────────────────────
document.getElementById("btn-show-overlay").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_OVERLAY" });
      window.close();
    }
  });
});

// ─── End meeting & sync ────────────────────────────────────────────────────
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
      window.close();
    }
  });
});

// ─── Reset session ─────────────────────────────────────────────────────────
document.getElementById("link-reset").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "RESET_SESSION" });
  window.close();
});

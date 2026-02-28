// ============================================
// SALES AGENT OVERLAY — popup.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  chrome.storage.sync.get(["anthropicKey", "assemblyaiKey", "hubspotToken"], (data) => {
    if (data.anthropicKey)  document.getElementById("anthropic-key").value  = data.anthropicKey;
    if (data.assemblyaiKey) document.getElementById("assemblyai-key").value = data.assemblyaiKey;
    if (data.hubspotToken)  document.getElementById("hubspot-token").value  = data.hubspotToken;
  });

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

// Save keys
document.getElementById("btn-save-config").addEventListener("click", () => {
  const anthropicKey  = document.getElementById("anthropic-key").value.trim();
  const assemblyaiKey = document.getElementById("assemblyai-key").value.trim();
  const hubspotToken  = document.getElementById("hubspot-token").value.trim();

  chrome.storage.sync.set({ anthropicKey, assemblyaiKey, hubspotToken }, () => {
    chrome.runtime.sendMessage({
      type: "UPDATE_CONFIG",
      payload: { anthropicKey, assemblyaiKey, hubspotToken }
    });
    const msg = document.getElementById("save-msg");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 2000);
  });
});

// Show Overlay + Start Capture
document.getElementById("btn-show-overlay").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) return;

    chrome.tabs.sendMessage(tab.id, { type: "SHOW_OVERLAY" });

    chrome.storage.sync.get(["assemblyaiKey"], (data) => {
      if (!data.assemblyaiKey) {
        alert("Please enter your AssemblyAI key in API Configuration first!");
        return;
      }

      const captureUrl = chrome.runtime.getURL(
        `capture.html?key=${encodeURIComponent(data.assemblyaiKey)}&tabId=${tab.id}`
      );

      chrome.windows.create({
        url: captureUrl,
        type: "popup",
        width: 1,
        height: 1,
        left: 0,
        top: 0,
        focused: false
      });

      window.close();
    });
  });
});

// End & Sync — triggered from popup
document.getElementById("btn-end-sync").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) return;

    chrome.runtime.sendMessage({ type: "GET_SESSION" }, (session) => {
      const startedAt = session?.startedAt
        ? new Date(session.startedAt).getTime()
        : Date.now();
      const durationSeconds = Math.floor((Date.now() - startedAt) / 1000);

      chrome.runtime.sendMessage({
        type: "END_MEETING_SYNC",
        payload: {
          platform: "google_meet",
          durationSeconds,
          endedAt: new Date().toISOString()
        }
      });

      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
      window.close();
    });
  });
});

// Reset
document.getElementById("link-reset").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "RESET_SESSION" });
  chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
  window.close();
});

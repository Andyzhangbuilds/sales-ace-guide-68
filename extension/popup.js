// ============================================
// SALES AGENT OVERLAY — popup.js
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.sync.get(["anthropicKey", "hubspotToken"], (data) => {
    if (data.anthropicKey) document.getElementById("anthropic-key").value = data.anthropicKey;
    if (data.hubspotToken) document.getElementById("hubspot-token").value = data.hubspotToken;
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

document.getElementById("btn-save-config").addEventListener("click", () => {
  const anthropicKey = document.getElementById("anthropic-key").value.trim();
  const hubspotToken = document.getElementById("hubspot-token").value.trim();

  chrome.storage.sync.set({ anthropicKey, hubspotToken }, () => {
    chrome.runtime.sendMessage({ type: "UPDATE_CONFIG", payload: { anthropicKey, hubspotToken } });
    const msg = document.getElementById("save-msg");
    msg.style.display = "block";
    setTimeout(() => { msg.style.display = "none"; }, 2000);
  });
});

document.getElementById("btn-show-overlay").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_OVERLAY" });
      window.close();
    }
  });
});

document.getElementById("btn-end-sync").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: "END_MEETING_SYNC",
        payload: { platform: "popup-triggered", durationSeconds: 0, endedAt: new Date().toISOString() }
      });
      window.close();
    }
  });
});

document.getElementById("link-reset").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.sendMessage({ type: "RESET_SESSION" });
  window.close();
});

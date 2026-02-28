// ============================================
// SALES AGENT OVERLAY — popup.js
// Self-contained pre-meeting form
// No Supabase needed — all in extension
// ============================================

// ─── Tab switching ────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add("active");
  });
});

// ─── Product checkbox toggle ──────────────────────────────────────────────────
document.querySelectorAll(".product-check").forEach(label => {
  label.addEventListener("click", () => {
    label.classList.toggle("selected");
    const checkbox = label.querySelector("input[type=checkbox]");
    checkbox.checked = !checkbox.checked;
  });
});

// ─── Load saved keys + last client on open ────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  chrome.storage.sync.get([
    "anthropicKey", "assemblyaiKey", "hubspotToken", "lastClientForm"
  ], (data) => {

    // Keys
    if (data.anthropicKey)  document.getElementById("anthropic-key").value  = data.anthropicKey;
    if (data.assemblyaiKey) document.getElementById("assemblyai-key").value = data.assemblyaiKey;
    if (data.hubspotToken)  document.getElementById("hubspot-token").value  = data.hubspotToken;

    // Restore last filled form
    if (data.lastClientForm) {
      const f = data.lastClientForm;
      if (f.client_name)       document.getElementById("client-name").value        = f.client_name;
      if (f.age)               document.getElementById("client-age").value         = f.age;
      if (f.income_range)      document.getElementById("client-income").value      = f.income_range;
      if (f.profession)        document.getElementById("client-profession").value  = f.profession;
      if (f.risk_profile)      document.getElementById("client-risk").value        = f.risk_profile;
      if (f.customer_segment)  document.getElementById("customer-segment").value   = f.customer_segment;
      if (f.estimated_net_worth) document.getElementById("net-worth").value        = f.estimated_net_worth;
      if (f.potential_revenue) document.getElementById("revenue-potential").value  = f.potential_revenue;
      if (f.product_benefits)  document.getElementById("product-benefits").value   = f.product_benefits;
      if (f.additional_notes)  document.getElementById("additional-notes").value   = f.additional_notes;

      // Restore product checkboxes
      (f.product_offerings || []).forEach(product => {
        const label = document.querySelector(`[data-product="${product}"]`);
        if (label) {
          label.classList.add("selected");
          label.querySelector("input").checked = true;
        }
      });
    }
  });

  // Check if on meeting tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = tabs[0]?.url || "";
    const isOnMeeting =
      url.includes("meet.google.com") ||
      url.includes("teams.microsoft.com") ||
      url.includes("zoom.us");

    const pill = document.getElementById("status-pill");
    const dot  = document.getElementById("status-dot");
    const text = document.getElementById("status-text");

    if (isOnMeeting) {
      pill.classList.add("active");
      dot.classList.add("active");
      text.textContent = "Meeting detected";
    }
  });

});

// ─── Collect form data ────────────────────────────────────────────────────────
function collectFormData() {
  const selectedProducts = Array.from(
    document.querySelectorAll(".product-check.selected input")
  ).map(i => i.value);

  return {
    client_name:          document.getElementById("client-name").value.trim(),
    age:                  document.getElementById("client-age").value.trim(),
    income_range:         document.getElementById("client-income").value,
    profession:           document.getElementById("client-profession").value.trim(),
    risk_profile:         document.getElementById("client-risk").value,
    customer_segment:     document.getElementById("customer-segment").value,
    estimated_net_worth:  document.getElementById("net-worth").value.trim(),
    potential_revenue:    document.getElementById("revenue-potential").value.trim(),
    product_offerings:    selectedProducts,
    product_benefits:     document.getElementById("product-benefits").value.trim(),
    additional_notes:     document.getElementById("additional-notes").value.trim(),
  };
}

// ─── Start Meeting + Overlay ──────────────────────────────────────────────────
document.getElementById("btn-start-meeting").addEventListener("click", () => {
  const client = collectFormData();
  const btn    = document.getElementById("btn-start-meeting");

  // Save form for next time
  chrome.storage.sync.set({ lastClientForm: client });

  // Notify background of client context
  chrome.runtime.sendMessage({ type: "CLIENT_LOADED", payload: client });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id) {
      alert("Please open Google Meet first, then click Start Meeting!");
      return;
    }

    const url = tab.url || "";
    const isOnMeeting =
      url.includes("meet.google.com") ||
      url.includes("teams.microsoft.com") ||
      url.includes("zoom.us");

    if (!isOnMeeting) {
      alert("Please navigate to Google Meet first, then click Start Meeting!");
      return;
    }

    // Send overlay + client to content script
    chrome.tabs.sendMessage(tab.id, {
      type: "SHOW_OVERLAY",
      payload: { client }
    });

    // Start audio capture
    chrome.storage.sync.get(["assemblyaiKey"], (data) => {
      if (!data.assemblyaiKey) {
        alert("Please add your AssemblyAI key in the Config tab first!");
        return;
      }

      const captureUrl = chrome.runtime.getURL(
        `capture.html?key=${encodeURIComponent(data.assemblyaiKey)}&tabId=${tab.id}`
      );

      chrome.windows.create({
        url: captureUrl,
        type: "popup",
        width: 1, height: 1,
        left: 0, top: 0,
        focused: false
      });

      btn.textContent = "✅ Meeting Started!";
      setTimeout(() => {
        btn.textContent = "🎙 Start Meeting + Overlay";
        window.close();
      }, 1000);
    });
  });
});

// ─── Show Overlay Only (no capture) ──────────────────────────────────────────
document.getElementById("btn-show-overlay-only").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "SHOW_OVERLAY", payload: {} });
      window.close();
    }
  });
});

// ─── End & Sync (both tabs) ───────────────────────────────────────────────────
function endAndSync() {
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
          endedAt: new Date().toISOString(),
          client: session?.clientContext || null
        }
      });

      chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
      window.close();
    });
  });
}

document.getElementById("btn-end-sync").addEventListener("click", endAndSync);
document.getElementById("btn-end-sync-2").addEventListener("click", endAndSync);

// ─── Save API Keys ────────────────────────────────────────────────────────────
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

// ─── Reset ────────────────────────────────────────────────────────────────────
function resetSession() {
  chrome.runtime.sendMessage({ type: "RESET_SESSION" });
  chrome.runtime.sendMessage({ type: "STOP_CAPTURE" });
  chrome.storage.sync.remove("lastClientForm");
  window.close();
}

document.getElementById("link-reset")?.addEventListener("click", (e) => {
  e.preventDefault();
  resetSession();
});
document.getElementById("link-reset-config")?.addEventListener("click", (e) => {
  e.preventDefault();
  resetSession();
});

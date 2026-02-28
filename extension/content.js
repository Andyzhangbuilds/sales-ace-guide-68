// ============================================
// SALES AGENT OVERLAY — content.js
// ============================================

let overlayContainer = null;
let meetingStartTime = null;
let meetingDetected = false;

function detectPlatform() {
  const url = window.location.href;
  if (url.includes("meet.google.com")) return "google_meet";
  if (url.includes("teams.microsoft.com")) return "teams";
  if (url.includes("zoom.us")) return "zoom";
  return null;
}

function isMeetingActive() {
  const platform = detectPlatform();
  if (platform === "google_meet") {
    return (
      document.querySelector('[data-meeting-title]') !== null ||
      document.querySelector('[jsname="x8RiTd"]') !== null ||
      document.querySelector('.crqnQb') !== null
    );
  }
  if (platform === "teams") {
    return document.querySelector('[data-tid="calling-roster-section"]') !== null;
  }
  if (platform === "zoom") {
    return document.querySelector('#wc-container-right') !== null;
  }
  return false;
}

function createOverlay() {
  if (overlayContainer) return;

  overlayContainer = document.createElement("div");
  overlayContainer.id = "sales-agent-overlay-root";

  const shadow = overlayContainer.attachShadow({ mode: "open" });

  const wrapper = document.createElement("div");
  wrapper.id = "sales-overlay-wrapper";
  wrapper.innerHTML = getOverlayHTML();

  const styles = document.createElement("style");
  styles.textContent = getOverlayStyles();

  shadow.appendChild(styles);
  shadow.appendChild(wrapper);
  document.body.appendChild(overlayContainer);

  meetingStartTime = Date.now();

  // Wait for DOM to be ready inside shadow before attaching logic
  requestAnimationFrame(() => {
    initOverlayLogic(shadow);
  });
}

function getOverlayHTML() {
  return `
    <div id="sao-panel" class="panel">
      <div class="sao-header" id="sao-drag-handle">
        <div class="sao-logo">
          <span class="logo-dot"></span>
          <span class="logo-text">Sales Agent</span>
          <span class="sao-live-badge">LIVE</span>
        </div>
        <div class="sao-controls">
          <button id="sao-minimize" type="button">−</button>
          <button id="sao-close" type="button">✕</button>
        </div>
      </div>

      <div class="sao-score-section">
        <div class="score-label">Conversation Score</div>
        <div class="score-bar-track">
          <div class="score-bar-fill" id="sao-score-fill" style="width: 0%"></div>
        </div>
        <div class="score-value" id="sao-score-value">--</div>
      </div>

      <div class="sao-section">
        <div class="section-title"><span class="pulse-dot"></span> Live Insights</div>
        <div id="sao-insights-list" class="insights-list">
          <div class="insight-placeholder">Waiting for conversation...</div>
        </div>
      </div>

      <div class="sao-section">
        <div class="section-title">Talk / Listen Ratio</div>
        <div class="ratio-bar">
          <div class="ratio-talk" id="sao-ratio-talk" style="width:50%">50%</div>
          <div class="ratio-listen" id="sao-ratio-listen" style="width:50%">50%</div>
        </div>
        <div class="ratio-labels"><span>You</span><span>Prospect</span></div>
        <div id="sao-ratio-tip" class="ratio-tip"></div>
      </div>

      <div class="sao-section">
        <div class="section-title">Buying Signals</div>
        <div id="sao-signals-list" class="signals-list">
          <div class="signal-placeholder">None detected yet</div>
        </div>
      </div>

      <div class="sao-section">
        <div class="section-title">Objections Raised</div>
        <div id="sao-objections-list" class="objections-list">
          <div class="objection-placeholder">None detected yet</div>
        </div>
      </div>

      <div class="sao-section nba-section">
        <div class="section-title">⚡ Next Best Action</div>
        <div id="sao-nba" class="nba-text">Listening...</div>
      </div>

      <div class="sao-footer">
        <div class="meeting-timer" id="sao-timer">00:00</div>
        <button id="sao-end-meeting" class="end-btn" type="button">End & Sync to CRM</button>
      </div>
    </div>

    <div id="sao-pill" class="pill hidden">
      <span class="logo-dot small"></span>
      <span>Sales Agent</span>
      <span id="sao-pill-score">--</span>
    </div>
  `;
}

function getOverlayStyles() {
  return `
    :host { all: initial; }

    #sales-overlay-wrapper {
      position: fixed;
      top: 80px;
      right: 16px;
      z-index: 2147483647;
      font-family: 'Segoe UI', sans-serif;
    }

    .panel {
      width: 280px;
      background: #0d0f14;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      overflow: hidden;
      max-height: 90vh;
      overflow-y: auto;
      scrollbar-width: none;
    }
    .panel.hidden { display: none; }

    .sao-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      background: rgba(99,255,180,0.04);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      cursor: move;
      user-select: none;
    }
    .sao-logo { display: flex; align-items: center; gap: 7px; }
    .logo-dot {
      width: 8px; height: 8px; background: #63ffb4;
      border-radius: 50%; animation: glow-pulse 2s infinite;
      display: inline-block;
    }
    .logo-dot.small { width: 6px; height: 6px; }
    @keyframes glow-pulse {
      0%, 100% { box-shadow: 0 0 4px #63ffb4; }
      50% { box-shadow: 0 0 12px #63ffb4; }
    }
    .logo-text { color: #fff; font-size: 13px; font-weight: 600; }
    .sao-live-badge {
      background: #ff4757; color: #fff;
      font-size: 9px; font-weight: 700;
      padding: 2px 5px; border-radius: 4px;
    }
    .sao-controls { display: flex; gap: 4px; }
    .sao-controls button {
      background: rgba(255,255,255,0.06);
      border: none; color: rgba(255,255,255,0.5);
      width: 22px; height: 22px; border-radius: 6px;
      cursor: pointer; font-size: 14px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
    }
    .sao-controls button:hover { background: rgba(255,255,255,0.15); color: #fff; }

    .sao-score-section {
      padding: 12px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .score-label { color: rgba(255,255,255,0.4); font-size: 10px; text-transform: uppercase; margin-bottom: 6px; }
    .score-bar-track {
      height: 6px; background: rgba(255,255,255,0.08);
      border-radius: 99px; overflow: hidden; margin-bottom: 4px;
    }
    .score-bar-fill {
      height: 100%; background: linear-gradient(90deg, #63ffb4, #00d4ff);
      border-radius: 99px; transition: width 1s ease;
    }
    .score-value { color: #63ffb4; font-size: 22px; font-weight: 700; }

    .sao-section {
      padding: 10px 14px;
      border-bottom: 1px solid rgba(255,255,255,0.04);
    }
    .section-title {
      color: rgba(255,255,255,0.35); font-size: 10px;
      text-transform: uppercase; letter-spacing: 0.8px;
      margin-bottom: 7px; display: flex; align-items: center; gap: 5px;
    }
    .pulse-dot {
      width: 6px; height: 6px; background: #63ffb4;
      border-radius: 50%; animation: glow-pulse 1.5s infinite; display: inline-block;
    }

    .insights-list { display: flex; flex-direction: column; gap: 5px; }
    .insight-item {
      background: rgba(99,255,180,0.06); border: 1px solid rgba(99,255,180,0.12);
      border-radius: 8px; padding: 7px 10px;
      color: rgba(255,255,255,0.85); font-size: 12px; line-height: 1.4;
      animation: slide-in 0.3s ease;
    }
    @keyframes slide-in {
      from { opacity: 0; transform: translateY(-6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .insight-placeholder, .signal-placeholder, .objection-placeholder {
      color: rgba(255,255,255,0.2); font-size: 11px; font-style: italic;
    }

    .ratio-bar { display: flex; height: 8px; border-radius: 99px; overflow: hidden; margin-bottom: 4px; }
    .ratio-talk {
      background: #63ffb4; display: flex; align-items: center; justify-content: center;
      font-size: 8px; color: #000; font-weight: 700; transition: width 0.5s ease; min-width: 20px;
    }
    .ratio-listen {
      background: #00d4ff; display: flex; align-items: center; justify-content: center;
      font-size: 8px; color: #000; font-weight: 700; transition: width 0.5s ease; min-width: 20px;
    }
    .ratio-labels {
      display: flex; justify-content: space-between;
      color: rgba(255,255,255,0.3); font-size: 10px; margin-top: 3px;
    }
    .ratio-tip { margin-top: 5px; font-size: 11px; color: #ffd166; font-style: italic; }

    .signals-list { display: flex; flex-wrap: wrap; gap: 4px; }
    .signal-tag {
      background: rgba(99,255,180,0.1); border: 1px solid rgba(99,255,180,0.25);
      color: #63ffb4; font-size: 10px; padding: 3px 8px; border-radius: 99px;
    }

    .objections-list { display: flex; flex-direction: column; gap: 4px; }
    .objection-item {
      background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.2);
      color: rgba(255,255,255,0.8); font-size: 11px; padding: 5px 9px; border-radius: 7px;
    }

    .nba-section { background: rgba(255,209,102,0.04); }
    .nba-text { color: #ffd166; font-size: 12px; line-height: 1.5; font-weight: 500; }

    .sao-footer {
      padding: 12px 14px; display: flex;
      align-items: center; justify-content: space-between;
      background: rgba(0,0,0,0.2);
    }
    .meeting-timer { color: rgba(255,255,255,0.4); font-size: 13px; font-weight: 600; }
    .end-btn {
      background: linear-gradient(135deg, #63ffb4, #00d4ff);
      color: #000; border: none; padding: 7px 12px;
      border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer;
    }
    .end-btn:hover { opacity: 0.85; }
    .end-btn:disabled { opacity: 0.5; cursor: not-allowed; }

    .pill {
      display: flex; align-items: center; gap: 6px;
      background: #0d0f14; border: 1px solid rgba(99,255,180,0.2);
      padding: 7px 12px; border-radius: 99px; cursor: pointer;
      color: #fff; font-size: 12px; font-weight: 600;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .pill.hidden { display: none; }
  `;
}

function initOverlayLogic(shadow) {
  // ── Minimize ──────────────────────────────────────────────────────────────
  const minimizeBtn = shadow.getElementById("sao-minimize");
  const closeBtn    = shadow.getElementById("sao-close");
  const panel       = shadow.getElementById("sao-panel");
  const pill        = shadow.getElementById("sao-pill");
  const endBtn      = shadow.getElementById("sao-end-meeting");
  const wrapper     = shadow.getElementById("sales-overlay-wrapper");
  const dragHandle  = shadow.getElementById("sao-drag-handle");

  if (!minimizeBtn || !closeBtn || !panel || !pill || !endBtn) {
    console.error("[SalesAgent] Overlay elements not found — retrying...");
    setTimeout(() => initOverlayLogic(shadow), 100);
    return;
  }

  minimizeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.add("hidden");
    pill.classList.remove("hidden");
    console.log("[SalesAgent] Minimized");
  });

  pill.addEventListener("click", () => {
    panel.classList.remove("hidden");
    pill.classList.add("hidden");
    console.log("[SalesAgent] Restored");
  });

  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    overlayContainer.remove();
    overlayContainer = null;
    meetingDetected = false;
  });

  // ── End & Sync ────────────────────────────────────────────────────────────
  endBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const duration = meetingStartTime
      ? Math.floor((Date.now() - meetingStartTime) / 1000)
      : 0;

    endBtn.textContent = "Syncing...";
    endBtn.disabled = true;

    chrome.runtime.sendMessage({
      type: "END_MEETING_SYNC",
      payload: {
        platform: detectPlatform(),
        durationSeconds: duration,
        endedAt: new Date().toISOString()
      }
    }, (response) => {
      console.log("[SalesAgent] Sync response:", response);
    });

    setTimeout(() => {
      endBtn.textContent = "✅ Synced!";
      setTimeout(() => {
        endBtn.textContent = "End & Sync to CRM";
        endBtn.disabled = false;
      }, 3000);
    }, 2500);
  });

  // ── Timer ─────────────────────────────────────────────────────────────────
  const timerInterval = setInterval(() => {
    if (!meetingStartTime) return;
    const elapsed = Math.floor((Date.now() - meetingStartTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    const el = shadow.getElementById("sao-timer");
    if (el) el.textContent = `${mins}:${secs}`;
  }, 1000);

  // ── Drag ──────────────────────────────────────────────────────────────────
  let isDragging = false, startX, startY, initLeft, initTop;

  dragHandle.addEventListener("mousedown", (e) => {
    if (e.target.tagName === "BUTTON") return;
    isDragging = true;
    startX = e.clientX; startY = e.clientY;
    const rect = wrapper.getBoundingClientRect();
    initLeft = rect.left; initTop = rect.top;
    wrapper.style.transition = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    wrapper.style.left  = initLeft + (e.clientX - startX) + "px";
    wrapper.style.top   = initTop  + (e.clientY - startY) + "px";
    wrapper.style.right = "auto";
  });

  document.addEventListener("mouseup", () => { isDragging = false; });

  // ── Notify background ─────────────────────────────────────────────────────
  chrome.runtime.sendMessage({
    type: "OVERLAY_READY",
    platform: detectPlatform()
  });

  console.log("[SalesAgent] ✅ Overlay initialized");
}

function updateOverlayData(shadow, data) {
  if (!shadow) return;

  if (data.score !== undefined) {
    const fill  = shadow.getElementById("sao-score-fill");
    const val   = shadow.getElementById("sao-score-value");
    const pill  = shadow.getElementById("sao-pill-score");
    if (fill) fill.style.width = data.score + "%";
    if (val)  val.textContent  = data.score;
    if (pill) pill.textContent = data.score;
  }

  if (data.insights?.length > 0) {
    const list = shadow.getElementById("sao-insights-list");
    if (list) {
      list.innerHTML = "";
      data.insights.slice(0, 3).forEach(insight => {
        const el = document.createElement("div");
        el.className = "insight-item";
        el.textContent = insight;
        list.appendChild(el);
      });
    }
  }

  if (data.talkRatio !== undefined) {
    const talk   = shadow.getElementById("sao-ratio-talk");
    const listen = shadow.getElementById("sao-ratio-listen");
    const tip    = shadow.getElementById("sao-ratio-tip");
    if (talk)   { talk.style.width   = data.talkRatio + "%"; talk.textContent   = data.talkRatio + "%"; }
    if (listen) { listen.style.width = (100 - data.talkRatio) + "%"; listen.textContent = (100 - data.talkRatio) + "%"; }
    if (tip) {
      if (data.talkRatio > 65)      tip.textContent = "💡 Let the prospect speak more";
      else if (data.talkRatio < 35) tip.textContent = "💡 Engage more with questions";
      else                          tip.textContent = "✅ Good balance";
    }
  }

  if (data.buyingSignals?.length > 0) {
    const list = shadow.getElementById("sao-signals-list");
    if (list) {
      list.innerHTML = "";
      data.buyingSignals.forEach(signal => {
        const el = document.createElement("span");
        el.className = "signal-tag";
        el.textContent = signal;
        list.appendChild(el);
      });
    }
  }

  if (data.objections?.length > 0) {
    const list = shadow.getElementById("sao-objections-list");
    if (list) {
      list.innerHTML = "";
      data.objections.forEach(obj => {
        const el = document.createElement("div");
        el.className = "objection-item";
        el.textContent = obj;
        list.appendChild(el);
      });
    }
  }

  if (data.nextBestAction) {
    const nba = shadow.getElementById("sao-nba");
    if (nba) nba.textContent = data.nextBestAction;
  }
}

function watchForMeeting() {
  const observer = new MutationObserver(() => {
    if (isMeetingActive() && !meetingDetected) {
      meetingDetected = true;
      setTimeout(createOverlay, 1500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  if (isMeetingActive()) {
    meetingDetected = true;
    setTimeout(createOverlay, 1500);
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
watchForMeeting();

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_OVERLAY") {
    createOverlay();
  }
  if (message.type === "INSIGHT_UPDATE" && overlayContainer) {
    updateOverlayData(overlayContainer.shadowRoot, message.payload);
  }
  if (message.type === "CRM_SYNC_COMPLETE") {
    const shadow = overlayContainer?.shadowRoot;
    if (shadow) {
      const btn = shadow.getElementById("sao-end-meeting");
      if (btn) {
        btn.textContent = "✅ Synced to HubSpot!";
        setTimeout(() => {
          btn.textContent = "End & Sync to CRM";
          btn.disabled = false;
        }, 3000);
      }
    }
  }
});

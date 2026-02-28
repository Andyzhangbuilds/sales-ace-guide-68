// ============================================
// SALES AGENT — capture.js
// Runs in background capture page
// Keeps audio stream alive after popup closes
// ============================================

console.log("[SalesAgent Capture] Page loaded");

let captureStream = null;
let audioContext = null;
let socket = null;

async function init() {
  try {
    // Get params passed via URL
    const params = new URLSearchParams(window.location.search);
    const assemblyaiKey = params.get("key");
    const tabId = parseInt(params.get("tabId"));

    if (!assemblyaiKey || !tabId) {
      console.error("[SalesAgent Capture] Missing key or tabId");
      return;
    }

    console.log("[SalesAgent Capture] Starting capture for tab:", tabId);

    // Capture tab audio
    chrome.tabCapture.capture({ audio: true, video: false }, async (stream) => {
      if (!stream) {
        console.error("[SalesAgent Capture] Capture failed:", chrome.runtime.lastError?.message);
        return;
      }

      console.log("[SalesAgent Capture] 🎤 Audio stream captured!");
      captureStream = stream;

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
        console.error("[SalesAgent Capture] Token error:", tokenData);
        return;
      }

      console.log("[SalesAgent Capture] ✅ AssemblyAI token received");

      // Open WebSocket
      socket = new WebSocket(
        `wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&token=${tokenData.token}`
      );

      socket.onopen = () => {
        console.log("[SalesAgent Capture] ✅ Streaming audio to AssemblyAI...");

        audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {
          if (socket?.readyState !== WebSocket.OPEN) return;
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
          console.log("[SalesAgent Capture] 📝", data.text);

          // Forward transcript to background
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

      socket.onerror = (e) => console.error("[SalesAgent Capture] Socket error:", e);
      socket.onclose = () => console.log("[SalesAgent Capture] Socket closed");
    });

  } catch (err) {
    console.error("[SalesAgent Capture] Init error:", err);
  }
}

// Listen for stop signal
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STOP_CAPTURE") {
    socket?.close();
    captureStream?.getTracks().forEach(t => t.stop());
    audioContext?.close();
    window.close();
  }
});

init();

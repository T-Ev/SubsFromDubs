let roomId, ws, master;

async function loadModel() {
  // Show loading overlay
  const overlay = document.getElementById("loading-overlay");
  if (overlay) {
    overlay.style.display = "flex";
  }

  try {
    // Add your model loading logic here
    // For example:
    // await pipeline('translation', ...);

    // Simulate loading time for testing (remove this in production)
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error("Error loading model:", error);
  } finally {
    // Hide loading overlay
    if (overlay) {
      overlay.style.display = "none";
    }
  }
}

async function init() {
  roomId = new URLSearchParams(window.location.search).get("room");
  master = new URLSearchParams(window.location.search).get("master");

  ws = new WebSocket(`ws://${window.location.host}/?room=${roomId}`);

  const textArea = document.getElementById("text-area");

  if (master) {
    // Load model before enabling the textarea
    await loadModel();

    textArea.addEventListener("input", () => {
      ws.send(
        JSON.stringify({
          type: "text",
          data: textArea.value,
        })
      );
      console.log("sent", textArea.value);
    });
  }

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "text") {
        textArea.value = message.data;
      } else if (message.type === "translation") {
        textArea.value += "\nSpanish: " + message.data;
      }
    } catch (error) {
      console.log("Received raw message:", event.data);
      textArea.value = event.data;
    }
  };
}

// Change to async
window.addEventListener("load", () => init());

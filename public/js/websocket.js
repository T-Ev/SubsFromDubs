let roomId, ws, master, eventSource;

async function init() {
  roomId = new URLSearchParams(window.location.search).get("room");
  master = new URLSearchParams(window.location.search).get("master");

  eventSource = new EventSource(`https://${window.location.host}/events?room=${roomId}`);
  console.log("started");
  //   ws = new WebSocket(`wss://${window.location.host}/?room=${roomId}`);

  let old = localStorage.getItem("StD_" + roomId);
  if (old) {
    const oldData = JSON.parse(old);
    for (const [key, value] of Object.entries(oldData)) {
      $(".box-" + key)
        .html(value)
        .scrollTop($(".box-" + key)[0].scrollHeight);
    }
  }
  eventSource.onmessage = (event) => {
    console.log("gotone", event);
    try {
      const message = JSON.parse(event.data);
      console.log("gotone", event);
      if (message.type === "text") {
        addText($(".box-" + message.lang), message.data);
        let res = localStorage.getItem("StD_" + roomId) || "{}";
        res = JSON.parse(res);
        if (!res[message.lang]) res[message.lang] = "";
        res[message.lang] = res[message.lang] + " " + message.data;
        localStorage.setItem("StD_" + roomId, JSON.stringify(res));
        // $(".box-" + message.lang).html($(".box-" + message.lang).html() + message.data);
        // updateSpans();
      } else {
        console.log("unknown one", event.data);
      }
    } catch (error) {
      console.log("Received raw message:", event.data);
    }
  };

  eventSource.onclose = (event) => {
    console.log("WebSocket is closed. Attempting to reconnect...");
    setTimeout(() => {
      init(); // Reinitialize the WebSocket connection
    }, 1000); // Reconnect after 5 seconds
  };
  const shareButton = document.getElementById("share-button");
  const shareOverlay = document.getElementById("share-overlay");
  const closeShare = document.querySelector(".close-share");
  const shareLink = document.getElementById("share-link");
  const copyLink = document.getElementById("copy-link");
  const sanitizedURL = window.location.href.split("?")[0] + (roomId ? `?room=${roomId}` : "");
  // Set the current URL as the share link
  shareLink.value = sanitizedURL;
  const qrCode = new QRCode(document.getElementById("shareqrcode"), {
    text: sanitizedURL,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  shareButton.addEventListener("click", () => {
    shareOverlay.classList.add("active");
  });

  closeShare.addEventListener("click", () => {
    shareOverlay.classList.remove("active");
  });

  copyLink.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareLink.value);
      copyLink.textContent = "Copied!";
      setTimeout(() => {
        copyLink.textContent = "Copy";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  });
  $(".main-logo").on("click", function () {
    window.location = "/";
  });

  // Close overlay when clicking outside the share box
  shareOverlay.addEventListener("click", (e) => {
    if (e.target === shareOverlay) {
      shareOverlay.classList.remove("active");
    }
  });
}
function addText(obj, txt) {
  let words = txt.split(" ");
  words.forEach((word, index) => {
    // Create a span for each word
    let wordSpan = $("<span>")
      .addClass("word")
      .text(word + " ");

    // Set animation delay dynamically
    wordSpan.css("animation-delay", `${index * 0.2}s`);
    obj.append(wordSpan);
    obj.scrollTop(obj[0].scrollHeight);
  });
}
// Change to async
function checkMobile() {
  if (window.innerWidth <= 768) {
    // Assuming 768px as the breakpoint for mobile
    $("body").addClass("mobile");
  } else {
    $("body").removeClass("mobile");
  }
}

window.addEventListener("load", () => {
  init();
  checkMobile(); // Check on load
});

window.addEventListener("resize", checkMobile); // Check on resize

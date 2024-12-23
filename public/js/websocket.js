import { initMaster } from "./master.js"; // Ensure the import statement is included

let roomId, ws, master, testy;

async function init() {
  roomId = new URLSearchParams(window.location.search).get("room");
  master = new URLSearchParams(window.location.search).get("master");
  if (master) {
    localStorage.setItem("StD_master", roomId);
    const newUrl = window.location.href.split("&")[0];
    window.location = newUrl;
  }
  if (localStorage.getItem("StD_master") === roomId) master = 1;

  $(".room-number").text(roomId);
  let old = localStorage.getItem("StDr_" + roomId);
  if (old) {
    const oldData = JSON.parse(old);
    for (const [key, value] of Object.entries(oldData)) {
      $(".box-" + key)
        .html(value)
        .scrollTop($(".box-" + key)[0].scrollHeight);
    }
  }
  initWS();
  initMaster(master, ws);
  const sanitizedURL = window.location.href.split("?")[0] + (roomId ? `?room=${roomId}` : "");
  // Set the current URL as the share link
  $("#share-link").val(sanitizedURL);
  const qrCode = new QRCode(document.getElementById("shareqrcode"), {
    text: sanitizedURL,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H,
  });

  $("#share-button").on("click", () => {
    $("#share-overlay").addClass("active");
  });

  $(".close-share").on("click", () => {
    $("#share-overlay").removeClass("active");
  });

  $("#copy-link").on("click", async () => {
    try {
      await navigator.clipboard.writeText($("#share-link").val());
      $("#copy-link").text("Copied!");
      setTimeout(() => {
        $("#copy-link").text("Copy");
      }, 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  });
  $(".main-logo").on("click", function () {
    window.location = "/";
  });

  // Close overlay when clicking outside the share box
  $("#share-overlay").on("click", (e) => {
    if (e.target === $("#share-overlay")[0]) {
      $("#share-overlay").removeClass("active");
    }
  });
}
function initWS() {
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(location.hostname);
  ws = new WebSocket(`${isLocal ? "ws" : "wss"}://${window.location.host}/?room=${roomId}`);
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === "text") {
        addText($(".box-" + message.lang), message.data);
        let res = localStorage.getItem("StDr_" + roomId) || "{}";
        res = JSON.parse(res);
        if (!res[message.lang]) res[message.lang] = "";
        res[message.lang] = res[message.lang] + " " + message.data;
        localStorage.setItem("StDr_" + roomId, JSON.stringify(res));
        // $(".box-" + message.lang).html($(".box-" + message.lang).html() + message.data);
        // updateSpans();
      }
    } catch (error) {
      console.log("Received raw message:", event.data);
    }
  };

  ws.onclose = (event) => {
    console.log("WebSocket is closed. Attempting to reconnect...");
    setTimeout(() => {
      initWS(); // Reinitialize the WebSocket connection
    }, 1000); // Reconnect after 5 seconds
  };
}
function addText(obj, txt) {
  let words = txt.split(" ");
  words.forEach((word, index) => {
    // Create a span for each word
    let wordSpan = $("<span>")
      .addClass("word")
      .text(word + " ");

    // Set animation delay dynamically
    wordSpan.css("animation-delay", `${index * 0.5}s`);
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

$(window).on("load", () => {
  init();
  checkMobile(); // Check on load
});

$(window).on("resize", checkMobile); // Check on resize

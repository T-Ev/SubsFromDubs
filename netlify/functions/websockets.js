export default async function handler(request) {
  if (request.headers.get("upgrade") !== "websocket") {
    return new Response("Not a WebSocket request", { status: 400 });
  }

  const socket = new WebSocket(request);

  socket.addEventListener("open", () => {
    console.log("WebSocket connection established");
  });

  socket.addEventListener("message", (event) => {
    console.log("Received message:", event.data);

    // Process message and send response back to client

    socket.send("Message received!");
  });

  return new Response("", {
    status: 101,

    headers: {
      Upgrade: "websocket",

      Connection: "Upgrade",
    },
  });
}

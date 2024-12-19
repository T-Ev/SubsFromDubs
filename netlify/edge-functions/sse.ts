import type { Context } from "@netlify/edge-functions";

// declare let sse_clients: Array<{ id: number; c: any }>;
let sse_clients: { [key: string]: Array<{ id: number; c: any }> } = {}; // Declare and initialize sse_clients
export default async (req: Request, context: Context) => {
  let index = 0;

  const url = new URL(req.url);
  const room = url.searchParams.get("room") as string;

  const clientId = Date.now();
  console.log(JSON.stringify(context));
  const newClient = {
    id: clientId,
    c: context,
  };
  if (!sse_clients[room]) sse_clients[room] = [];
  sse_clients[room].push(newClient);
  console.log("EVENT", room);
  // Send an initial event
  //   res.write(`data: {"type":"initial", "data": "Connection established", id:${clientId}}\n\n`);

  // Handle client disconnect
  //   req.on("close", () => {
  //     sse_clients[room] = sse_clients[room].filter((client) => client.id !== clientId);
  //     res.end();
  //   });
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: {"type":"initial", "data": "Connection established", id:${clientId}: ${sse_clients[room].map((o) => o.id)}}\n\n`));
    },
  });
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
};

export const config = { path: "/events" };

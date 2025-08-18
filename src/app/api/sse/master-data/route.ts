// app/api/sse/master-data/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { initializeSSEConnections } from "@/lib/sse";

// Store active SSE connections
const sseConnections = new Map<string, ReadableStreamDefaultController>();

// Initialize the SSE helper with our connections
initializeSSEConnections(sseConnections);

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Get company and location from query params for filtering
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get("companyId");
    const locationId = searchParams.get("locationId");

    if (!companyId || !locationId) {
      return new NextResponse("Company ID and Location ID are required", {
        status: 400,
      });
    }

    // Create a unique connection ID
    const connectionId = `${session.user?.id}-${companyId}-${locationId}-${Date.now()}`;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store this connection
        sseConnections.set(connectionId, controller);

        // Send initial connection confirmation
        const initialData = {
          type: "connected",
          connectionId,
          companyId,
          locationId,
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(
          `data: ${JSON.stringify(initialData)}\n\n`
        );

        console.log(`SSE connection established: ${connectionId}`);

        // Send keep-alive ping every 30 seconds
        const keepAlive = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({
              type: "ping",
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch (error) {
            console.log(`Connection ${connectionId} closed during ping`);
            clearInterval(keepAlive);
            sseConnections.delete(connectionId);
          }
        }, 30000);

        // Clean up on connection close
        return () => {
          console.log(`Cleaning up SSE connection: ${connectionId}`);
          clearInterval(keepAlive);
          sseConnections.delete(connectionId);
        };
      },

      cancel() {
        console.log(`SSE connection cancelled: ${connectionId}`);
        sseConnections.delete(connectionId);
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  } catch (error: any) {
    console.error("SSE connection error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// Export function to get active connections count for monitoring
export function getConnectionCount() {
  return sseConnections.size;
}
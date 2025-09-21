// lib/sse.ts
type MasterDataType = "apis" | "departments" | "testTypes" | "detectorTypes" | "pharmacopeials" | "productMakes" | "products" | "chemicals" | "hplcs";

type SSEEventAction = "create" | "update" | "delete";

interface SSEBroadcastData {
  type: "masterDataUpdate";
  dataType: MasterDataType;
  action: SSEEventAction;
  record: any;
  companyId: string;
  locationId: string;
  timestamp?: string;
}

interface SSEEvent {
  type: string;
  dataType?: MasterDataType;
  action?: SSEEventAction;
  record?: any;
  companyId?: string;
  locationId?: string;
  timestamp: string;
}

// Store active SSE connections globally
let sseConnections: Map<string, ReadableStreamDefaultController> | null = null;

// Initialize connections map (called by SSE endpoint)
export function initializeSSEConnections(connections: Map<string, ReadableStreamDefaultController>) {
  sseConnections = connections;
}

// Get connections dynamically (fallback method)
function getSSEConnections(): Map<string, ReadableStreamDefaultController> {
  if (sseConnections) {
    return sseConnections;
  }

  // Try to import dynamically to get current connections
  try {
    // This is a fallback - the SSE endpoint should call initializeSSEConnections
    return new Map();
  } catch (error) {
    console.warn("Could not access SSE connections:", error);
    return new Map();
  }
}

/**
 * Broadcast an event to all connected SSE clients
 * @param eventData - The event data to broadcast
 */
export function broadcastSSE(eventData: SSEBroadcastData) {
  const connections = getSSEConnections();
  
  if (connections.size === 0) {
    console.log("No active SSE connections to broadcast to");
    return;
  }

  const event: SSEEvent = {
    ...eventData,
    timestamp: eventData.timestamp || new Date().toISOString(),
  };

  const eventString = `data: ${JSON.stringify(event)}\n\n`;

  // Broadcast to all connections that match company/location
  const deadConnections: string[] = [];

  connections.forEach((controller, connectionId) => {
    try {
      // Extract company/location from connection ID if needed
      // connectionId format: userId-companyId-locationId-timestamp
      const [, connCompanyId, connLocationId] = connectionId.split("-");
      
      // Only send to connections matching the company/location
      if (connCompanyId === eventData.companyId && connLocationId === eventData.locationId) {
        controller.enqueue(eventString);
      }
    } catch (error) {
      console.error(`Failed to send SSE event to connection ${connectionId}:`, error);
      deadConnections.push(connectionId);
    }
  });

  // Clean up dead connections
  deadConnections.forEach(connectionId => {
    connections.delete(connectionId);
  });

  console.log(`Broadcasted ${event.type} event to ${connections.size - deadConnections.length} connections`);
}

/**
 * Broadcast a master data create event
 */
export function broadcastMasterDataCreate(
  dataType: MasterDataType,
  record: any,
  companyId: string,
  locationId: string
) {
  broadcastSSE({
    type: "masterDataUpdate",
    dataType,
    action: "create",
    record,
    companyId,
    locationId,
  });
}

/**
 * Broadcast a master data update event
 */
export function broadcastMasterDataUpdate(
  dataType: MasterDataType,
  record: any,
  companyId: string,
  locationId: string
) {
  broadcastSSE({
    type: "masterDataUpdate",
    dataType,
    action: "update",
    record,
    companyId,
    locationId,
  });
}

/**
 * Broadcast a master data delete event
 */
export function broadcastMasterDataDelete(
  dataType: MasterDataType,
  record: any,
  companyId: string,
  locationId: string
) {
  broadcastSSE({
    type: "masterDataUpdate",
    dataType,
    action: "delete",
    record,
    companyId,
    locationId,
  });
}

/**
 * Broadcast a custom event
 */
export function broadcastCustomEvent(event: Partial<SSEEvent> & { type: string }) {
  const connections = getSSEConnections();
  
  if (connections.size === 0) {
    console.log("No active SSE connections to broadcast to");
    return;
  }

  const fullEvent: SSEEvent = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };

  const eventString = `data: ${JSON.stringify(fullEvent)}\n\n`;

  const deadConnections: string[] = [];

  connections.forEach((controller, connectionId) => {
    try {
      controller.enqueue(eventString);
    } catch (error) {
      console.error(`Failed to send SSE event to connection ${connectionId}:`, error);
      deadConnections.push(connectionId);
    }
  });

  // Clean up dead connections
  deadConnections.forEach(connectionId => {
    connections.delete(connectionId);
  });

  console.log(`Broadcasted ${fullEvent.type} event to ${connections.size - deadConnections.length} connections`);
}

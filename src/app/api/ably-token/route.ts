import { NextResponse } from 'next/server';
import * as Ably from 'ably';
import { getServerSession } from 'next-auth'; // Example: Using NextAuth.js
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

export async function GET() {
  try {
    // Get session (example for NextAuth.js; adjust for your auth provider)
    const session = await getServerSession(); // Replace with your auth provider's method
    const userId = session?.user?.id || uuidv4(); // Fallback to UUID if no session/user ID

    const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY });
    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: userId, // Use session user ID or generated UUID
      capability: { 'master-updates': ['subscribe'] }, // Restrict to subscribe only
    });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}
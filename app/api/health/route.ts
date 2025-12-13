import { NextResponse } from "next/server"

// Simple health check endpoint
// Use this to verify your API routes are working
// Test: curl http://localhost:3000/api/health

export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "API is running! Your serverless functions work.",
  })
}

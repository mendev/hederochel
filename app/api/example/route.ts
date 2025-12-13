import { type NextRequest, NextResponse } from "next/server"

// Example API route showing different HTTP methods
// This demonstrates the basic patterns for API routes

// GET /api/example
export async function GET(request: NextRequest) {
  // You can access query parameters
  const searchParams = request.nextUrl.searchParams
  const name = searchParams.get("name")

  return NextResponse.json({
    message: name ? `Hello, ${name}!` : "Hello, World!",
    method: "GET",
    tip: "Try adding ?name=YourName to the URL",
  })
}

// POST /api/example
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate required fields
    if (!body.message) {
      return NextResponse.json({ error: "Missing required field: message" }, { status: 400 })
    }

    // Process the data (this is where you'd save to database, etc.)
    return NextResponse.json(
      {
        success: true,
        received: body,
        processedAt: new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
}

// PUT /api/example
export async function PUT(request: NextRequest) {
  const body = await request.json()

  return NextResponse.json({
    message: "Resource updated",
    data: body,
  })
}

// DELETE /api/example
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "Missing id parameter" }, { status: 400 })
  }

  return NextResponse.json({
    message: `Resource ${id} deleted`,
  })
}

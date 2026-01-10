import { NextResponse } from 'next/server'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export async function GET() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/yield/opportunities`)
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch yield opportunities' },
      { status: 500 }
    )
  }
}


import { NextResponse } from 'next/server'

/**
 * Health check endpoint for the Australia app.
 * Returns a simple JSON response indicating the app is running.
 */
export async function GET() {
    return NextResponse.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'australia-app',
    })
}

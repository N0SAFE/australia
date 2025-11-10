import { NextResponse } from 'next/server'
import { capsules } from '@/lib/data/capsules'

export async function GET() {
    return NextResponse.json({
        data: capsules,
    })
}

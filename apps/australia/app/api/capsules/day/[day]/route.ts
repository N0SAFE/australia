import { NextResponse } from 'next/server'
import { getCapsulesByDay } from '@/lib/data/capsules'

export async function GET(
    request: Request,
    context: { params: Promise<{ day: string }> }
) {
    const { day } = await context.params
    const capsules = getCapsulesByDay(day)
    
    return NextResponse.json({
        data: capsules,
    })
}

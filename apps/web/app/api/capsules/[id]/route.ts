import { NextResponse } from 'next/server'
import { getCapsuleById } from '@/lib/data/capsules'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const capsule = getCapsuleById(id)
    
    return NextResponse.json({
        data: capsule,
    })
}

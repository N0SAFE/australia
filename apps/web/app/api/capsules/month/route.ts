import { NextResponse } from 'next/server'
import { getCapsulesForCurrentMonth } from '@/lib/data/capsules'

export async function GET() {
    const capsules = getCapsulesForCurrentMonth()
    
    return NextResponse.json({
        data: capsules,
    })
}

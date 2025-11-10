import { NextResponse } from 'next/server'
import { getUserById } from '@/lib/data/users'

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const { id } = await context.params
    const user = getUserById(id)
    
    return NextResponse.json({
        data: user,
    })
}

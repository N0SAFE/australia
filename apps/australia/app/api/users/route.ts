import { NextResponse } from 'next/server'
import { users } from '@/lib/data/users'

export async function GET() {
    return NextResponse.json({
        data: users,
    })
}

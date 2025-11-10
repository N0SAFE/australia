import { NextResponse } from 'next/server'
import { getUserByEmail } from '@/lib/data/users'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'secret' // In production, use env variable

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { username } = body
        
        if (!username) {
            return NextResponse.json(
                'Username is required',
                { status: 400 }
            )
        }
        
        const user = getUserByEmail(username)
        
        if (!user) {
            return NextResponse.json(
                'Invalid username',
                { status: 401 }
            )
        }
        
        const token = jwt.sign(
            {
                id: user.id,
                roles: user.roles,
                email: user.email,
            },
            JWT_SECRET
        )
        
        return NextResponse.json({
            token,
        })
    } catch (error) {
        return NextResponse.json(
            'Internal server error',
            { status: 500 }
        )
    }
}

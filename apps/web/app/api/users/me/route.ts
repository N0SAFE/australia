import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'secret' // In production, use env variable

export async function POST(request: Request) {
    try {
        const authorization = request.headers.get('authorization')
        
        if (!authorization) {
            return NextResponse.json(
                'Invalid token',
                { status: 401 }
            )
        }
        
        const token = authorization.split(' ')[1]
        
        if (!token) {
            return NextResponse.json(
                'Invalid token',
                { status: 401 }
            )
        }
        
        try {
            const decoded = jwt.verify(token, JWT_SECRET)
            
            if (!decoded) {
                return NextResponse.json(
                    'Invalid token',
                    { status: 401 }
                )
            }
            
            return NextResponse.json({
                data: decoded,
            })
        } catch {
            return NextResponse.json(
                'Invalid token',
                { status: 401 }
            )
        }
    } catch {
        return NextResponse.json(
            'Internal server error',
            { status: 500 }
        )
    }
}

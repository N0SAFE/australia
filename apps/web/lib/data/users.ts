import { randomUUID } from 'node:crypto'

export interface User {
    id: string
    firstname: string
    lastname: string
    email: string
    roles: string[]
}

export const users: User[] = [
    {
        id: randomUUID(),
        firstname: 'John',
        lastname: 'Doe',
        email: 'jd@yopmail.com',
        roles: ['user', 'admin', 'content'],
    },
]

export const getUserById = (id: string): User | null => {
    return users.find(u => u.id === id) || null
}

export const getUserByEmail = (email: string): User | null => {
    return users.find(u => u.email === email) || null
}

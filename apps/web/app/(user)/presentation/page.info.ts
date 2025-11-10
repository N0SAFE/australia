import { z } from 'zod'

export const Route = {
    name: 'Presentation',
    params: z.object({}),
    search: z.object({}),
}

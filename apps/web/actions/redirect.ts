'use client'

import { useRouter } from 'next/navigation'

export default function clientRedirect(url: string) {
    // In client components, we need to use window.location or router.push
    // redirect() from next/navigation only works in Server Components/Actions
    if (typeof window !== 'undefined') {
        window.location.href = url
    }
}

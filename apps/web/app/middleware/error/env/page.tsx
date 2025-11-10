export default function EnvironmentErrorPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-red-50">
            <div className="max-w-md rounded-lg bg-white p-8 shadow-lg">
                <h1 className="mb-4 text-2xl font-bold text-red-600">
                    Environment Configuration Error
                </h1>
                <p className="mb-4 text-gray-700">
                    The application is not properly configured. Required environment
                    variables are missing or invalid.
                </p>
                <div className="rounded bg-red-100 p-4">
                    <p className="text-sm text-red-800">
                        Please check your environment configuration and ensure all
                        required variables are set:
                    </p>
                    <ul className="mt-2 list-inside list-disc text-sm text-red-800">
                        <li>NEXT_PUBLIC_API_URL</li>
                        <li>NEXT_PUBLIC_APP_URL</li>
                        <li>BETTER_AUTH_SECRET</li>
                    </ul>
                </div>
                <p className="mt-4 text-sm text-gray-600">
                    Contact your system administrator if this problem persists.
                </p>
            </div>
        </div>
    )
}

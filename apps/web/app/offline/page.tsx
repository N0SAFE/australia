import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mx-auto max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <svg
            className="mx-auto h-24 w-24 text-muted-foreground"
            fill="none"
            height="24"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            width="24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
            <path d="M10 12.5 8.5 11l6-6 1.5 1.5-6 6Z" />
            <line x1="2" x2="22" y1="2" y2="22" />
          </svg>
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl">
            You're Offline
          </h1>
          <p className="text-muted-foreground">
            It looks like you've lost your internet connection. Some features
            may not be available.
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Don't worry! Once you're back online, everything will sync
            automatically.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

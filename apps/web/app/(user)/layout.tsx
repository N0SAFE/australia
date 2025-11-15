import { ReactNode } from 'react';

export default function UserLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <main className="min-h-dvh w-full relative overflow-x-hidden">
    <span className="bg-linear-180 from-pink-light to-pink-medium h-dvh w-full fixed inset-0 -z-1"></span>
    {children}
  </main>;
}
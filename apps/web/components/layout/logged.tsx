'use client';

import { ReactNode } from 'react';
import { useSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const LoggedLayout = ({
  children,
  roles
}: {
  children: ReactNode,
  roles?: string[]
}) => {
  const { data: session, isPending } = useSession();
  const user = session?.user;

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (!user) {
    redirect('/login');
  }

  if (roles && 'roles' in user && Array.isArray(user.roles) && !roles.some(role => user.roles.includes(role))) {
    redirect('/login');
  }

  return <>
    {children}
  </>;
}
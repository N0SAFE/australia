'use client';

import { useEffect } from 'react';

export function AdminPortalTheme() {
  useEffect(() => {
    // add dark theme class to html element
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-admin-theme', 'dark');
    document.documentElement.style.colorScheme = 'dark';
  }, []);

  return null;
}

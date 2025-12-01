'use client';

import { useEffect } from 'react';

/**
 * This component observes the DOM for Radix UI portals and adds the 'dark' class to them
 * so that dialogs, dropdowns, and other portaled components inherit the dark theme in admin.
 */
export function AdminPortalTheme() {
  useEffect(() => {
    // Function to add dark class to portal elements
    const addDarkClassToPortals = () => {
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach((portal) => {
        if (!portal.classList.contains('dark')) {
          portal.classList.add('dark');
          (portal as HTMLElement).style.colorScheme = 'dark';
        }
      });
    };

    // Initial check
    addDarkClassToPortals();

    // Observe for new portals being added
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes.length > 0) {
          addDarkClassToPortals();
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      // Clean up: remove dark class from portals when leaving admin
      const portals = document.querySelectorAll('[data-radix-portal]');
      portals.forEach((portal) => {
        portal.classList.remove('dark');
        (portal as HTMLElement).style.colorScheme = '';
      });
    };
  }, []);

  return null;
}

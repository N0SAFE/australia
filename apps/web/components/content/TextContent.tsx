'use client';

import { FC } from 'react';

export const TextContent: FC<{
  content: string;
}> = ({ content }) => {
  return (
    <div 
      className="prose prose-pink max-w-none p-4"
      dangerouslySetInnerHTML={{ __html: content }} 
    />
  );
};

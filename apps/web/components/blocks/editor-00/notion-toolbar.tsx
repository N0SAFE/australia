'use client';

import * as React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@repo/ui/components/shadcn/button';
import { Separator } from '@repo/ui/components/shadcn/separator';
import { cn } from '@/lib/utils';

interface NotionToolbarProps {
  editor: any;
  className?: string;
}

export function NotionToolbar({ editor, className }: NotionToolbarProps) {
  if (!editor) return null;

  const toggleMark = (format: string) => {
    editor.tf.toggle.mark({ key: format });
  };

  const isMarkActive = (format: string) => {
    return editor.tf.isActive({ key: format });
  };

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-md",
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleMark('bold')}
        data-active={isMarkActive('bold')}
        className="h-8 w-8 data-[active=true]:bg-muted"
      >
        <Bold className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleMark('italic')}
        data-active={isMarkActive('italic')}
        className="h-8 w-8 data-[active=true]:bg-muted"
      >
        <Italic className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleMark('underline')}
        data-active={isMarkActive('underline')}
        className="h-8 w-8 data-[active=true]:bg-muted"
      >
        <Underline className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleMark('strikethrough')}
        data-active={isMarkActive('strikethrough')}
        className="h-8 w-8 data-[active=true]:bg-muted"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      
      <Separator orientation="vertical" className="h-6" />
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => toggleMark('code')}
        data-active={isMarkActive('code')}
        className="h-8 w-8 data-[active=true]:bg-muted"
      >
        <Code className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          const url = window.prompt('Enter URL:');
          if (url) {
            editor.tf.toggle.mark({ key: 'a', value: { href: url } });
          }
        }}
        data-active={isMarkActive('a')}
        className="h-8 w-8 data-[active=true]:bg-muted"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}

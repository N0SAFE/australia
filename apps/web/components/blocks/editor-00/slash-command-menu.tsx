'use client';

import * as React from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Image,
  Video,
  Music,
  List,
  ListOrdered,
  Code,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlashCommand {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface SlashCommandMenuProps {
  editor: any;
  onImageUpload: () => void;
  onVideoUpload: () => void;
  onAudioUpload: () => void;
  position: { top: number; left: number } | null;
  onClose: () => void;
  searchQuery: string;
}

export function SlashCommandMenu({
  editor,
  onImageUpload,
  onVideoUpload,
  onAudioUpload,
  position,
  onClose,
  searchQuery,
}: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  const commands: SlashCommand[] = React.useMemo(() => {
    const insertBlock = (type: string) => {
      editor.tf.insert.block({ type });
      onClose();
    };

    return [
      {
        id: 'h1',
        title: 'Heading 1',
        description: 'Big section heading',
        icon: <Heading1 className="h-4 w-4" />,
        onSelect: () => insertBlock('h1'),
      },
      {
        id: 'h2',
        title: 'Heading 2',
        description: 'Medium section heading',
        icon: <Heading2 className="h-4 w-4" />,
        onSelect: () => insertBlock('h2'),
      },
      {
        id: 'h3',
        title: 'Heading 3',
        description: 'Small section heading',
        icon: <Heading3 className="h-4 w-4" />,
        onSelect: () => insertBlock('h3'),
      },
      {
        id: 'quote',
        title: 'Quote',
        description: 'Capture a quote',
        icon: <Quote className="h-4 w-4" />,
        onSelect: () => insertBlock('blockquote'),
      },
      {
        id: 'code',
        title: 'Code',
        description: 'Code block with syntax highlighting',
        icon: <Code className="h-4 w-4" />,
        onSelect: () => {
          editor.tf.toggle.mark({ key: 'code' });
          onClose();
        },
      },
      {
        id: 'image',
        title: 'Image',
        description: 'Upload an image',
        icon: <Image className="h-4 w-4" />,
        onSelect: () => {
          onImageUpload();
          onClose();
        },
      },
      {
        id: 'video',
        title: 'Video',
        description: 'Upload a video',
        icon: <Video className="h-4 w-4" />,
        onSelect: () => {
          onVideoUpload();
          onClose();
        },
      },
      {
        id: 'audio',
        title: 'Audio',
        description: 'Upload audio',
        icon: <Music className="h-4 w-4" />,
        onSelect: () => {
          onAudioUpload();
          onClose();
        },
      },
    ];
  }, [editor, onImageUpload, onVideoUpload, onAudioUpload, onClose]);

  const filteredCommands = commands.filter(
    (cmd) =>
      cmd.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cmd.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        filteredCommands[selectedIndex]?.onSelect();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex, onClose]);

  if (!position) return null;

  return (
    <div
      className="fixed z-50 w-80 rounded-lg border bg-popover shadow-lg"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      <div className="max-h-96 overflow-y-auto p-2">
        {filteredCommands.length === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No commands found
          </div>
        ) : (
          filteredCommands.map((command, index) => (
            <button
              key={command.id}
              onClick={command.onSelect}
              onMouseEnter={() => setSelectedIndex(index)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                index === selectedIndex
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                {command.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium">{command.title}</div>
                <div className="text-xs text-muted-foreground">
                  {command.description}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

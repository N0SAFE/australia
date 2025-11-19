'use client';

import * as React from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  Code,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Image,
  Video,
  Music,
  Link,
  PlusCircle,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@repo/ui/components/shadcn/dropdown-menu';
import { Separator } from '@repo/ui/components/shadcn/separator';

interface EditorMenuProps {
  editor: any;
  onImageUpload: () => void;
  onVideoUpload: () => void;
  onAudioUpload: () => void;
  isUploading: {
    image: boolean;
    video: boolean;
    audio: boolean;
  };
}

export function EditorMenu({ 
  editor, 
  onImageUpload, 
  onVideoUpload, 
  onAudioUpload,
  isUploading 
}: EditorMenuProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-1 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 p-2">
      {/* Format Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Heading2 className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Format</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuLabel>Text Format</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => editor.tf.h1.toggle()}>
            <Heading1 className="mr-2 h-4 w-4" />
            Heading 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.tf.h2.toggle()}>
            <Heading2 className="mr-2 h-4 w-4" />
            Heading 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.tf.h3.toggle()}>
            <Heading3 className="mr-2 h-4 w-4" />
            Heading 3
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.tf.blockquote.toggle()}>
            <Quote className="mr-2 h-4 w-4" />
            Quote
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => {
              (editor as any).insertNodes({
                type: 'p',
                children: [{ text: '' }],
              });
            }}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Paragraph
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Separator orientation="vertical" className="h-6" />

      {/* Text styling buttons */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.tf.bold.toggle()}
        title="Bold (⌘+B)"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.tf.italic.toggle()}
        title="Italic (⌘+I)"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.tf.underline.toggle()}
        title="Underline (⌘+U)"
      >
        <Underline className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.tf.strikethrough.toggle()}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={() => editor.tf.code.toggle()}
        title="Code (⌘+E)"
      >
        <Code className="h-4 w-4" />
      </Button>

      <Separator orientation="vertical" className="h-6" />

      {/* Media Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1">
            <Image className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only">Media</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel>Upload Media</DropdownMenuLabel>
          <DropdownMenuItem 
            onClick={onImageUpload}
            disabled={isUploading.image}
          >
            <Image className="mr-2 h-4 w-4" />
            {isUploading.image ? 'Uploading...' : 'Upload Image'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onVideoUpload}
            disabled={isUploading.video}
          >
            <Video className="mr-2 h-4 w-4" />
            {isUploading.video ? 'Uploading...' : 'Upload Video'}
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={onAudioUpload}
            disabled={isUploading.audio}
          >
            <Music className="mr-2 h-4 w-4" />
            {isUploading.audio ? 'Uploading...' : 'Upload Audio'}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Insert by URL</DropdownMenuLabel>
          
          <DropdownMenuItem
            onClick={() => {
              const url = window.prompt('Enter image URL:');
              if (url) {
                (editor as any).insertNodes({
                  type: 'img',
                  url,
                  children: [{ text: '' }],
                });
              }
            }}
          >
            <Link className="mr-2 h-4 w-4" />
            Image URL
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = window.prompt('Enter video URL:');
              if (url) {
                (editor as any).insertNodes({
                  type: 'video',
                  url,
                  children: [{ text: '' }],
                });
              }
            }}
          >
            <Link className="mr-2 h-4 w-4" />
            Video URL
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              const url = window.prompt('Enter audio URL:');
              if (url) {
                (editor as any).insertNodes({
                  type: 'audio',
                  url,
                  children: [{ text: '' }],
                });
              }
            }}
          >
            <Link className="mr-2 h-4 w-4" />
            Audio URL
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

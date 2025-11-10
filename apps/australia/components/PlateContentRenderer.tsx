'use client';

import * as React from 'react';
import type { Value } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';
import {
  BoldPlugin,
  ItalicPlugin,
  UnderlinePlugin,
  StrikethroughPlugin,
  CodePlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  H1Plugin,
  H2Plugin,
  H3Plugin,
  BlockquotePlugin,
} from '@platejs/basic-nodes/react';
import {
  AudioPlugin,
  ImagePlugin,
  VideoPlugin,
} from '@platejs/media/react';

import { Editor, EditorContainer } from '@repo/ui/components/shadcn/editor';
import { H1Element, H2Element, H3Element } from '@repo/ui/components/shadcn/heading-node';
import { BlockquoteElement } from '@repo/ui/components/shadcn/blockquote-node';
import { CodeLeaf } from '@repo/ui/components/shadcn/code-node';
import { ImageElement } from '@repo/ui/components/shadcn/media-image-node';
import { VideoElement } from '@repo/ui/components/shadcn/media-video-node';
import { AudioElement } from '@repo/ui/components/shadcn/media-audio-node';

interface PlateContentRendererProps {
  content: string;
  className?: string;
}

export function PlateContentRenderer({ content, className }: PlateContentRendererProps) {
  const parsedContent = React.useMemo(() => {
    try {
      return JSON.parse(content) as Value;
    } catch (error) {
      console.error('Failed to parse Plate.js content:', error);
      return [{ type: 'p', children: [{ text: 'Error loading content' }] }];
    }
  }, [content]);

  const editor = usePlateEditor({
    plugins: [
      // Text formatting plugins
      BoldPlugin,
      ItalicPlugin,
      UnderlinePlugin,
      StrikethroughPlugin,
      CodePlugin.withComponent(CodeLeaf),
      SubscriptPlugin,
      SuperscriptPlugin,
      
      // Block element plugins
      H1Plugin.withComponent(H1Element),
      H2Plugin.withComponent(H2Element),
      H3Plugin.withComponent(H3Element),
      BlockquotePlugin.withComponent(BlockquoteElement),
      
      // Media plugins
      ImagePlugin.withComponent(ImageElement),
      VideoPlugin.withComponent(VideoElement),
      AudioPlugin.withComponent(AudioElement),
    ],
    value: parsedContent,
  });

  return (
    <div className={className}>
      <Plate editor={editor}>
        <EditorContainer>
          <Editor 
            readOnly
            className="p-4"
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}

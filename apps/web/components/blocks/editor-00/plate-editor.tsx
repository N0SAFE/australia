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
import { useStorage } from '@/hooks/useStorage';
import { toast } from 'sonner';

import { Editor, EditorContainer } from '@repo/ui/components/shadcn/editor';
import { FixedToolbar } from '@repo/ui/components/shadcn/fixed-toolbar';
import { MarkToolbarButton } from '@repo/ui/components/shadcn/mark-toolbar-button';
import { ToolbarButton, ToolbarSeparator } from '@repo/ui/components/shadcn/toolbar';
import { H1Element, H2Element, H3Element } from '@repo/ui/components/shadcn/heading-node';
import { BlockquoteElement } from '@repo/ui/components/shadcn/blockquote-node';
import { CodeLeaf } from '@repo/ui/components/shadcn/code-node';
import { HighlightLeaf } from '@repo/ui/components/shadcn/highlight-node';
import { KbdLeaf } from '@repo/ui/components/shadcn/kbd-node';
import { ImageElement } from '@repo/ui/components/shadcn/media-image-node';
import { VideoElement } from '@repo/ui/components/shadcn/media-video-node';
import { AudioElement } from '@repo/ui/components/shadcn/media-audio-node';

const defaultValue: Value = [
  {
    type: 'p',
    children: [{ text: '' }],
  },
];

interface PlateEditorProps {
  value?: Value;
  onChange?: (value: Value) => void;
  placeholder?: string;
  readOnly?: boolean;
}

export function PlateEditor({ value, onChange, placeholder = 'Type your content here...', readOnly }: PlateEditorProps) {
  console.log('🎨 [PlateEditor] Component rendering, value:', JSON.stringify(value, null, 2));
  
  // Determine if editor should be read-only (explicit readOnly prop or no onChange handler)
  const isReadOnly = readOnly ?? !onChange;
  
  const storage = useStorage();
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);

  console.log('🏗️ [PlateEditor] Creating editor with initial value:', JSON.stringify(value || defaultValue, null, 2));
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
    value: value || defaultValue,
    override: {
      // Ensure void nodes are properly configured
      components: {},
    },
  });

  // Update editor value when prop changes
  React.useEffect(() => {
    console.log('🔄 [PlateEditor] useEffect triggered');
    console.log('📥 [PlateEditor] value prop:', JSON.stringify(value, null, 2));
    console.log('📤 [PlateEditor] editor.children:', JSON.stringify(editor?.children, null, 2));
    
    if (value && editor && JSON.stringify(editor.children) !== JSON.stringify(value)) {
      console.log('🔀 [PlateEditor] Values differ, updating...');
      
      // Recursively ensure all nodes have proper structure
      const normalizeNode = (node: any, depth = 0): any => {
        const indent = '  '.repeat(depth);
        console.log(`${indent}🔧 [PlateEditor] Normalizing at depth ${depth}:`, JSON.stringify(node));
        
        // Text nodes don't need children
        if (node.text !== undefined) {
          console.log(`${indent}📝 [PlateEditor] Text node, returning as-is`);
          return node;
        }
        
        // Void elements (like images) need children array with at least one child
        // This is required by Slate/Plate editor internals - cannot be empty array!
        let children: any[];
        if (Array.isArray(node.children) && node.children.length > 0) {
          children = node.children.map((child: any) => normalizeNode(child, depth + 1));
        } else {
          // Empty or missing children - add default text node
          children = [{ text: '' }];
        }
        
        console.log(`${indent}📦 [PlateEditor] Children:`, JSON.stringify(children));
        const result = { ...node, children };
        console.log(`${indent}✅ [PlateEditor] Result:`, JSON.stringify(result));
        return result;
      };
      
      console.log('🔄 [PlateEditor] Starting normalization...');
      const normalizedValue = value.map((node: any) => normalizeNode(node, 0));
      console.log('✅ [PlateEditor] Normalized value:', JSON.stringify(normalizedValue, null, 2));
      
      editor.children = normalizedValue;
      console.log('💾 [PlateEditor] Editor children set');
      
      (editor as any).onChange();
      console.log('🔔 [PlateEditor] onChange called');
    } else {
      console.log('✅ [PlateEditor] No update needed');
    }
  }, [value, editor]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await storage.uploadImageAsync({ file });
      const imageUrl = `/storage/files/${result.filename}`;
      
      // Insert image node using Slate's insertNodes API
      (editor as any).insertNodes({
        type: 'img',
        url: imageUrl,
        children: [{ text: '' }],
      });
      
      toast.success('Image uploaded and inserted');
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await storage.uploadVideoAsync({ file });
      const videoUrl = `/storage/files/${result.filename}`;
      
      // Insert video node using Slate's insertNodes API
      (editor as any).insertNodes({
        type: 'video',
        url: videoUrl,
        isUpload: true,  // Required for VideoElement to render ReactPlayer
        children: [{ text: '' }],
      });
      
      toast.success('Video uploaded and inserted');
    } catch (error) {
      console.error('Video upload failed:', error);
      toast.error(`Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await storage.uploadAudioAsync({ file });
      const audioUrl = `/storage/files/${result.filename}`;
      
      // Insert audio node using Slate's insertNodes API
      (editor as any).insertNodes({
        type: 'audio',
        url: audioUrl,
        isUpload: true,  // Mark as uploaded media for consistency
        children: [{ text: '' }],
      });
      
      toast.success('Audio uploaded and inserted');
    } catch (error) {
      console.error('Audio upload failed:', error);
      toast.error(`Audio upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="bg-background overflow-hidden rounded-lg border shadow">
      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoUpload}
      />
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleAudioUpload}
      />
      
      <Plate
        editor={editor}
        onChange={({ value }) => {
          onChange?.(value);
        }}
        readOnly={isReadOnly}
      >
        {!isReadOnly && (
          <FixedToolbar className="flex justify-start gap-1 rounded-t-lg border-b p-2">
          {/* Heading buttons */}
          <ToolbarButton onClick={() => editor.tf.h1.toggle()}>H1</ToolbarButton>
          <ToolbarButton onClick={() => editor.tf.h2.toggle()}>H2</ToolbarButton>
          <ToolbarButton onClick={() => editor.tf.h3.toggle()}>H3</ToolbarButton>
          <ToolbarButton onClick={() => editor.tf.blockquote.toggle()}>Quote</ToolbarButton>
          
          <ToolbarSeparator />
          
          {/* Paragraph insertion buttons */}
          <ToolbarButton 
            onClick={() => {
              // Insert paragraph node
              const paragraph = {
                type: 'p',
                children: [{ text: '' }],
              };
              
              // Use Slate's insertNodes to add a paragraph at current selection
              (editor as any).insertNodes(paragraph);
            }}
            tooltip="Insert paragraph (useful for adding text before/after media)"
          >
            ➕ P
          </ToolbarButton>
          
          <ToolbarSeparator />
          
          {/* Text formatting buttons */}
          <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
            <strong>B</strong>
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
            <em>I</em>
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
            <u>U</u>
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="strikethrough" tooltip="Strikethrough">
            <s>S</s>
          </MarkToolbarButton>
          <MarkToolbarButton nodeType="code" tooltip="Code (⌘+E)">
            {'</>'}
          </MarkToolbarButton>
          
          <ToolbarSeparator />
          
          {/* Media buttons - Upload */}
          <ToolbarButton 
            onClick={() => imageInputRef.current?.click()}
            tooltip="Upload Image"
            disabled={storage.isUploading.image}
          >
            {storage.isUploading.image ? '⏳' : '🖼️'}
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => videoInputRef.current?.click()}
            tooltip="Upload Video"
            disabled={storage.isUploading.video}
          >
            {storage.isUploading.video ? '⏳' : '🎥'}
          </ToolbarButton>
          <ToolbarButton 
            onClick={() => audioInputRef.current?.click()}
            tooltip="Upload Audio"
            disabled={storage.isUploading.audio}
          >
            {storage.isUploading.audio ? '⏳' : '🎵'}
          </ToolbarButton>
          
          <ToolbarSeparator />
          
          {/* Media buttons - Insert by URL */}
          <ToolbarButton 
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
            tooltip="Insert Image URL"
          >
            🔗🖼️
          </ToolbarButton>
          <ToolbarButton 
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
            tooltip="Insert Video URL"
          >
            🔗🎥
          </ToolbarButton>
          <ToolbarButton 
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
            tooltip="Insert Audio URL"
          >
            🔗🎵
          </ToolbarButton>
        </FixedToolbar>
        )}
        
        <EditorContainer>
          <Editor 
            placeholder={isReadOnly ? '' : placeholder}
            className={isReadOnly ? 'p-4' : 'min-h-[300px] p-4'}
            readOnly={isReadOnly}
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}

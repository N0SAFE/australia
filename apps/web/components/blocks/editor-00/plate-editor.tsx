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
import { useUploadVideoWithProgress } from '@/hooks/useStorage';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { orpc } from '@/lib/orpc';

import { Editor, EditorContainer } from '@repo/ui/components/shadcn/editor';
import { H1Element, H2Element, H3Element } from '@repo/ui/components/shadcn/heading-node';
import { BlockquoteElement } from '@repo/ui/components/shadcn/blockquote-node';
import { CodeLeaf } from '@repo/ui/components/shadcn/code-node';
import { ImageElement } from '@repo/ui/components/shadcn/media-image-node';
import { VideoElement } from '@repo/ui/components/shadcn/media-video-node';
import { AudioElement } from '@repo/ui/components/shadcn/media-audio-node';
import { getStorageUrl } from '@/lib/api-url';
import { MediaUploadOverlay } from './media-upload-overlay';
import { NotionToolbar } from './notion-toolbar';
import { SlashCommandMenu } from './slash-command-menu';

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

interface UploadState {
  type: 'image' | 'video' | 'audio' | null;
  progress: number;
  processingProgress?: number;
  isProcessing?: boolean;
  filename?: string;
}

export function PlateEditor({ value, onChange, placeholder = 'Type your content here...', readOnly }: PlateEditorProps) {
  console.log('🎨 [PlateEditor] Component rendering, value:', JSON.stringify(value, null, 2));
  
  // Determine if editor should be read-only (explicit readOnly prop or no onChange handler)
  const isReadOnly = readOnly ?? !onChange;
  
  // Upload state management
  const [uploadState, setUploadState] = React.useState<UploadState>({
    type: null,
    progress: 0,
  });
  
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  
  // Image upload mutation
  const imageUpload = useMutation(orpc.storage.uploadImage.mutationOptions({
    onSuccess: () => {
      setUploadState({ type: null, progress: 0 });
    },
    onError: () => {
      setUploadState({ type: null, progress: 0 });
    },
  }));
  
  // Video upload with progress tracking
  const videoUpload = useUploadVideoWithProgress({
    onUploadSuccess: (result) => {
      setUploadState(prev => ({ 
        ...prev, 
        progress: 100,
        isProcessing: true,
        processingProgress: 0,
        filename: result.filename
      }));
    },
    onProcessingComplete: () => {
      setUploadState({ type: null, progress: 0 });
    },
    onProcessingError: () => {
      setUploadState({ type: null, progress: 0 });
    },
  });
  
  // Audio upload mutation
  const audioUpload = useMutation(orpc.storage.uploadAudio.mutationOptions({
    onSuccess: () => {
      setUploadState({ type: null, progress: 0 });
    },
    onError: () => {
      setUploadState({ type: null, progress: 0 });
    },
  }));
  
  // Update processing progress
  React.useEffect(() => {
    if (videoUpload.progress?.progress !== undefined) {
      setUploadState(prev => ({
        ...prev,
        processingProgress: videoUpload.progress!.progress,
      }));
    }
  }, [videoUpload.progress]);

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

    setUploadState({ type: 'image', progress: 0 });

    try {
      // Simulate progress for image upload
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 100);

      const result = await imageUpload.mutateAsync({ file });
      clearInterval(progressInterval);
      
      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      const imageUrl = getStorageUrl(`files/${result.filename}`);
      
      // Insert image node
      (editor as any).insertNodes({
        type: 'img',
        url: imageUrl,
        children: [{ text: '' }],
      });
      
      toast.success('Image uploaded and inserted');
      
      // Clear progress after delay
      setTimeout(() => {
        setUploadState({ type: null, progress: 0 });
      }, 500);
    } catch (error) {
      console.error('Image upload failed:', error);
      toast.error(`Image upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadState({ type: null, progress: 0 });
    } finally {
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState({ type: 'video', progress: 0 });

    try {
      // Simulate progress for video upload
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 5, 90)
        }));
      }, 200);

      const result = await videoUpload.uploadAsync({ file });
      clearInterval(progressInterval);
      
      const videoUrl = getStorageUrl(`files/${result.filename}`);
      
      // Insert video node
      (editor as any).insertNodes({
        type: 'video',
        url: videoUrl,
        isUpload: true,
        children: [{ text: '' }],
      });
      
      toast.success('Video uploaded and inserted');
    } catch (error) {
      console.error('Video upload failed:', error);
      toast.error(`Video upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadState({ type: null, progress: 0 });
    } finally {
      if (videoInputRef.current) {
        videoInputRef.current.value = '';
      }
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadState({ type: 'audio', progress: 0 });

    try {
      // Simulate progress for audio upload
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 100);

      const result = await audioUpload.mutateAsync({ file });
      clearInterval(progressInterval);
      
      setUploadState(prev => ({ ...prev, progress: 100 }));
      
      const audioUrl = getStorageUrl(`files/${result.filename}`);
      
      // Insert audio node
      (editor as any).insertNodes({
        type: 'audio',
        url: audioUrl,
        isUpload: true,
        children: [{ text: '' }],
      });
      
      toast.success('Audio uploaded and inserted');
      
      // Clear progress after delay
      setTimeout(() => {
        setUploadState({ type: null, progress: 0 });
      }, 500);
    } catch (error) {
      console.error('Audio upload failed:', error);
      toast.error(`Audio upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setUploadState({ type: null, progress: 0 });
    } finally {
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  // Slash command state
  const [slashMenuPosition, setSlashMenuPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [slashSearchQuery, setSlashSearchQuery] = React.useState('');
  const [showFloatingToolbar, setShowFloatingToolbar] = React.useState(false);
  const [toolbarPosition, setToolbarPosition] = React.useState<{ top: number; left: number } | null>(null);

  // Handle slash command
  React.useEffect(() => {
    if (!editor || isReadOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const textBeforeCursor = range.startContainer.textContent?.slice(0, range.startOffset) || '';
      
      if (e.key === '/') {
        // Show slash menu
        const rect = range.getBoundingClientRect();
        setSlashMenuPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
        setSlashSearchQuery('');
      } else if (slashMenuPosition) {
        // Update search query
        if (e.key === 'Backspace') {
          if (slashSearchQuery.length === 0) {
            setSlashMenuPosition(null);
          } else {
            setSlashSearchQuery(prev => prev.slice(0, -1));
          }
        } else if (e.key.length === 1) {
          setSlashSearchQuery(prev => prev + e.key);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor, isReadOnly, slashMenuPosition, slashSearchQuery]);

  // Show floating toolbar on text selection
  React.useEffect(() => {
    if (isReadOnly) return;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowFloatingToolbar(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setToolbarPosition({
        top: rect.top + window.scrollY - 45,
        left: rect.left + window.scrollX + rect.width / 2 - 150,
      });
      setShowFloatingToolbar(true);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [isReadOnly]);

  return (
    <div className="relative">
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
      
      {/* Upload progress overlay */}
      {uploadState.type && (
        <MediaUploadOverlay
          type={uploadState.type}
          progress={uploadState.progress}
          processingProgress={uploadState.processingProgress}
          isProcessing={uploadState.isProcessing}
          filename={uploadState.filename}
        />
      )}

      {/* Floating toolbar for text selection */}
      {!isReadOnly && showFloatingToolbar && toolbarPosition && (
        <div
          className="fixed z-50"
          style={{
            top: toolbarPosition.top,
            left: toolbarPosition.left,
          }}
        >
          <NotionToolbar editor={editor} />
        </div>
      )}

      {/* Slash command menu */}
      {!isReadOnly && slashMenuPosition && (
        <SlashCommandMenu
          editor={editor}
          onImageUpload={() => imageInputRef.current?.click()}
          onVideoUpload={() => videoInputRef.current?.click()}
          onAudioUpload={() => audioInputRef.current?.click()}
          position={slashMenuPosition}
          onClose={() => setSlashMenuPosition(null)}
          searchQuery={slashSearchQuery}
        />
      )}
      
      <Plate
        editor={editor}
        onChange={({ value }) => {
          onChange?.(value);
        }}
        readOnly={isReadOnly}
      >
        <EditorContainer className="min-h-[400px] p-8">
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

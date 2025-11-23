'use client';

import * as React from 'react';
import type { Value } from 'platejs';
import Image from 'next/image';
import { Download, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { useResolveMediaUrl } from '@/contexts/AttachedMediaContext';

interface PlateContentRendererProps {
  content: string; // JSON string containing Plate.js Value
}

interface PlateNode {
  type: string;
  children?: PlateNode[];
  text?: string;
  url?: string;
  href?: string;
  alt?: string;
  width?: number;
  height?: number;
  size?: number;
  duration?: number;
  mimeType?: string;
  thumbnail?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
  attrs?: {
    strategy?: 'local' | 'api' | 'contentMediaId' | 'external';
    contentMediaId?: string;
    src?: string;
    [key: string]: unknown;
  };
}

/**
 * Readonly Plate.js content renderer for displaying capsule content
 * Uses custom React rendering instead of full Plate.js editor
 */
export function PlateContentRenderer({ content }: PlateContentRendererProps) {
    console.log(content)
  // Parse the content JSON string
  const value: PlateNode[] = React.useMemo(() => {
    try {
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to parse capsule content:', error);
      return [
        {
          type: 'p',
          children: [{ text: 'Erreur: Contenu invalide' }],
        },
      ];
    }
  }, [content]);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="space-y-6 prose prose-lg prose-pink max-w-none prose-headings:text-pink-dark prose-p:text-gray-700 prose-p:leading-relaxed">
        {value.map((node, index) => (
          <NodeRenderer key={index} node={node} />
        ))}
      </div>
    </div>
  );
}

/**
 * Renders a single Plate.js node
 */
function NodeRenderer({ node }: { node: PlateNode }) {
  // Handle text leaf nodes with formatting
  if (node.text !== undefined) {
    let content: React.ReactNode = node.text;
    
    if (node.bold) content = <strong>{content}</strong>;
    if (node.italic) content = <em>{content}</em>;
    if (node.underline) content = <u>{content}</u>;
    if (node.strikethrough) content = <s>{content}</s>;
    if (node.code) content = <code>{content}</code>;
    
    return <>{content}</>;
  }

  // Handle element nodes
  const children = node.children?.map((child, index) => (
    <NodeRenderer key={index} node={child} />
  ));

  switch (node.type) {
    case 'p':
      return <p className="text-base leading-relaxed mb-4">{children}</p>;
    
    case 'h1':
      return <h1 className="text-4xl font-bold text-pink-dark mb-6 mt-8">{children}</h1>;
    
    case 'h2':
      return <h2 className="text-3xl font-semibold text-pink-dark mb-4 mt-6">{children}</h2>;
    
    case 'h3':
      return <h3 className="text-2xl font-medium text-pink-dark mb-3 mt-4">{children}</h3>;
    
    case 'blockquote':
      return <blockquote className="border-l-4 border-pink-light bg-pink-50 pl-6 py-4 my-6 italic text-gray-700">{children}</blockquote>;
    
    case 'a':
      return <a href={node.href} className="text-pink-dark hover:text-pink-light underline font-medium transition-colors" target="_blank" rel="noopener noreferrer">{children}</a>;
    
    case 'img':
      return <ImageNode node={node} />;
    
    case 'video':
      return <VideoNode node={node} />;
    
    case 'audio':
      return <AudioNode node={node} />;
    
    default:
      return <div>{children}</div>;
  }
}

/**
 * Image node renderer with zoom, download, and fullscreen
 */
function ImageNode({ node }: { node: PlateNode }) {
  const [zoom, setZoom] = React.useState(1);
  const [fullscreen, setFullscreen] = React.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();

  // Resolve URL based on strategy
  const imageUrl = React.useMemo(() => {
    // Check if node uses contentMediaId strategy
    if (node.attrs?.strategy === 'contentMediaId' && node.attrs?.contentMediaId) {
      const resolved = resolveMediaUrl(node.attrs.contentMediaId);
      if (resolved) {
        console.log('✅ Resolved contentMediaId to URL:', { 
          contentMediaId: node.attrs.contentMediaId, 
          url: resolved 
        });
        return resolved;
      }
      console.warn('⚠️ Failed to resolve contentMediaId:', node.attrs.contentMediaId);
    }
    
    // Fallback to node.url (for api/external strategies)
    return node.url || null;
  }, [node.attrs, node.url, resolveMediaUrl]);

  const handleDownload = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };

  if (!imageUrl) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg my-8">
        <p className="text-gray-500">Image non disponible</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4 my-8 not-prose">
        <div 
          className="relative overflow-hidden rounded-2xl shadow-xl bg-white p-2 border border-pink-100 cursor-pointer hover:shadow-2xl transition-shadow"
          onClick={() => setFullscreen(true)}
        >
          <div 
            style={{ transform: `scale(${zoom})`, transition: 'transform 0.3s ease-in-out' }}
            className="origin-center"
          >
            {node.width && node.height ? (
              <Image
                src={imageUrl}
                alt={node.alt || 'Capsule image'}
                width={node.width}
                height={node.height}
                className="max-w-full h-auto rounded-xl"
              />
            ) : (
              <img
                src={imageUrl}
                alt={node.alt || 'Capsule image'}
                className="max-w-full h-auto rounded-xl"
              />
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center bg-white rounded-full shadow-md px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
            disabled={zoom <= 0.5}
            className="rounded-full hover:bg-pink-50 hover:text-pink-dark transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <div className="text-sm font-medium text-gray-600 min-w-[60px] text-center">
            {Math.round(zoom * 100)}%
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
            disabled={zoom >= 3}
            className="rounded-full hover:bg-pink-50 hover:text-pink-dark transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(true)}
            className="rounded-full hover:bg-pink-50 hover:text-pink-dark transition-colors"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Plein écran
          </Button>
          
          <div className="w-px h-6 bg-gray-200 mx-2" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="rounded-full hover:bg-pink-50 hover:text-pink-dark transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger
          </Button>
        </div>

        {(node.width || node.height || node.size) && (
          <div className="text-sm text-gray-500 flex gap-3 bg-gray-50 px-4 py-2 rounded-full">
            {node.width && node.height && (
              <span className="font-medium">{node.width} × {node.height}px</span>
            )}
            {node.size && (
              <span>• {(node.size / 1024).toFixed(2)} KB</span>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none! p-0 bg-black border-none m-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Image fullscreen viewer</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
          <img
            src={imageUrl}
            alt={node.alt || 'Capsule image'}
            className="w-full h-full object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Video node renderer with video player and fullscreen
 */
function VideoNode({ node }: { node: PlateNode }) {
  const [fullscreen, setFullscreen] = React.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();

  // Resolve URL based on strategy
  const videoUrl = React.useMemo(() => {
    // Check if node uses contentMediaId strategy
    if (node.attrs?.strategy === 'contentMediaId' && node.attrs?.contentMediaId) {
      const resolved = resolveMediaUrl(node.attrs.contentMediaId);
      if (resolved) {
        console.log('✅ Resolved video contentMediaId to URL:', { 
          contentMediaId: node.attrs.contentMediaId, 
          url: resolved 
        });
        return resolved;
      }
      console.warn('⚠️ Failed to resolve video contentMediaId:', node.attrs.contentMediaId);
    }
    
    // Fallback to node.url (for api/external strategies)
    return node.url || null;
  }, [node.attrs, node.url, resolveMediaUrl]);

  if (!videoUrl) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg my-8">
        <p className="text-gray-500">Vidéo non disponible</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4 my-8 not-prose">
        <div 
          className="w-full max-w-3xl rounded-2xl overflow-hidden shadow-xl bg-black cursor-pointer hover:shadow-2xl transition-shadow"
          onClick={() => setFullscreen(true)}
        >
          <video
            controls
            className="w-full"
            poster={node.thumbnail}
          >
            <source src={videoUrl} type={node.mimeType || 'video/mp4'} />
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </div>

        <div className="flex gap-2 items-center bg-white rounded-full shadow-md px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(true)}
            className="rounded-full hover:bg-pink-50 hover:text-pink-dark transition-colors"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Plein écran
          </Button>
        </div>

        {(node.duration || node.size) && (
          <div className="text-sm text-gray-500 flex gap-3 bg-gray-50 px-4 py-2 rounded-full">
            {node.duration && (
              <span className="font-medium">
                ⏱ {Math.floor(node.duration / 60)}:{(node.duration % 60).toString().padStart(2, '0')}
              </span>
            )}
            {node.size && (
              <span>• {(node.size / 1024 / 1024).toFixed(2)} MB</span>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none! p-0 bg-black border-none m-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Video fullscreen player</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-6 h-6" />
          </Button>
          <video
            controls
            autoPlay
            className="w-full h-full object-contain"
            poster={node.thumbnail}
          >
            <source src={videoUrl} type={node.mimeType || 'video/mp4'} />
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Audio node renderer with audio player and fullscreen
 */
function AudioNode({ node }: { node: PlateNode }) {
  const [fullscreen, setFullscreen] = React.useState(false);
  const resolveMediaUrl = useResolveMediaUrl();

  // Resolve URL based on strategy
  const audioUrl = React.useMemo(() => {
    // Check if node uses contentMediaId strategy
    if (node.attrs?.strategy === 'contentMediaId' && node.attrs?.contentMediaId) {
      const resolved = resolveMediaUrl(node.attrs.contentMediaId);
      if (resolved) {
        console.log('✅ Resolved audio contentMediaId to URL:', { 
          contentMediaId: node.attrs.contentMediaId, 
          url: resolved 
        });
        return resolved;
      }
      console.warn('⚠️ Failed to resolve audio contentMediaId:', node.attrs.contentMediaId);
    }
    
    // Fallback to node.url (for api/external strategies)
    return node.url || null;
  }, [node.attrs, node.url, resolveMediaUrl]);

  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-100 rounded-lg my-8">
        <p className="text-gray-500">Audio non disponible</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center gap-4 my-8 not-prose">
        <div 
          className="w-full max-w-2xl bg-linear-to-br from-pink-50 via-pink-100 to-pink-50 rounded-2xl p-8 shadow-lg border border-pink-200 cursor-pointer hover:shadow-xl transition-shadow"
          onClick={() => setFullscreen(true)}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-pink-dark/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-pink-dark" fill="currentColor" viewBox="0 0 20 20">
                <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-pink-dark">Audio</div>
              {node.duration && (
                <div className="text-xs text-gray-600">
                  {Math.floor(node.duration / 60)}:{(node.duration % 60).toString().padStart(2, '0')}
                </div>
              )}
            </div>
          </div>
          <audio
            controls
            className="w-full"
          >
            <source src={audioUrl} type={node.mimeType || 'audio/mpeg'} />
            Votre navigateur ne supporte pas la lecture audio.
          </audio>
        </div>

        <div className="flex gap-2 items-center bg-white rounded-full shadow-md px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFullscreen(true)}
            className="rounded-full hover:bg-pink-50 hover:text-pink-dark transition-colors"
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            Plein écran
          </Button>
        </div>

        {node.size && (
          <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full">
            {(node.size / 1024).toFixed(2)} KB
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="w-screen h-screen max-w-none! p-0 bg-linear-to-br from-pink-50 via-pink-100 to-pink-50 border-none m-0" showCloseButton={false}>
          <DialogTitle className="sr-only">Audio fullscreen player</DialogTitle>
          <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFullscreen(false)}
              className="absolute top-4 right-4 z-50 text-pink-dark hover:bg-pink-200/50 rounded-full"
            >
              <X className="w-6 h-6" />
            </Button>
            <div className="w-full max-w-4xl space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-pink-dark/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-pink-dark" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-2xl font-semibold text-pink-dark">Audio Fullscreen</div>
                  {node.duration && (
                    <div className="text-lg text-gray-600">
                      {Math.floor(node.duration / 60)}:{(node.duration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              </div>
              <audio
                controls
                autoPlay
                className="w-full"
              >
                <source src={audioUrl} type={node.mimeType || 'audio/mpeg'} />
                Votre navigateur ne supporte pas la lecture audio.
              </audio>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

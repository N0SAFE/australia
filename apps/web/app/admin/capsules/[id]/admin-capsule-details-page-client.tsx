'use client';

import { FC, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from 'next/link';
import { Capsule, LockType } from '@/types/capsule';
import { PlateEditor } from '@/components/blocks/editor-00/plate-editor';
import { type Value } from 'platejs';
import { Calendar } from '@/components/ui/calendar';
import { useCapsule, useUpdateCapsule } from '@/hooks/useCapsules';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Lock, Unlock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

export const AdminCapsuleDetailsPageClient: FC<{
  capsuleId: string,
  update?: boolean,
}> = ({
  capsuleId,
  update = false,
}) => {
  const { data: capsule } = useCapsule(capsuleId);
  
  const [state, setState] = useState<Capsule>(
    capsule || {
      isLocked: false,
      lockType: null,
      lockConfig: null,
    } as Capsule
  );
  
  // Default empty Plate value (empty paragraph)
  const getEmptyValue = (): Value => [{ type: 'p', children: [{ text: '' }] }];
  
  const [editorValue, setEditorValue] = useState<Value>(getEmptyValue());
  const [date, setDate] = useState<Date | undefined>(
    capsule?.openingDate ? new Date(capsule.openingDate) : new Date()
  );
  const [isLocked, setIsLocked] = useState<boolean>(capsule?.isLocked || false);
  const [lockType, setLockType] = useState<LockType | null>(capsule?.lockType || null);
  
  const { mutate: updateCapsule, isPending: isUpdating } = useUpdateCapsule();
  const router = useRouter();

  // Update local state when capsule data loads
  useEffect(() => {
    if (capsule && !state.id) {
      setState({
        ...capsule,
        isLocked: capsule.isLocked || false,
        lockType: capsule.lockType || null,
        lockConfig: capsule.lockConfig || null,
      });
      setIsLocked(capsule.isLocked || false);
      setLockType(capsule.lockType || null);
      if (capsule.openingDate) {
        setDate(new Date(capsule.openingDate));
      }
    }
  }, [capsule]);

  // Load content from JSON when capsule data changes
  useEffect(() => {
    console.log('🔍 [AdminCapsule] Loading content, capsule?.content exists:', !!capsule?.content);
    if (capsule?.content) {
      try {
        // Parse Plate.js JSON content
        console.log('📄 [AdminCapsule] Raw content string:', capsule.content.substring(0, 200));
        const parsed = JSON.parse(capsule.content);
        console.log('✅ [AdminCapsule] Parsed content:', JSON.stringify(parsed, null, 2));
        
        if (Array.isArray(parsed)) {
          // Normalize nodes to ensure all element nodes have children array
          const normalizeNode = (node: any, depth = 0): any => {
            const indent = '  '.repeat(depth);
            console.log(`${indent}🔧 [AdminCapsule] Normalizing node at depth ${depth}:`, JSON.stringify(node));
            
            // Text nodes don't need children
            if (node.text !== undefined) {
              console.log(`${indent}📝 [AdminCapsule] Text node, returning as-is`);
              return node;
            }
            
            // Element nodes must have children array with at least one child
            // Even void elements (images, videos) need [{ text: '' }] for Slate/Plate
            let children: any[];
            if (Array.isArray(node.children) && node.children.length > 0) {
              children = node.children.map((child: any) => normalizeNode(child, depth + 1));
            } else {
              // Empty or missing children - add default text node
              children = [{ text: '' }];
            }
            
            console.log(`${indent}📦 [AdminCapsule] Element node children:`, JSON.stringify(children));
            const result = { ...node, children };
            console.log(`${indent}✅ [AdminCapsule] Normalized result:`, JSON.stringify(result));
            return result;
          };
          
          console.log('🔄 [AdminCapsule] Starting normalization...');
          const normalizedValue = parsed.map((node: any) => normalizeNode(node, 0));
          console.log('✅ [AdminCapsule] Normalized value:', JSON.stringify(normalizedValue, null, 2));
          setEditorValue(normalizedValue);
          console.log('💾 [AdminCapsule] Editor value set');
        }
      } catch (error) {
        console.error('❌ [AdminCapsule] Failed to parse capsule content:', error);
        // Use empty value if parsing fails
        setEditorValue(getEmptyValue());
      }
    }
  }, [capsule?.content]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!update || !capsule) return;
    
    try {
      // Always store Plate.js content as JSON string
      // Plate.js content can contain text, images, videos, audio, and more
      const updateData: any = {
        id: capsule.id,
        openingDate: date?.toISOString() || state.openingDate,
        content: JSON.stringify(editorValue),
        openingMessage: state.openingMessage,
        isLocked: isLocked,
        lockType: lockType,
        lockConfig: state.lockConfig,
      };
      
      console.log('🔵 Submitting capsule update:', updateData);
      
      updateCapsule(updateData, {
        onSuccess: (result) => {
          console.log('✅ Capsule update successful:', result);
          router.push(`/admin/capsules/${capsuleId}`);
        },
        onError: (error) => {
          console.error('❌ Capsule update failed:', error);
        }
      });
      console.log('📤 Mutation called');
    } catch (error) {
      console.error('Failed to save capsule:', error);
    }
  };

  if (!capsule) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link 
              href="/admin/capsules"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour aux capsules
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {update ? 'Modifier la capsule' : 'Détails de la capsule'}
          </h1>
          <p className="text-muted-foreground">
            {update ? 'Modifiez les paramètres de la capsule temporelle' : 'Consultez les détails de la capsule'}
          </p>
        </div>
        {!update && (
          <Button asChild>
            <Link href={`/admin/capsules/${capsuleId}/edit`}>
              Modifier
            </Link>
          </Button>
        )}
      </div>

      <Separator />

    <form onSubmit={handleSubmit} className="space-y-6">
      <Field>
        <FieldLabel htmlFor="openingMessage">Message d&apos;ouverture</FieldLabel>
        <Input
          id="openingMessage"
          type="text"
          placeholder="Hello World!"
          name="openingMessage"
          value={state.openingMessage || ''}
          {...( !update && { readOnly: true })}
          {...( update && { onChange: (e) => {
            setState(prev => ({ ...prev, openingMessage: e.target.value}))
          } })}
        />
      </Field>
      
      {/* Plate.js Editor - supports text, images, videos, audio, and more */}
      <Field>
        <FieldLabel>Contenu de la capsule</FieldLabel>
        <Input
          value={state.content ?? ''}
          type="hidden"
          name="content"
          readOnly
        />
        <PlateEditor
          value={editorValue}
          onChange={update ? setEditorValue : undefined}
          placeholder="Créez votre contenu ici... Utilisez les plugins pour ajouter des images, vidéos, audio, etc."
        />
      </Field>

      {/* Lock Toggle */}
      <Field className="flex items-center gap-2">
        <input
          id="isLocked"
          type="checkbox"
          checked={isLocked}
          disabled={!update}
          onChange={(e) => {
            setIsLocked(e.target.checked);
            setState(prev => ({ ...prev, isLocked: e.target.checked }));
            if (!e.target.checked) {
              setLockType(null);
              setState(prev => ({ ...prev, lockType: null, lockConfig: null }));
            }
          }}
          className="h-4 w-4"
        />
        <Label htmlFor="isLocked" className="cursor-pointer">
          🔒 Capsule verrouillée
        </Label>
      </Field>

      {/* Lock Type Selector */}
      {isLocked && (
        <Field>
          <Label htmlFor="lockType">Type de verrouillage</Label>
          <Select 
            value={lockType || ''} 
            onValueChange={(value) => {
              setLockType(value as LockType);
              setState(prev => ({ ...prev, lockType: value as LockType, lockConfig: null }));
            }}
            disabled={!update}
          >
            <SelectTrigger id="lockType">
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">🔢 Code PIN</SelectItem>
              <SelectItem value="voice">🎤 Reconnaissance vocale</SelectItem>
              <SelectItem value="device_shake">📱 Secouer l&apos;appareil</SelectItem>
              <SelectItem value="device_tilt">📱 Incliner l&apos;appareil</SelectItem>
              <SelectItem value="device_tap">📱 Taper l&apos;appareil</SelectItem>
              <SelectItem value="time_based">⏰ Basé sur le temps</SelectItem>
              <SelectItem value="api">🔗 API externe</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      )}

      {/* Lock Config Inputs */}
      {isLocked && lockType === 'code' && (
        <>
          <Field>
            <FieldLabel htmlFor="lockCode">Code de déverrouillage</FieldLabel>
            <Input
              id="lockCode"
              type="text"
              placeholder="1234"
              name="lockCode"
              value={(state.lockConfig as any)?.code || ''}
              {...( !update && { readOnly: true })}
              {...( update && { onChange: (e) => {
                setState(prev => ({ 
                  ...prev, 
                  lockConfig: { 
                    type: 'code', 
                    code: e.target.value,
                    attempts: (prev.lockConfig as any)?.attempts || 3
                  } 
                }))
              } })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="lockAttempts">Nombre de tentatives</FieldLabel>
            <Input
              id="lockAttempts"
              type="number"
              min="1"
              max="10"
              value={(state.lockConfig as any)?.attempts || 3}
              name="lockAttempts"
              {...( !update && { readOnly: true })}
              {...( update && { onChange: (e) => {
                setState(prev => ({ 
                  ...prev, 
                  lockConfig: { 
                    type: 'code', 
                    code: (prev.lockConfig as any)?.code || '',
                    attempts: parseInt(e.target.value)
                  } 
                }))
              } })}
            />
          </Field>
        </>
      )}

      {isLocked && lockType === 'voice' && (
        <>
          <Field>
            <FieldLabel htmlFor="voicePhrase">Phrase à prononcer</FieldLabel>
            <Input
              id="voicePhrase"
              type="text"
              placeholder="ouvre toi"
              name="voicePhrase"
              value={(state.lockConfig as any)?.phrase || ''}
              {...( !update && { readOnly: true })}
              {...( update && { onChange: (e) => {
                setState(prev => ({ 
                  ...prev, 
                  lockConfig: { 
                    type: 'voice', 
                    phrase: e.target.value,
                    language: (prev.lockConfig as any)?.language || 'fr-FR'
                  } 
                }))
              } })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="voiceLanguage">Langue</FieldLabel>
            <Input
              id="voiceLanguage"
              type="text"
              placeholder="fr-FR"
              value={(state.lockConfig as any)?.language || 'fr-FR'}
              name="voiceLanguage"
              {...( !update && { readOnly: true })}
              {...( update && { onChange: (e) => {
                setState(prev => ({ 
                  ...prev, 
                  lockConfig: { 
                    type: 'voice', 
                    phrase: (prev.lockConfig as any)?.phrase || '',
                    language: e.target.value
                  } 
                }))
              } })}
            />
          </Field>
        </>
      )}

      {isLocked && (lockType === 'device_shake' || lockType === 'device_tilt' || lockType === 'device_tap') && (
        <Field>
          <FieldLabel htmlFor="deviceThreshold">Seuil de détection</FieldLabel>
          <Input
            id="deviceThreshold"
            type="number"
            min="1"
            max="100"
            step="0.1"
            value={(state.lockConfig as any)?.threshold || 15}
            name="deviceThreshold"
            {...( !update && { readOnly: true })}
            {...( update && { onChange: (e) => {
              setState(prev => ({ 
                ...prev, 
                lockConfig: { 
                  type: lockType as 'device_shake' | 'device_tilt' | 'device_tap', 
                  threshold: parseFloat(e.target.value)
                } 
              }))
            } })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Sensibilité de détection du geste (plus bas = plus sensible)
          </p>
        </Field>
      )}

      {isLocked && lockType === 'time_based' && (
        <Field>
          <FieldLabel htmlFor="delayMinutes">Délai en minutes</FieldLabel>
          <Input
            id="delayMinutes"
            type="number"
            min="1"
            placeholder="60"
            value={(state.lockConfig as any)?.delayMinutes || ''}
            name="delayMinutes"
            {...( !update && { readOnly: true })}
            {...( update && { onChange: (e) => {
              setState(prev => ({ 
                ...prev, 
                lockConfig: { 
                  type: 'time_based', 
                  delayMinutes: parseInt(e.target.value)
                } 
              }))
            } })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Temps d&apos;attente après la date d&apos;ouverture
          </p>
        </Field>
      )}

      {isLocked && lockType === 'api' && (
        <>
          <Field>
            <FieldLabel htmlFor="apiEndpoint">URL de l&apos;API</FieldLabel>
            <Input
              id="apiEndpoint"
              type="url"
              placeholder="https://api.example.com/unlock"
              name="apiEndpoint"
              value={(state.lockConfig as any)?.endpoint || ''}
              {...( !update && { readOnly: true })}
              {...( update && { onChange: (e) => {
                setState(prev => ({ 
                  ...prev, 
                  lockConfig: { 
                    type: 'api', 
                    endpoint: e.target.value,
                    method: (prev.lockConfig as any)?.method || 'POST'
                  } 
                }))
              } })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="apiMethod">Méthode HTTP</FieldLabel>
            <Select 
              defaultValue="POST"
              onValueChange={(value) => {
                setState(prev => ({ 
                  ...prev, 
                  lockConfig: { 
                    type: 'api', 
                    endpoint: (prev.lockConfig as any)?.endpoint || '',
                    method: value as 'GET' | 'POST'
                  } 
                }))
              }}
              disabled={!update}
            >
              <SelectTrigger id="apiMethod">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
      <Field className="max-w-lg">
        <FieldLabel htmlFor="openingDate">Date d&apos;ouverture</FieldLabel>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-lg border"
        />
      </Field>
      {update && <Field>
        <Button type="submit" disabled={isUpdating}>
          {isUpdating ? 'Enregistrement...' : 'Modifier'}
        </Button>
      </Field>}
    </form>
    </div>
  );
}
"use client";

import { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CalendarIcon, Settings, Lock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@repo/ui/components/shadcn/switch";
import { Capsule, LockType } from "@/types/capsule";
import { Calendar } from "@/components/ui/calendar";
import { useCreateCapsule, useUpdateCapsule } from "@/hooks/capsules/hooks";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useCapsuleMedia } from "@/hooks/capsules/media";
import { AttachedMediaProvider } from "@/contexts/AttachedMediaContext";
import { TipTapContentRenderer } from "@/components/tiptap/common";
import { toast } from "sonner";

interface CapsuleFormProps {
  /**
   * Mode: create or edit
   */
  mode: 'create' | 'edit';
  
  /**
   * Capsule data (required for edit mode)
   */
  capsule?: Capsule;
  
  /**
   * Callback on successful submit
   */
  onSuccess?: (capsule: Capsule) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Unified Capsule Form Component
 * Handles both creation and editing of capsules
 */
export const CapsuleForm: FC<CapsuleFormProps> = ({
  mode,
  capsule,
  onSuccess,
  className,
}) => {
  // Default empty Tiptap value (proper doc structure)
  const getEmptyValue = () => ({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [state, setState] = useState<Partial<Capsule>>({
    isLocked: false,
    lockType: null,
    lockConfig: null,
    openingMessage: "",
    ...capsule,
  });

  const [editorValue, setEditorValue] = useState<any>(getEmptyValue());
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(
    capsule?.openingDate ? new Date(capsule.openingDate) : undefined
  );
  const [isLocked, setIsLocked] = useState<boolean>(capsule?.isLocked || false);
  const [lockType, setLockType] = useState<LockType | null>(
    capsule?.lockType || null
  );
  const [isLockConfigOpen, setIsLockConfigOpen] = useState(false);

  const { mutate: createCapsule, isPending: isCreating } = useCreateCapsule();
  const { mutate: updateCapsule, isPending: isUpdating } = useUpdateCapsule();
  const router = useRouter();
  
  // Use the capsule media tracking hook
  const { processContentForSubmit } = useCapsuleMedia();

  const isPending = isCreating || isUpdating;

  // Load content from JSON when capsule data changes (edit mode)
  useEffect(() => {
    if (mode === 'edit' && capsule?.content) {
      try {
        const parsed = JSON.parse(capsule.content);
        
        // Normalize content: if it's an array with a doc wrapper, unwrap it
        let normalizedContent = parsed;
        if (Array.isArray(parsed) && parsed.length === 1 && parsed[0]?.type === 'doc') {
          normalizedContent = parsed[0];
        }
        setEditorValue(normalizedContent);
      } catch (error) {
        console.error("Failed to parse capsule content:", error);
        setEditorValue(getEmptyValue());
      }
    }
  }, [mode, capsule?.content]);

  // Update lock state when capsule changes
  useEffect(() => {
    if (capsule) {
      setIsLocked(capsule.isLocked || false);
      setLockType(capsule.lockType || null);
      if (capsule.openingDate) {
        setDate(new Date(capsule.openingDate));
      }
    }
  }, [capsule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate content
    if (!editorValue || editorValue.length === 0) {
      toast.error("Content is required");
      return;
    }

    if (!date) {
      toast.error("Opening date is required");
      return;
    }

    // Process content: extract local nodes, convert to uniqueId strategy, collect files
    const contentArray = Array.isArray(editorValue) ? editorValue : [editorValue];
    const { processedContent, media } = processContentForSubmit(contentArray);

    const capsuleData = {
      openingDate: date.toISOString(),
      content: JSON.stringify(processedContent),
      openingMessage: state.openingMessage || undefined,
      isLocked: Boolean(isLocked),
      lockType: lockType,
      lockConfig: state.lockConfig,
      media,
    };

    if (mode === 'create') {
      createCapsule(capsuleData, {
        onSuccess: (result) => {
          // Reset form
          setEditorValue(getEmptyValue());
          setDate(undefined);
          setState({
            isLocked: false,
            lockType: null,
            lockConfig: null,
            openingMessage: "",
          });
          setIsLocked(false);
          setLockType(null);
          
          onSuccess?.(result);
        },
      });
    } else if (mode === 'edit' && capsule?.id) {
      updateCapsule(
        {
          id: capsule.id,
          ...capsuleData,
        },
        {
          onSuccess: (result) => {
            onSuccess?.(result);
          },
        }
      );
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Opening Date - First */}
      <Field className="max-w-lg">
        <FieldLabel htmlFor="openingDate">Date d&apos;ouverture</FieldLabel>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="openingDate"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
              aria-label={date ? `Date d'ouverture: ${format(date, "PPP")}` : "Sélectionner une date d'ouverture"}
            >
              <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </Field>

      {/* Tiptap Editor */}
      <Field>
        <FieldLabel>Contenu de la capsule</FieldLabel>
        <div 
          className="border rounded-lg overflow-hidden"
          role="region"
          aria-label="Contenu de la capsule"
          tabIndex={0}
        >
          {!isEditorReady && (
            <div className="p-4 space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-full"></div>
              <div className="h-4 bg-muted rounded w-5/6"></div>
            </div>
          )}
          <div className={!isEditorReady ? 'hidden' : ''}>
            <TipTapContentRenderer
              mode="editor"
              value={editorValue}
              onChange={(newValue) => {
                setEditorValue(newValue);
              }}
              capsule={capsule}
              placeholder="Écrivez le contenu de votre capsule temporelle..."
              onEditorReady={() => {
                setIsEditorReady(true);
              }}
            />
          </div>
        </div>
      </Field>

      {/* Opening Message */}
      <Field>
        <FieldLabel htmlFor="openingMessage">
          Message d&apos;ouverture
        </FieldLabel>
        <Input
          id="openingMessage"
          type="text"
          placeholder="Hello World!"
          name="openingMessage"
          value={state.openingMessage || ""}
          onChange={(e) => {
            setState((prev) => ({
              ...prev,
              openingMessage: e.target.value,
            }));
          }}
        />
      </Field>

      {/* Lock Configuration Section */}
      <div className="space-y-4 rounded-lg border p-6 bg-muted/30">
        <div className="flex justify-between items-center"> 
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Verrouillage de la capsule</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Configurez un mécanisme de sécurité pour protéger l&apos;accès à votre capsule temporelle
            </p>
          </div>
          <Switch
            id="isLocked"
            checked={isLocked}
            onCheckedChange={(checked) => {
              setIsLocked(checked);
              setState((prev) => ({ ...prev, isLocked: checked }));
              if (!checked) {
                setLockType(null);
                setState((prev) => ({
                  ...prev,
                  lockType: null,
                  lockConfig: null,
                }));
              }
            }}
          />
        </div>

        {isLocked && (
          <div className="space-y-4 pt-4 border-t">
            <Field>
              <FieldLabel htmlFor="lockType">Type de verrouillage</FieldLabel>
              <FieldDescription>
                Choisissez le mécanisme qui déverrouillera la capsule
              </FieldDescription>
              <Select
                value={lockType || ""}
                onValueChange={(value) => {
                  setLockType(value as LockType);
                  setState((prev) => ({
                    ...prev,
                    lockType: value as LockType,
                    lockConfig: null,
                  }));
                }}
              >
                <SelectTrigger id="lockType">
                  <SelectValue placeholder="Sélectionner un type de verrouillage" />
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

            {lockType && (
              <Dialog open={isLockConfigOpen} onOpenChange={setIsLockConfigOpen}>
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsLockConfigOpen(true)}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Configurer le verrouillage
                </Button>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle>Configuration du verrouillage</DialogTitle>
                    <DialogDescription>
                      Configurez les paramètres du type de verrouillage sélectionné
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {lockType === "code" && (
                      <>
                        <Field>
                          <FieldLabel htmlFor="lockCode">Code de déverrouillage</FieldLabel>
                          <Input
                            id="lockCode"
                            type="text"
                            placeholder="1234"
                            name="lockCode"
                            value={(state.lockConfig as any)?.code || ""}
                            onChange={(e) => {
                              setState((prev) => ({
                                ...prev,
                                lockConfig: {
                                  type: "code",
                                  code: e.target.value,
                                  attempts: (prev.lockConfig as any)?.attempts || 3,
                                },
                              }));
                            }}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="lockAttempts">
                            Nombre de tentatives
                          </FieldLabel>
                          <Input
                            id="lockAttempts"
                            type="number"
                            min="1"
                            max="10"
                            value={(state.lockConfig as any)?.attempts || 3}
                            name="lockAttempts"
                            onChange={(e) => {
                              setState((prev) => ({
                                ...prev,
                                lockConfig: {
                                  type: "code",
                                  code: (prev.lockConfig as any)?.code || "",
                                  attempts: parseInt(e.target.value),
                                },
                              }));
                            }}
                          />
                        </Field>
                      </>
                    )}

                    {lockType === "voice" && (
                      <>
                        <Field>
                          <FieldLabel htmlFor="voicePhrase">Phrase à prononcer</FieldLabel>
                          <Input
                            id="voicePhrase"
                            type="text"
                            placeholder="ouvre toi"
                            name="voicePhrase"
                            value={(state.lockConfig as any)?.phrase || ""}
                            onChange={(e) => {
                              setState((prev) => ({
                                ...prev,
                                lockConfig: {
                                  type: "voice",
                                  phrase: e.target.value,
                                  language: (prev.lockConfig as any)?.language || "fr-FR",
                                },
                              }));
                            }}
                            aria-describedby="voicePhrase-description"
                          />
                          <FieldDescription id="voicePhrase-description">
                            La phrase exacte que l&apos;utilisateur devra prononcer pour déverrouiller
                          </FieldDescription>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="voiceLanguage">Langue</FieldLabel>
                          <Input
                            id="voiceLanguage"
                            type="text"
                            placeholder="fr-FR"
                            value={(state.lockConfig as any)?.language || "fr-FR"}
                            name="voiceLanguage"
                            onChange={(e) => {
                              setState((prev) => ({
                                ...prev,
                                lockConfig: {
                                  type: "voice",
                                  phrase: (prev.lockConfig as any)?.phrase || "",
                                  language: e.target.value,
                                },
                              }));
                            }}
                            aria-describedby="voiceLanguage-description"
                          />
                          <FieldDescription id="voiceLanguage-description">
                            Code de langue BCP 47 (ex: fr-FR, en-US)
                          </FieldDescription>
                        </Field>
                      </>
                    )}

                    {(lockType === "device_shake" ||
                      lockType === "device_tilt" ||
                      lockType === "device_tap") && (
                      <Field>
                        <FieldLabel htmlFor="deviceThreshold">
                          Seuil de détection
                        </FieldLabel>
                        <Input
                          id="deviceThreshold"
                          type="number"
                          min="1"
                          max="100"
                          step="0.1"
                          value={(state.lockConfig as any)?.threshold || 15}
                          name="deviceThreshold"
                          onChange={(e) => {
                            setState((prev) => ({
                              ...prev,
                              lockConfig: {
                                type: lockType as
                                  | "device_shake"
                                  | "device_tilt"
                                  | "device_tap",
                                threshold: parseFloat(e.target.value),
                              },
                            }));
                          }}
                          aria-describedby="deviceThreshold-description"
                        />
                        <FieldDescription id="deviceThreshold-description">
                          Sensibilité de détection du geste (plus bas = plus sensible)
                        </FieldDescription>
                      </Field>
                    )}

                    {lockType === "time_based" && (
                      <Field>
                        <FieldLabel htmlFor="delayMinutes">Délai en minutes</FieldLabel>
                        <Input
                          id="delayMinutes"
                          type="number"
                          min="1"
                          placeholder="60"
                          value={(state.lockConfig as any)?.delayMinutes || ""}
                          name="delayMinutes"
                          onChange={(e) => {
                            setState((prev) => ({
                              ...prev,
                              lockConfig: {
                                type: "time_based",
                                delayMinutes: parseInt(e.target.value),
                              },
                            }));
                          }}
                          aria-describedby="delayMinutes-description"
                        />
                        <FieldDescription id="delayMinutes-description">
                          Temps d&apos;attente après la date d&apos;ouverture
                        </FieldDescription>
                      </Field>
                    )}

                    {lockType === "api" && (
                      <>
                        <Field>
                          <FieldLabel htmlFor="apiEndpoint">URL de l&apos;API</FieldLabel>
                          <Input
                            id="apiEndpoint"
                            type="url"
                            placeholder="https://api.example.com/unlock"
                            name="apiEndpoint"
                            value={(state.lockConfig as any)?.endpoint || ""}
                            onChange={(e) => {
                              setState((prev) => ({
                                ...prev,
                                lockConfig: {
                                  type: "api",
                                  endpoint: e.target.value,
                                  method: (prev.lockConfig as any)?.method || "POST",
                                },
                              }));
                            }}
                            aria-describedby="apiEndpoint-description"
                          />
                          <FieldDescription id="apiEndpoint-description">
                            L&apos;URL qui sera appelée pour vérifier le déverrouillage
                          </FieldDescription>
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="apiMethod">Méthode HTTP</FieldLabel>
                          <Select
                            defaultValue="POST"
                            onValueChange={(value) => {
                              setState((prev) => ({
                                ...prev,
                                lockConfig: {
                                  type: "api",
                                  endpoint: (prev.lockConfig as any)?.endpoint || "",
                                  method: value as "GET" | "POST",
                                },
                              }));
                            }}
                          >
                            <SelectTrigger id="apiMethod" aria-describedby="apiMethod-description">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GET">GET</SelectItem>
                              <SelectItem value="POST">POST</SelectItem>
                            </SelectContent>
                          </Select>
                          <FieldDescription id="apiMethod-description">
                            La méthode HTTP utilisée pour l&apos;appel
                          </FieldDescription>
                        </Field>
                      </>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" onClick={() => setIsLockConfigOpen(false)}>
                      Fermer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )}
      </div>
    
      {/* Submit Button */}
      <Field>
        <Button type="submit" disabled={isPending}>
          {isPending 
            ? (mode === 'create' ? "Création..." : "Enregistrement...")
            : (mode === 'create' ? "Créer la capsule" : "Modifier la capsule")
          }
        </Button>
      </Field>
    </form>
  );

  // Wrap with AttachedMediaProvider if in edit mode
  if (mode === 'edit' && capsule) {
    return (
      <AttachedMediaProvider attachedMedia={capsule.attachedMedia || []}>
        {formContent}
      </AttachedMediaProvider>
    );
  }

  return formContent;
};

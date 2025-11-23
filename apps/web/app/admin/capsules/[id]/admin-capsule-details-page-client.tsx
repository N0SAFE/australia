"use client";

import { FC, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldDescription, FieldSet, FieldLegend } from "@/components/ui/field";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { CalendarIcon, Settings } from "lucide-react";
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
import Link from "next/link";
import { Capsule, LockType } from "@/types/capsule";

import { Calendar } from "@/components/ui/calendar";
import { useCapsule, useUpdateCapsule } from "@/hooks/capsules/hooks";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Unlock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useCapsuleMedia } from "@/hooks/capsules/media";
import { AttachedMediaProvider } from "@/contexts/AttachedMediaContext";
import { TipTapContentRenderer } from "@/components/tiptap/common";

export const AdminCapsuleDetailsPageClient: FC<{
  capsuleId: string;
  update?: boolean;
}> = ({ capsuleId, update = false }) => {
  const { data: capsule } = useCapsule(capsuleId);

  const [state, setState] = useState<Capsule>(
    capsule ||
      ({
        isLocked: false,
        lockType: null,
        lockConfig: null,
      } as Capsule),
  );

  // Default empty Tiptap value (proper doc structure)
  const getEmptyValue = () => ({
    type: "doc",
    content: [{ type: "paragraph" }],
  });

  const [editorValue, setEditorValue] = useState<any>(getEmptyValue());
  const [isEditorReady, setIsEditorReady] = useState(false);
  
  const [date, setDate] = useState<Date | undefined>(
    capsule?.openingDate ? new Date(capsule.openingDate) : new Date(),
  );
  const [isLocked, setIsLocked] = useState<boolean>(capsule?.isLocked || false);
  const [lockType, setLockType] = useState<LockType | null>(
    capsule?.lockType || null,
  );
  const [isLockConfigOpen, setIsLockConfigOpen] = useState(false);

  const { mutate: updateCapsule, isPending: isUpdating } = useUpdateCapsule();
  const router = useRouter();
  
  // Use the capsule media tracking hook
  const { processContentForSubmit } = useCapsuleMedia();

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
    console.log(
      "🔍 [AdminCapsule] Loading content, capsule?.content exists:",
      !!capsule?.content,
    );
    if (capsule?.content) {
      try {
        // Parse Tiptap JSON content
        console.log(
          "📄 [AdminCapsule] Raw content string:",
          capsule.content.substring(0, 200),
        );
        const parsed = JSON.parse(capsule.content);
        console.log(
          "✅ [AdminCapsule] Parsed content:",
          JSON.stringify(parsed, null, 2),
        );

        // Tiptap content can be an object with type: 'doc' or directly the content array
        if (parsed && typeof parsed === "object") {
          // Normalize content: if it's an array with a doc wrapper, unwrap it
          let normalizedContent = parsed;
          if (Array.isArray(parsed) && parsed.length === 1 && parsed[0]?.type === 'doc') {
            normalizedContent = parsed[0];
            console.log("🔧 [AdminCapsule] Unwrapped array-wrapped doc");
          }
          setEditorValue(normalizedContent);
          console.log("💾 [AdminCapsule] Editor value set", normalizedContent);
        }
      } catch (error) {
        console.error(
          "❌ [AdminCapsule] Failed to parse capsule content:",
          error,
        );
        // Use empty value if parsing fails
        setEditorValue(getEmptyValue());
      }
    }
  }, [capsule?.content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!update || !capsule) return;

    try {
      // Process content: extract local nodes, convert to uniqueId strategy, collect files
      const contentArray = Array.isArray(editorValue) ? editorValue : [editorValue];
      const { processedContent, media } = processContentForSubmit(contentArray);
      
      console.log("🔵 Submitting capsule update with media:", media);

      updateCapsule(
        {
          id: capsule.id,
          openingDate: date?.toISOString() || state.openingDate,
          content: JSON.stringify(processedContent),
          openingMessage: state.openingMessage ?? undefined,
          isLocked: isLocked,
          lockType: lockType,
          lockConfig: state.lockConfig,
          media: media,
        }, {
        onSuccess: (result) => {
          console.log("✅ Capsule update successful:", result);
          router.push(`/admin/capsules/${capsuleId}`);
        },
        onError: (error) => {
          console.error("❌ Capsule update failed:", error);
        },
      });
      console.log("📤 Mutation called");
    } catch (error) {
      console.error("Failed to save capsule:", error);
    }
  };

  if (!capsule) {
    return <div>Loading...</div>;
  }

  return (
    <AttachedMediaProvider attachedMedia={capsule.attachedMedia || []}>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/admin/capsules"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour aux capsules
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {update ? "Modifier la capsule" : "Détails de la capsule"}
          </h1>
          <p className="text-muted-foreground">
            {update
              ? "Modifiez les paramètres de la capsule temporelle"
              : "Consultez les détails de la capsule"}
          </p>
        </div>
        {!update && (
          <Button asChild>
            <Link href={`/admin/capsules/${capsuleId}/edit`}>Modifier</Link>
          </Button>
        )}
      </div>

      <Separator />

      <form onSubmit={handleSubmit} className="space-y-6">
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
                disabled={!update}
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
                disabled={!update}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </Field>

        {/* Tiptap Editor - supports text, images, videos, audio, and more */}
        <Field>
          <FieldLabel>Contenu de la capsule</FieldLabel>
          <Input
            value={state.content ?? ""}
            type="hidden"
            name="content"
            readOnly
          />
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
                mode={update ? 'editor' : 'viewer'}
                value={editorValue}
                onChange={(newValue) => {
                  console.log(
                    "📝 [TipTap] Content changed:",
                    JSON.stringify(newValue, null, 2),
                  );
                  setEditorValue(newValue);
                }}
                capsule={capsule}
                placeholder="Écrivez le contenu de votre capsule temporelle..."
                onEditorReady={() => {
                  console.log("✅ [TipTap] Editor is ready");
                  setIsEditorReady(true);
                }}
              />
            </div>
          </div>
        </Field>

        {/* Opening Message - After Content */}
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
            {...(!update && { readOnly: true })}
            {...(update && {
              onChange: (e) => {
                setState((prev) => ({
                  ...prev,
                  openingMessage: e.target.value,
                }));
              },
            })}
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
              disabled={!update}
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
                  disabled={!update}
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

              {lockType && update && (
                <Dialog open={isLockConfigOpen} onOpenChange={setIsLockConfigOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Configurer le verrouillage
                    </Button>
                  </DialogTrigger>
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
        
        {update && (
          <Field>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Enregistrement..." : "Modifier"}
            </Button>
          </Field>
        )}
      </form>
      </div>
    </AttachedMediaProvider>
  );
};

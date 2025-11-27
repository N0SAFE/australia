"use client";

import { FC } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useCapsule } from "@/hooks/capsules/hooks";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { CapsuleForm } from "@/components/capsule/form";

export const CapsulesEditClient: FC<{
  capsuleId: string;
}> = ({ capsuleId }) => {
  const { data: capsule } = useCapsule(capsuleId);
  const router = useRouter();

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
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour aux capsules
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">
            {"Modifier la capsule"}
          </h1>
          <p className="text-muted-foreground">
            {"Modifiez les paramètres de la capsule temporelle"}
          </p>
        </div>
        <Button asChild>
          <Link href={`/admin/capsules/${capsuleId}/edit`}>Modifier</Link>
        </Button>
      </div>

      <Separator />

      <CapsuleForm
        mode="edit"
        capsule={capsule}
        onSuccess={() => {
          router.push(`/admin/capsules`);
        }}
      />
    </div>
  );
};

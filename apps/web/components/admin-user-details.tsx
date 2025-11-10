'use client';

import { FC, useState } from 'react';
import { User } from '@/types/user';
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from '@/components/ui/password-input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/shadcn/card';
import Link from 'next/link';
import { useUpdateUser } from '@/hooks/useUsers';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, User as UserIcon, Lock } from 'lucide-react';

export const AdminUserDetailsPage: FC<{
  data: User,
  update?: boolean,
}> = ({
  data,
  update = false,
}) => {
  const [state, setState] = useState<User & {
    password?: string,
    confirmPassword?: string,
  }>(data);
  
  const { mutate: updateUser, isPending } = useUpdateUser();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!update) return;
    
    if (state.password && state.password !== state.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    
    const updateData: any = {
      id: data.id,
      name: state.name,
      email: state.email,
      emailVerified: state.emailVerified,
    };
    
    if (state.password) {
      updateData.password = state.password;
    }
    
    console.log('🔵 Submitting user update:', updateData);
    
    updateUser(updateData, {
      onSuccess: (result) => {
        console.log('✅ User update successful:', result);
        router.push(`/admin/users/${data.id}`);
      },
      onError: (error) => {
        console.error('❌ User update failed:', error);
      }
    });
    console.log('📤 Mutation called');
  };

  return <div className="p-6 max-w-4xl mx-auto space-y-6">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Link 
            href="/admin/users"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour aux utilisateurs
          </Link>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          {update ? 'Modifier l\'utilisateur' : 'Détails de l\'utilisateur'}
        </h1>
        <p className="text-muted-foreground">
          {update ? 'Modifiez les informations de l\'utilisateur' : 'Consultez les informations de l\'utilisateur'}
        </p>
      </div>
      {!update && (
        <Button asChild>
          <Link href={`/admin/users/${data.id}/edit`}>
            Modifier
          </Link>
        </Button>
      )}
    </div>

    <Separator />

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* User Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Informations de l'utilisateur</CardTitle>
          </div>
          <CardDescription>
            Informations de base sur le compte utilisateur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel htmlFor="name">Nom complet</FieldLabel>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              required
              name="name"
              value={state.name}
              readOnly={!update}
              onChange={update ? (e) => {
                setState(prev => ({ ...prev, name: e.target.value}))
              } : undefined}
              className={cn(!update && "bg-muted cursor-not-allowed")}
            />
          </Field>
          
          <Field>
            <FieldLabel htmlFor="email">Adresse email</FieldLabel>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              name="email"
              required
              value={state.email}
              readOnly={!update}
              onChange={update ? (e) => {
                setState(prev => ({ ...prev, email: e.target.value}))
              } : undefined}
              className={cn(!update && "bg-muted cursor-not-allowed")}
            />
          </Field>

          {!update && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1">
                <p className="text-sm font-medium">Date de création</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(data.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium">Dernière modification</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(data.updatedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Card - Only in edit mode */}
      {update && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Sécurité</CardTitle>
            </div>
            <CardDescription>
              Modifiez le mot de passe de l'utilisateur (optionnel)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field>
              <FieldLabel htmlFor="password">Nouveau mot de passe</FieldLabel>
              <PasswordInput
                id="password"
                value={state?.password || ''}
                onChange={(e) => {
                  setState(prev => ({ ...prev, password: e.target.value }))
                }}
                placeholder="Laisser vide pour ne pas modifier"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Laissez ce champ vide si vous ne souhaitez pas changer le mot de passe
              </p>
            </Field>
            
            {state?.password && (
              <Field>
                <FieldLabel htmlFor="confirm-password">Confirmer le mot de passe</FieldLabel>
                <PasswordInput
                  id="confirm-password"
                  value={state?.confirmPassword || ''}
                  onChange={(e) => {
                    setState(prev => ({ ...prev, confirmPassword: e.target.value }))
                  }}
                  placeholder="Confirmez le nouveau mot de passe"
                />
                {state.password !== state.confirmPassword && state.confirmPassword && (
                  <p className="text-xs text-destructive mt-1">
                    Les mots de passe ne correspondent pas
                  </p>
                )}
              </Field>
            )}
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {update && (
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/admin/users/${data.id}`)}
            disabled={isPending}
          >
            Annuler
          </Button>
          <Button 
            type="submit" 
            disabled={isPending || (state.password !== state.confirmPassword && !!state.password)}
            className="min-w-[120px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Enregistrement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Enregistrer
              </span>
            )}
          </Button>
        </div>
      )}
    </form>
  </div>
}
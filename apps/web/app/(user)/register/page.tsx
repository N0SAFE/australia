'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/components/shadcn/card';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="w-full h-dvh flex flex-col justify-center items-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <UserPlus className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Inscription sur invitation uniquement</CardTitle>
          <CardDescription className="text-base">
            L'inscription publique n'est plus disponible. 
            Vous devez recevoir une invitation d'un administrateur pour créer un compte.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-center">
              Si vous avez reçu un code d'invitation, utilisez le lien qui vous a été fourni 
              pour créer votre compte.
            </p>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          <Link href="/login" className="w-full">
            <Button className="w-full" variant="default">
              Se connecter
            </Button>
          </Link>
          <Link href="/" className="w-full">
            <Button className="w-full" variant="outline">
              Retour à l'accueil
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
'use client';

import { useState } from 'react';
import { LoginDTO } from '@/actions/login';
import toast from 'react-hot-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/ui/password-input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import z from 'zod';
import { loginSchema } from './schema';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authClient } from '@/lib/auth/index';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@repo/ui/components/shadcn/form'

export default function LoginPage() {
  const router = useRouter();
  
  const form = useForm<z.infer<typeof loginSchema>>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    })
    
    const loginMutation = useMutation({
        mutationFn: async (values: z.infer<typeof loginSchema>) => {
            return authClient.signIn.email({
                email: values.email,
                password: values.password,
            })
        },
        onSuccess: ({data, error}) => {
            if (error) {
                toast.error(error.message ?? 'Authentication failed')
            } else {
              toast.success('Connexion réussie');
              router.push('/home');
            }
        }
    })

  return <div className="w-full h-dvh flex flex-col justify-center items-center gap-8">
    <h1 className="text-5xl font-script text-pink-dark">Connexion</h1>
    <Form {...form}>
    <form onSubmit={form.handleSubmit((data) => void loginMutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                          <FormItem>
                <FormLabel htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </FormLabel>
                <FormControl>
                <div className="w-full bg-input rounded-lg">
                  <Input
                    id="email"
                    placeholder="votre@email.com"
                    type="email"
                    autoComplete="email"
                    className="w-full px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    {...field}
                  />
                </div>
                </FormControl>
                <FormMessage />
                </FormItem>
        )}
        ></FormField>
        {/* {getErrorMessage('email') && <p>
          <span className="text-sm text-red-600">{getErrorMessage('email')}</span>
        </p>} */}
      </div>

      <div className="space-y-2">
        <FormField
                                        control={form.control}
                                        name="password"
                                        render={({ field }) => (
        <FormItem>
          <FormLabel htmlFor="password" className="text-sm font-medium text-foreground">
            Mot de passe
          </FormLabel>
          <div className="w-full bg-input rounded-lg">
            <PasswordInput
              id="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...field}
            />
          </div>
          <FormMessage />
        </FormItem>
        )}
        ></FormField>
        {/* {getErrorMessage('password') && <p>
          <span className="text-sm text-red-600">{getErrorMessage('password')}</span>
        </p>} */}
      </div>

      <Button
        type="submit"
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-6 text-base font-medium"
        disabled={loginMutation.isPending}
      >
        Se connecter
      </Button>
    </form></Form>

    <div className="text-center space-y-4">
      <Link className="text-sm text-muted-foreground hover:text-foreground" href="/forgot-password">Mot de passe oublié ?</Link>

      <div className="pt-4">
        <p className="text-sm text-muted-foreground">
          Inscription sur invitation uniquement. Contactez un administrateur.
        </p>
      </div>
    </div>
  </div>;
}
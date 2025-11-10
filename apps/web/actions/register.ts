'use server';

import { z, ZodError } from "zod";
import { redirect } from 'next/navigation';
import { serverAuthClient } from '@/lib/auth/server';

const schema = z.object({
  firstname: z.string().min(1, 'Le prénom est requis'),
  lastname: z.string().min(1, 'Le nom est requis'),
  email: z.email('Email invalide').min(1, 'L\'email est requis'),
  password: z.string().min(1, 'Le mot de passe est requis'),
  confirmPassword: z.string().min(1, 'La confirmation du mot de passe est requise'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
});

export type RegisterDTO = z.infer<typeof schema>;

export type RegisterActionState = {
  errors?: ZodError<RegisterDTO>['issues'],
  data: RegisterDTO,
  toast?: {
    type: 'success' | 'error',
    message: string,
  },
}

export async function register(prevState: RegisterActionState, formData: FormData): Promise<RegisterActionState> {
  const formDataObject = Object.fromEntries(formData.entries());
  const result = schema.safeParse(formDataObject);

  if (!result.success) {
    return {
      errors: result.error.issues,
      data: prevState.data,
      toast: {
        type: 'error',
        message: 'Veuillez corriger les erreurs dans le formulaire.',
      },
    };
  }

  // Use Better Auth for registration
  const name = `${result.data.firstname} ${result.data.lastname}`;
  const authResult = await serverAuthClient.signUp.email({
    email: result.data.email,
    password: result.data.password,
    name,
  });
  
  if ('error' in authResult && authResult.error) {
    return {
      data: prevState.data,
      toast: {
        type: 'error',
        message: authResult.error?.message || 'Une erreur est survenue lors de l\'inscription.',
      },
    };
  }

  redirect('/home');

  return {
    data: prevState.data,
    toast: {
      type: 'success',
      message: 'Inscription réussie',
    }
  };

}
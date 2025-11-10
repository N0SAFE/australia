'use server';

import { z, ZodError } from "zod";
import { redirect } from 'next/navigation';
import { serverAuthClient } from '@/lib/auth/server';

const schema = z.object({
  email: z.string().email('Email invalide').min(1, 'L\'email est requis'),
  password: z.string().min(6, 'Le mot de passe est requis'),
})

export type LoginDTO = z.infer<typeof schema>;

export type LoginActionState = {
  errors?: ZodError<LoginDTO>['issues'],
  data: LoginDTO,
  toast?: {
    type: 'success' | 'error',
    message: string,
  },
  success: boolean,
}

export async function login(prevState: LoginActionState, formData: FormData): Promise<LoginActionState> {
  const formDataObject = Object.fromEntries(formData.entries());
  const result = schema.safeParse(formDataObject);

  if (result.error) {
    return {
      errors: result.error.issues,
      data: prevState.data,
      toast: {
        type: 'error',
        message: 'Veuillez corriger les erreurs dans le formulaire.',
      },
      success: false,
    };
  }

  // Use Better Auth for authentication
  const authResult = await serverAuthClient.signIn.email({
    email: result.data.email,
    password: result.data.password,
  });

  if ('error' in authResult && authResult.error) {
    return {
      data: prevState.data,
      toast: {
        type: 'error',
        message: 'Email ou mot de passe incorrect.',
      },
      success: false,
    };
  }

  // Check if user has admin role (assuming it's in the user data)
  const session = await serverAuthClient.getSession();
  const sessionData = 'data' in session ? session.data : null;
  const user = sessionData?.user;

  console.log('Login successful:', user);

  // Redirect based on user role
  if (user && 'roles' in user && Array.isArray(user.roles) && user.roles.includes('admin')) {
    redirect('/admin');
  } else {
    redirect('/home');
  }

  return {
    data: prevState.data,
    toast: {
      type: 'success',
      message: 'Connexion réussie',
    },
    success: true,
  };
}
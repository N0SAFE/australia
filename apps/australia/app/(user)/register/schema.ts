import zod from 'zod/v4'

export const registerSchema = zod.object({
    firstname: zod.string().min(1, 'Le prénom est requis'),
    lastname: zod.string().min(1, 'Le nom est requis'),
    email: zod.email('Email invalide'),
    password: zod.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
    confirmPassword: zod.string().min(1, 'La confirmation du mot de passe est requise'),
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
})

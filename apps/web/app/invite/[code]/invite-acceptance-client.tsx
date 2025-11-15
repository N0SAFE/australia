'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { authClient } from '@/lib/auth'
import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/components/shadcn/card'
import { User, UserLogin, UserAppLayoutHome } from '@/routes'

interface InviteAcceptanceClientProps {
  token: string;
  redirectUrl?: string;
}

export function InviteAcceptanceClient({ token, redirectUrl }: InviteAcceptanceClientProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValidToken, setIsValidToken] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [invitationEmail, setInvitationEmail] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  })

  useEffect(() => {
    if (!token) {
      setIsValidToken(false)
      setValidationError('Invitation token is missing')
      setIsValidating(false)
      return
    }

    const validateToken = async () => {
      try {
        const result = await orpc.invitation.check.call({
          token,
        })

        if (result.success) {
          setIsValidToken(true)
          setInvitationEmail(result.email) // Store email for auto-login
          toast.info(`Creating account for: ${result.email}`)
        } else {
          setValidationError(result.message)
        }
      } catch (error) {
        console.error("Token validation error:", error)
        setValidationError(
          "Failed to validate invitation token. Please try again."
        )
      } finally {
        setIsValidating(false)
      }
    }
    
    void validateToken()
  }, [token])

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.password) {
      toast.error('Password is required')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }

    try {
      setIsSubmitting(true)

      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            console.log('Logged out current session')
          },
          onError: (ctx) => {
            console.error('Error logging out:', ctx.error)
          },
        },
      })

      const result = await orpc.invitation.validate.call({
        token,
        password: formData.password,
        name: formData.name,
      })

      if (result.success) {
        toast.success('Account created successfully! Logging you in...')
        
        try {
          // Auto-login the user
          await authClient.signIn.email({
            email: invitationEmail,
            password: formData.password,
            fetchOptions: {
              onSuccess: () => {
                const destination = redirectUrl || UserAppLayoutHome({})
                router.push(destination)
              },
              onError: (ctx) => {
                console.error('Auto-login failed:', ctx.error)
                toast.error('Login failed. Please try logging in manually.')
                router.push(UserLogin({}))
              }
            }
          })
        } catch (error) {
          console.error('Auto-login error:', error)
          toast.error('An error occurred. Please try logging in manually.')
          router.push(UserLogin({}))
        }
      } else {
        toast.error(result.message || 'Failed to create account')
      }
    } catch (error: unknown) {
      console.error('Error creating account:', error)
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to create account')
      } else {
        toast.error('Failed to create account')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isValidating) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-muted-foreground" />
            <CardTitle>Validating Invitation</CardTitle>
            <CardDescription>
              Please wait while we validate your invitation token...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (!isValidToken) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {validationError || 'This invitation link is invalid or has expired.'}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(User({}))}
            >
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle>Welcome!</CardTitle>
          <CardDescription>
            Your invitation is valid. Please set up your account below.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 8 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <p className="text-xs text-muted-foreground">* Required fields</p>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push(User({}))}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

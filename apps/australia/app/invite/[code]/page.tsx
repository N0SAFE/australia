'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { orpc } from '@/lib/orpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@repo/ui/components/shadcn/card';
import { toast } from 'sonner';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { authClient } from '@/lib/auth';

export default function InviteAcceptancePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.code as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: '',
  });

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      try {
        setIsValidating(true);
        // Check if invitation token is valid
        const result = await orpc.invitation.check.call({
          token,
        });
        
        if (result.success) {
          setIsValidToken(true);
          // Optionally pre-fill email or show it to user
          toast.info(`Creating account for: ${result.email}`);
        } else {
          setIsValidToken(false);
          setValidationError(result.message);
        }
      } catch (error: any) {
        console.error('Error validating token:', error);
        setIsValidToken(false);
        setValidationError('Failed to validate invitation token');
      } finally {
        setIsValidating(false);
      }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.password) {
      toast.error('Password is required');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Logout current session first
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            console.log('Logged out current session');
          },
          onError: (ctx) => {
            console.error('Error logging out:', ctx.error);
          },
        },
      });
      
      // Validate invitation and create account
      const result = await orpc.invitation.validate.call({
        token,
        password: formData.password,
        name: formData.name,
      });

      if (result.success) {
        toast.success(result.message || 'Account created successfully! Please login with your new credentials.');
        // Redirect to login page
        setTimeout(() => {
          router.push('/login');
        }, 1500);
      } else {
        // Handle error case
        toast.error(result.message || 'Failed to create account');
      }
    } catch (error: any) {
      console.error('Error creating account:', error);
      toast.error(error?.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while validating
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
    );
  }

  // Show error if token is invalid
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
              onClick={() => router.push('/')}
            >
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show signup form
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

            <p className="text-xs text-muted-foreground">
              * Required fields
            </p>
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
              onClick={() => router.push('/')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

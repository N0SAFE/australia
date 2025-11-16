"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useCheckInvitation,
  useValidateInvitation,
} from "@/hooks/useInvitation";
import { useSignInEmailMutation, useSignOutMutation } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/shadcn/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@repo/ui/components/shadcn/form";
import { User, UserLogin, UserAppLayoutHome } from "@/routes";

const inviteFormSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface InviteAcceptanceClientProps {
  token: string;
  redirectUrl?: string;
}

export function InviteAcceptanceClient({
  token,
  redirectUrl,
}: InviteAcceptanceClientProps) {
  const router = useRouter();

  const checkInvitation = useCheckInvitation(token);
  const validateInvitation = useValidateInvitation();
  const signOut = useSignOutMutation();
  const signInEmail = useSignInEmailMutation();

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      name: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Show invitation email when available
  useEffect(() => {
    if (checkInvitation.data?.success) {
      toast.info(`Creating account for: ${checkInvitation.data.email}`);
    }
  }, [checkInvitation.data]);

  const handleSubmit = async (values: z.infer<typeof inviteFormSchema>) => {
    const invitationData = checkInvitation.data;
    if (!invitationData?.success) {
      toast.error("Invalid invitation");
      return;
    }

    // First, sign out any existing session
    await signOut.mutateAsync().catch((error) => {
      console.error("Error logging out:", error);
    });

    // Validate invitation and create account
    const result = await validateInvitation.mutateAsync({
      token,
      password: values.password,
      name: values.name,
    });

    if (result.success) {
      // Auto-login after successful account creation
      const { data, error } = await signInEmail.mutateAsync(
        {
          email: invitationData.email,
          password: values.password,
        },
        {
          onError: (error) => {
            console.error("Auto-login error:", error);
            toast.error("An error occurred. Please try logging in manually.");
            router.push(UserLogin({}));
          },
        },
      );
      if (error) {
        console.error("Auto-login failed:", error);
      } else {
        const destination = redirectUrl || UserAppLayoutHome({});
        router.push(destination);
      }
    }
  };

  if (checkInvitation.isLoading) {
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

  if (checkInvitation.isError || !checkInvitation.data?.success) {
    const errorMessage = checkInvitation.isError
      ? "Failed to validate invitation token. Please try again."
      : (!checkInvitation.data?.success && checkInvitation.data?.message) ||
        "This invitation link is invalid or has expired.";

    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
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
    );
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" type="text" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="At least 8 characters"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Re-enter your password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <p className="text-xs text-muted-foreground">* Required fields</p>
            </CardContent>

            <CardFooter className="flex flex-col gap-2">
              <Button
                type="submit"
                className="w-full"
                disabled={validateInvitation.isPending || signInEmail.isPending}
              >
                {validateInvitation.isPending || signInEmail.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => router.push(User({}))}
                disabled={validateInvitation.isPending || signInEmail.isPending}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

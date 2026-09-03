"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signUpAction } from "@/app/(auth)/actions";
import { initialActionState } from "@/lib/auth/action-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const [state, formAction] = useActionState(signUpAction, initialActionState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign up</CardTitle>
        <CardDescription>
          Your name is stored in Auth metadata so the profile trigger can create
          your profile.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="fullName">
              Full name
            </label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              defaultValue={state.fields?.fullName}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.fields?.email}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="confirmPassword">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {state.message ? (
            <p
              className={
                state.status === "success"
                  ? "rounded-lg border border-primary/20 bg-accent p-3 text-sm text-accent-foreground"
                  : "rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              }
            >
              {state.message}
            </p>
          ) : null}
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="h-10 w-full" type="submit" disabled={pending}>
      {pending ? "Creating account..." : "Create account"}
    </Button>
  );
}

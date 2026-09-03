"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signInAction } from "@/app/(auth)/actions";
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

type LoginFormProps = {
  nextPath: string;
  callbackError?: string;
};

export function LoginForm({ nextPath, callbackError }: LoginFormProps) {
  const [state, formAction] = useActionState(signInAction, initialActionState);
  const email = state.fields?.email ?? "";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Use your email and password to access protected workspaces.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input name="next" type="hidden" value={nextPath} />
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={email}
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
              autoComplete="current-password"
              required
            />
          </div>
          {callbackError ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              We could not complete the email confirmation. Try signing in again.
            </p>
          ) : null}
          {state.status === "error" ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

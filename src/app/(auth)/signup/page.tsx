import Link from "next/link";
import { redirect } from "next/navigation";

import { SignupForm } from "@/components/auth/signup-form";
import { getCurrentUser } from "@/lib/auth/session";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-normal">Create account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Start a secure review workspace for your data team.
        </p>
      </div>
      <div className="space-y-6">
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

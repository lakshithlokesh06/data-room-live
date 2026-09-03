import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSafeRedirectPath } from "@/lib/validation/auth";

type LoginPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const nextPath = getSafeRedirectPath(getStringParam(params.next), "/dashboard");

  if (user) {
    redirect(nextPath);
  }

  return (
    <AuthPageShell
      title="Welcome back"
      description="Sign in to continue reviewing datasets with your team."
    >
      <LoginForm
        nextPath={nextPath}
        callbackError={getStringParam(params.error)}
      />
      <p className="text-center text-sm text-muted-foreground">
        New to DataRoom Live?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Create an account
        </Link>
      </p>
    </AuthPageShell>
  );
}

function AuthPageShell({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-normal">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}

function getStringParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

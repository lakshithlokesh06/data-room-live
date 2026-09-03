const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type LoginInput = {
  email: string;
  password: string;
  next?: string | null;
};

export type SignupInput = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields: Record<string, string> };

export function validateLoginInput(input: LoginInput): ValidationResult<LoginInput> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!emailPattern.test(email)) {
    return {
      ok: false,
      message: "Enter a valid email address.",
      fields: { email },
    };
  }

  if (password.length < 8) {
    return {
      ok: false,
      message: "Password must be at least 8 characters.",
      fields: { email },
    };
  }

  return {
    ok: true,
    data: {
      email,
      password,
      next: getSafeRedirectPath(input.next, "/dashboard"),
    },
  };
}

export function validateSignupInput(
  input: SignupInput
): ValidationResult<SignupInput> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (fullName.length < 2 || fullName.length > 120) {
    return {
      ok: false,
      message: "Full name must be between 2 and 120 characters.",
      fields: { fullName, email },
    };
  }

  if (!emailPattern.test(email)) {
    return {
      ok: false,
      message: "Enter a valid email address.",
      fields: { fullName, email },
    };
  }

  if (input.password.length < 8) {
    return {
      ok: false,
      message: "Password must be at least 8 characters.",
      fields: { fullName, email },
    };
  }

  if (input.password !== input.confirmPassword) {
    return {
      ok: false,
      message: "Passwords do not match.",
      fields: { fullName, email },
    };
  }

  return {
    ok: true,
    data: {
      fullName,
      email,
      password: input.password,
      confirmPassword: input.confirmPassword,
    },
  };
}

export function getSafeRedirectPath(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  if (value.startsWith("/login") || value.startsWith("/signup")) {
    return fallback;
  }

  return value;
}

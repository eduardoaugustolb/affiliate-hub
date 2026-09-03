"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/api/authApi";
import { type LoginInput, loginSchema } from "@/features/auth/schemas/auth";
import { useSession } from "@/features/auth/session/SessionProvider";
import { ApiError } from "@/lib/api/errors";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useSession();
  const [values, setValues] = useState<LoginInput>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginInput, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof LoginInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof LoginInput;
        if (!next[field]) next[field] = issue.message;
      }
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    setError("");
    setSubmitting(true);
    try {
      await login(parsed.data);
      await refresh();
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : "Não foi possível entrar.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Entrar no painel</CardTitle>
          <CardDescription>Use seu acesso de administrador.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <AuthField
              label="E-mail"
              name="email"
              type="email"
              value={values.email}
              error={fieldErrors.email}
              onChange={(v) => setValues({ ...values, email: v })}
            />
            <AuthField
              label="Senha"
              name="password"
              type="password"
              value={values.password}
              error={fieldErrors.password}
              onChange={(v) => setValues({ ...values, password: v })}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Primeiro acesso?{" "}
              <Link className="underline" href="/setup">
                Configurar administrador
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function AuthField({
  label,
  name,
  type,
  value,
  error,
  onChange,
}: {
  label: string;
  name: string;
  type: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

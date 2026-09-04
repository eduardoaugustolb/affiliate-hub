'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type FormEvent, type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { setup } from '@/features/auth/api/authApi'
import { type SetupInput, setupSchema } from '@/features/auth/schemas/auth'
import { ApiError } from '@/lib/api/errors'

export default function SetupAdminPage() {
  const router = useRouter()
  const [values, setValues] = useState<SetupInput>({
    name: '',
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Partial<Record<keyof SetupInput, string>>>({})
  const [apiError, setApiError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const result = setupSchema.safeParse(values)
    if (!result.success) {
      const nextErrors: Partial<Record<keyof SetupInput, string>> = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof SetupInput
        if (!nextErrors[field]) nextErrors[field] = issue.message
      }
      setErrors(nextErrors)
      return
    }
    setErrors({})
    setApiError('')
    setSubmitting(true)
    try {
      await setup(result.data)
      router.replace('/login?setup=complete')
    } catch (error) {
      setApiError(
        error instanceof ApiError ? error.message : 'Não foi possível concluir o cadastro.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthCard title="Configurar administrador" description="Crie o primeiro acesso ao painel.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <AuthField
          label="Nome"
          name="name"
          value={values.name}
          onChange={(value) => setValues({ ...values, name: value })}
          error={errors.name}
        />
        <AuthField
          label="E-mail"
          name="email"
          type="email"
          value={values.email}
          onChange={(value) => setValues({ ...values, email: value })}
          error={errors.email}
        />
        <AuthField
          label="Senha"
          name="password"
          type="password"
          value={values.password}
          onChange={(value) => setValues({ ...values, password: value })}
          error={errors.password}
        />
        {apiError && (
          <p role="alert" className="text-sm text-destructive">
            {apiError}
          </p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Criando...' : 'Criar acesso'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já possui acesso?{' '}
        <Link className="underline" href="/login">
          Entrar
        </Link>
      </p>
    </AuthCard>
  )
}

function AuthCard({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter />
      </Card>
    </main>
  )
}

function AuthField({
  label,
  name,
  value,
  onChange,
  error,
  type = 'text',
}: {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  error?: string
  type?: string
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
        aria-describedby={error ? `${name}-error` : undefined}
        autoComplete={name === 'password' ? 'new-password' : name}
      />
      {error && (
        <p id={`${name}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

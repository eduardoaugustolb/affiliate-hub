"use client";

import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/features/auth/components/ProtectedRoute";
import { useSession } from "@/features/auth/session/SessionProvider";

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}

function Dashboard() {
  const { user, logout } = useSession();
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 p-8">
      <header className="flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-sm text-muted-foreground">Affiliate Hub</p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
        </div>
        <Button variant="outline" onClick={() => void logout()}>
          Sair
        </Button>
      </header>
      <section>
        <h2 className="text-xl font-medium">Olá, {user?.name}</h2>
        <p className="text-muted-foreground">
          Sua sessão está ativa. Escolha uma área para começar.
        </p>
      </section>
    </main>
  );
}

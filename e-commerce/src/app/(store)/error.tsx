"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section className="min-h-[65svh] py-16" role="alert">
      <h1 className="max-w-3xl text-4xl tracking-tight md:text-6xl">
        Não foi possível carregar os detalhes.
      </h1>
      <p className="my-6 text-sm text-muted">
        Tente novamente em alguns instantes.
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <Button onClick={retry}>Tentar novamente</Button>
        <Link
          href="/#pecas"
          scroll={false}
          className="text-sm underline underline-offset-4"
        >
          Voltar ao catálogo
        </Link>
      </div>
    </section>
  );
}

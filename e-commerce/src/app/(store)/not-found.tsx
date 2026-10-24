import Link from "next/link";
export default function NotFound() {
  return (
    <section className="min-h-[65svh] py-16">
      <p className="mb-5 text-xs uppercase tracking-[0.16em] text-muted">
        Não encontrado / 404
      </p>
      <h1 className="max-w-3xl text-[clamp(2.5rem,6vw,6rem)] leading-none tracking-[-0.05em]">
        Esta peça saiu de cena.
      </h1>
      <p className="mb-8 mt-6 text-sm text-muted">
        O código pode estar incorreto ou o item não está mais disponível.
      </p>
      <Link
        href="/#pecas"
        scroll={false}
        className="inline-flex min-h-12 items-center border-b border-bone text-sm"
      >
        Explorar o catálogo ↗
      </Link>
    </section>
  );
}

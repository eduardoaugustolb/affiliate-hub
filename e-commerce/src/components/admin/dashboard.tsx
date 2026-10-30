"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  deleteProductAction,
  loginAction,
  logoutAction,
  saveProductAction,
} from "@/app/admin/actions";
import { useScrollLock } from "@/components/providers/smooth-scroll";
import { BrandIcon } from "@/components/ui/brand-icon";
import { BrandLoader } from "@/components/ui/brand-loader";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { TextField } from "@/components/ui/text-field";
import {
  type AdminData,
  AdminError,
  actionRequest,
  type Product,
} from "@/lib/admin";
import type { BrandIconName } from "@/lib/brand-icons";
import type { InstagramData } from "@/lib/instagram";
import { CatalogAdmin } from "./catalog-admin";
import { adminControlClasses } from "./control-styles";
import { InstagramAdmin } from "./instagram-admin";
import { ProductEditor } from "./product-editor";
import { ProductTable } from "./product-table";

const sections: { key: string; label: string; icon: BrandIconName }[] = [
  { key: "products", label: "Produtos", icon: "bag" },
  { key: "filters", label: "Filtros", icon: "filter" },
  { key: "outfits", label: "Outfits", icon: "layers" },
  { key: "instagram", label: "Instagram", icon: "heart" },
];

function CatalogOverview({
  products,
  offset,
}: {
  products: Product[];
  offset: number;
}) {
  const active = products.filter(
    (product) => product.status === "active",
  ).length;
  const marketplaces = [
    ...new Set(products.map((product) => product.marketplace)),
  ];
  return (
    <section
      className="my-8 grid grid-cols-2 gap-[1.1rem] max-[700px]:gap-3 min-[1100px]:grid-cols-[1fr_1fr_1.5fr] [&_h2]:font-display [&_h2]:text-[1.1rem] [&_h2]:leading-snug [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-[#a5a8a0]"
      aria-label={`Resumo da página ${offset / 25 + 1}`}
    >
      <div className="min-w-0 rounded-3xl border border-white/7 bg-[#20211f] p-6 max-[640px]:p-[1.15rem] flex min-h-52 flex-col gap-4 max-[1100px]:min-h-48 max-[640px]:min-h-44">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2>Produtos nesta página</h2>
          <BrandIcon name="bag" />
        </div>
        <strong className="mt-auto block font-display text-[4.6rem] leading-none text-[#b9f879] max-[700px]:text-[3.5rem]">
          {products.length.toString().padStart(2, "0")}
        </strong>
        <span className="text-[#a5a8a0]">
          Página {offset / 25 + 1} do catálogo
        </span>
      </div>
      <div className="min-w-0 rounded-3xl border border-white/7 bg-[#20211f] p-6 max-[640px]:p-[1.15rem] flex min-h-52 flex-col gap-4 max-[1100px]:min-h-48 max-[640px]:min-h-44">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2>Disponibilidade</h2>
          <BrandIcon name="check" />
        </div>
        <div className="mt-auto flex gap-10 max-[700px]:gap-5 max-[640px]:gap-4 [&_strong]:block [&_strong]:font-display [&_strong]:text-5xl [&_strong]:leading-[1.1] max-[700px]:[&_strong]:text-[2.5rem] max-[640px]:[&_strong]:text-4xl [&_span]:mt-1 [&_span]:flex [&_span]:items-center [&_span]:gap-1.5 [&_span]:text-xs [&_span]:text-[#a5a8a0] [&_i]:size-1.5 [&_i]:rounded-full [&_i]:bg-[#b9f879] [&>div+div_i]:bg-[#ffa631]">
          <div>
            <strong>{active}</strong>
            <span>
              <i />
              Ativos
            </span>
          </div>
          <div>
            <strong>{products.length - active}</strong>
            <span>
              <i />
              Inativos
            </span>
          </div>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-[#ffa631]/30"
          aria-hidden="true"
        >
          <progress
            value={active}
            max={products.length || 1}
            className="block h-full w-full appearance-none border-0 bg-transparent [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#b9f879] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#b9f879]"
          />
        </div>
      </div>
      <div className="min-w-0 rounded-3xl border border-white/7 bg-[#20211f] p-6 max-[640px]:p-[1.15rem] col-span-full flex flex-col gap-5 min-[1100px]:col-span-1">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <h2>Distribuição por marketplace</h2>
          <BrandIcon name="grid" />
        </div>
        {marketplaces.length ? (
          marketplaces.map((marketplace) => {
            const count = products.filter(
              (product) => product.marketplace === marketplace,
            ).length;
            return (
              <div
                className="grid grid-cols-[5.5rem_minmax(0,1fr)_1.5rem] items-center gap-3 text-xs [&>span]:wrap-anywhere [&>span]:capitalize [&_strong]:text-right"
                key={marketplace}
              >
                <span>{marketplace}</span>
                <progress
                  aria-hidden="true"
                  value={count}
                  max={products.length || 1}
                  className="block h-6 w-full appearance-none overflow-hidden rounded-full border-0 bg-white/3 [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#b9f879] [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-[#b9f879]"
                />
                <strong>{count}</strong>
              </div>
            );
          })
        ) : (
          <p className="text-[#a5a8a0]">
            Os marketplaces aparecem ao cadastrar produtos.
          </p>
        )}
        <p className="text-[#a5a8a0] mt-auto text-[0.65rem]">
          Resumo dos produtos exibidos nesta página.
        </p>
      </div>
    </section>
  );
}

export function AdminDashboard({
  data,
  section,
  instagram,
}: {
  data: AdminData;
  section: "products" | "filters" | "outfits" | "instagram";
  instagram?: InstagramData;
}) {
  const { user, products, offset, editor } = data;
  const tab = section;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);
  useScrollLock(pending || busy);
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Product | null>(null);
  const refresh = () => startTransition(() => router.refresh());
  function navigate(values: {
    tab?: string;
    offset?: number;
    edit?: string;
    outfit?: string;
  }) {
    const query = new URLSearchParams();
    const section = values.tab ?? tab;
    if (values.offset) query.set("offset", String(values.offset));
    if (values.edit) query.set("edit", values.edit);
    if (values.outfit) query.set("outfit", values.outfit);
    setError("");
    startTransition(() =>
      router.push(`/admin/${section}${query.size ? `?${query}` : ""}`, {
        scroll: false,
      }),
    );
  }
  function fail(reason: unknown) {
    setError(
      reason instanceof Error
        ? reason.message
        : "Falha na conexão. Tente novamente.",
    );
    if (reason instanceof AdminError && reason.status === 401) refresh();
  }
  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    try {
      await actionRequest(
        loginAction({
          email: fields.get("email"),
          password: fields.get("password"),
        }),
      );
      setNotice("");
      refresh();
    } catch (reason) {
      if (reason instanceof AdminError && reason.status === 401)
        setError("E-mail ou senha inválidos.");
      else fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await actionRequest(logoutAction());
      setNotice("");
      setDeleting(null);
      navigate({ tab: "products" });
      refresh();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const fields = new FormData(event.currentTarget);
    const body = {
      optionIds: fields.getAll("optionIds"),
      imageUrls: [
        String(fields.get("imageUrl") ?? "").trim(),
        ...String(fields.get("additionalImageUrls") ?? "")
          .split(/\r?\n/)
          .map((url) => url.trim())
          .filter(Boolean),
      ],
      ...Object.fromEntries(
        ["name", "marketplace", "destinationUrl", "imageUrl", "status"].map(
          (key) => [key, String(fields.get(key)).trim()],
        ),
      ),
    };
    try {
      await actionRequest(
        saveProductAction(editor === "new" ? null : editor?.code, body),
      );
      setNotice("Produto salvo.");
      navigate({ offset });
      refresh();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await actionRequest(deleteProductAction(deleting.code));
      setDeleting(null);
      setNotice("Produto excluído. O código permanece reservado.");
      refresh();
    } catch (reason) {
      fail(reason);
    } finally {
      setBusy(false);
    }
  }
  const disabled = busy || pending;
  return (
    <div
      className={`min-h-dvh min-w-0 bg-[#080908] text-[#f5f6f0] ${adminControlClasses}`}
    >
      {(pending || busy) && <BrandLoader overlay />}
      <header className="relative flex min-h-24 flex-wrap items-center justify-between gap-8 px-8 py-6 max-[1100px]:gap-4 max-[1100px]:p-5 max-[640px]:min-h-20 max-[640px]:flex-nowrap max-[640px]:gap-2.5 max-[640px]:p-4">
        <a
          href="/"
          className="flex items-center gap-3 font-display text-[1.4rem] leading-none [&>span:last-child]:max-[1100px]:hidden [&>span:last-child]:max-[640px]:inline [&>span:last-child]:max-[640px]:text-lg"
        >
          <span
            className="grid size-[2.65rem] place-items-center rounded-full bg-[#f5f6f0] text-[1.6rem] text-[#080908] max-[640px]:size-9 max-[640px]:text-[1.35rem]"
            aria-hidden="true"
          >
            BH
          </span>
          <span>BLACK HEM</span>
        </a>
        {user && (
          <div className="mr-auto flex items-center gap-2.5 max-[640px]:hidden [&_svg]:size-4">
            <span className="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-[#20211f] px-4 py-2.5 text-xs text-[#b9f879]">
              <BrandIcon name="grid" /> Catálogo
            </span>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-full bg-[#20211f] px-4 py-2.5 text-xs"
            >
              <BrandIcon name="external-link" /> Ver loja
            </Link>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 text-[0.8rem] max-[640px]:hidden">
          <span className="text-[#a5a8a0] hidden">Administração</span>
          {user && (
            <>
              <span className="inline-flex min-w-0 items-center gap-2.5 wrap-anywhere">
                <span
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-[#30342a] font-semibold text-[#b9f879]"
                  aria-hidden="true"
                >
                  {user.name.slice(0, 1)}
                </span>
                {user.name}
              </span>
              <Button variant="outline" disabled={disabled} onClick={logout}>
                Sair
              </Button>
            </>
          )}
        </div>
        {user && (
          <div className="ml-auto hidden max-[640px]:block">
            <Button
              ref={menuToggle}
              variant="text"
              className="min-h-11! min-w-11! p-2!"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={menuOpen}
              aria-controls="admin-mobile-navigation"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden="true"
              >
                {menuOpen ? (
                  <path d="m6 6 12 12M6 18 18 6" />
                ) : (
                  <path d="M3 7h18M3 12h18M3 17h18" />
                )}
              </svg>
            </Button>
            <div
              id="admin-mobile-navigation"
              className="group invisible pointer-events-none absolute inset-x-0 top-full z-40 grid grid-rows-[0fr] rounded-b-3xl bg-[#20211f] opacity-0 shadow-[0_1rem_2rem_#0006] transition-[grid-template-rows,opacity,visibility] duration-300 ease-out data-[open=true]:visible data-[open=true]:pointer-events-auto data-[open=true]:grid-rows-[1fr] data-[open=true]:opacity-100 motion-reduce:transition-none"
              data-open={menuOpen}
              aria-hidden={!menuOpen}
              inert={!menuOpen}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="-translate-y-2 border-b border-white/12 p-4 transition-transform duration-300 group-data-[open=true]:translate-y-0 motion-reduce:transition-none [&_nav]:grid [&_nav]:gap-1 [&_nav>a]:flex [&_nav>a]:min-h-11 [&_nav>a]:items-center [&_nav>a]:rounded-2xl [&_nav>a]:p-3 [&_nav>button]:justify-start! [&_nav>button]:px-3! [&_nav_[aria-current=page]]:rounded-2xl! [&_nav_[aria-current=page]]:bg-[#b9f879]/10! [&_nav_[aria-current=page]]:text-[#b9f879]! [&_nav_[aria-current=page]]:opacity-100!">
                  <nav aria-label="Menu do admin">
                    {[
                      ["products", "Produtos"],
                      ["filters", "Filtros"],
                      ["outfits", "Outfits"],
                      ["instagram", "Instagram"],
                    ].map(([key, label]) =>
                      pathname === `/admin/${key}` ? (
                        <Button
                          key={key}
                          variant="text"
                          disabled
                          aria-current="page"
                        >
                          {label}
                        </Button>
                      ) : (
                        <Link
                          key={key}
                          href={`/admin/${key}`}
                          onClick={() => setMenuOpen(false)}
                        >
                          {label}
                        </Link>
                      ),
                    )}
                    <Link href="/">Ver loja ↗</Link>
                  </nav>
                  <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/12 pt-4">
                    <span className="inline-flex min-w-0 items-center gap-2.5 wrap-anywhere">
                      {user.name}
                    </span>
                    <Button
                      variant="outline"
                      disabled={disabled}
                      onClick={logout}
                    >
                      Sair
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>
      <main
        id="conteudo"
        className={`mx-auto min-w-0 max-w-[1680px] px-8 pt-6 pb-16 max-[1100px]:px-5 max-[1100px]:pt-5 max-[1100px]:pb-12 max-[640px]:px-4 max-[640px]:pt-4 ${user ? "min-[1100px]:pl-32 min-[640px]:max-[1099px]:pl-26" : ""}`}
      >
        {!user ? (
          <Reveal
            as="section"
            className="mx-auto mt-[7vh] max-w-[460px] [&_h1]:my-4 min-w-0 rounded-3xl border border-white/7 bg-[#20211f] p-6 max-[640px]:p-[1.15rem] grid min-w-0 gap-5 [&>*]:min-w-0"
          >
            <div>
              <p className="text-[#a5a8a0]">Área restrita</p>
              <h1 className="font-display text-[clamp(2.6rem,4vw,4rem)] leading-none tracking-[-0.025em] max-[640px]:text-[2.7rem]">
                Seu catálogo.
              </h1>
              <p className="text-[#a5a8a0]">
                Entre para gerenciar produtos, filtros e outfits.
              </p>
            </div>
            {(error || data.error) && (
              <p
                role="alert"
                className="block rounded-2xl border border-[#b9f879]/25 bg-[#b9f879]/3 p-4 wrap-anywhere [&[role=alert]]:border-[#ffa631]/40 [&[role=alert]]:bg-[#ffa631]/3 [&[role=alert]]:text-[#ffd6a0]"
              >
                {error || data.error}
              </p>
            )}
            <form onSubmit={login} className="grid min-w-0 gap-5 [&>*]:min-w-0">
              <TextField
                label="E-mail"
                required
                name="email"
                type="email"
                autoComplete="username"
              />
              <TextField
                label="Senha"
                required
                name="password"
                type="password"
                autoComplete="current-password"
              />
              <Button type="submit" disabled={disabled}>
                {busy ? "Entrando…" : "Entrar"}
              </Button>
            </form>
            {data.error && (
              <Button variant="text" onClick={refresh}>
                Tentar novamente
              </Button>
            )}
            <a href="/">Voltar para a loja ↗</a>
          </Reveal>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div>
                <nav
                  aria-label="Breadcrumb"
                  className="text-[0.7rem] text-[#a5a8a0] [&_ol]:mb-[1.1rem] [&_ol]:flex [&_ol]:list-none [&_ol]:flex-wrap [&_ol]:items-center [&_ol]:gap-2 [&_ol]:p-0 [&_li]:inline-flex [&_li]:items-center [&_li]:gap-2 [&_li+li]:before:content-['/'] [&_li+li]:before:opacity-50 [&_a:hover]:text-[#ece9e2] [&_a:hover]:underline [&_[aria-current=page]]:text-[#ece9e2]"
                >
                  <ol>
                    <li>
                      <Link href="/">BLACK HEM</Link>
                    </li>
                    <li>
                      <Link href="/admin">Administração</Link>
                    </li>
                    <li>
                      <Link
                        href={`/admin/${tab}`}
                        aria-current={
                          editor || data.outfit ? undefined : "page"
                        }
                      >
                        {
                          {
                            products: "Gestão de produtos",
                            filters: "Filtros",
                            outfits: "Outfits",
                            instagram: "Instagram",
                          }[tab]
                        }
                      </Link>
                    </li>
                    {(editor || data.outfit) && (
                      <li aria-current="page">
                        {editor === "new"
                          ? "Novo produto"
                          : editor
                            ? `Editar ${editor.name}`
                            : data.outfit?.name}
                      </li>
                    )}
                  </ol>
                </nav>
                <h1 className="font-display text-[clamp(2.6rem,4vw,4rem)] leading-none tracking-[-0.025em] max-[640px]:text-[2.7rem]">
                  {
                    {
                      products: "Seu catálogo",
                      filters: "Organize as peças",
                      outfits: "Crie combinações",
                      instagram: "Converse com seu público",
                    }[tab]
                  }
                </h1>
                <p className="text-[#a5a8a0] mt-3 text-[0.85rem] max-[640px]:text-[0.8rem] max-[640px]:leading-relaxed">
                  {
                    {
                      products: "Uma visão das peças que compõem a BLACK HEM.",
                      filters: "Tamanhos e cores para encontrar a peça certa.",
                      outfits: "Seleções de peças com a sua curadoria.",
                      instagram: "Leve os outfits do feed para a conversa.",
                    }[tab]
                  }
                </p>
              </div>
            </div>
            <nav
              aria-label="Seções do admin"
              className="absolute top-[9.4rem] left-8 flex flex-col gap-4 max-[1100px]:left-5 max-[640px]:hidden [&_.app-button]:grid! [&_.app-button]:size-[3.2rem]! [&_.app-button]:min-h-[3.2rem]! [&_.app-button]:place-items-center! [&_.app-button]:rounded-full! [&_.app-button]:border-0! [&_.app-button]:bg-[#20211f]! [&_.app-button]:p-3! [&_.app-button]:text-[#d2d5cb]! [&_.app-button-label]:justify-center [&_.app-button[aria-current=page]]:cursor-default! [&_.app-button[aria-current=page]]:bg-[#b9f879]! [&_.app-button[aria-current=page]]:text-[#10160a]! [&_.app-button[aria-current=page]]:opacity-100!"
            >
              {sections.map(({ key, label, icon }) =>
                pathname === `/admin/${key}` ? (
                  <Button
                    key={key}
                    variant="outline"
                    disabled
                    aria-current="page"
                    title={label}
                  >
                    <BrandIcon name={icon} />
                    <span className="sr-only">{label}</span>
                  </Button>
                ) : (
                  <Link
                    href={`/admin/${key}`}
                    scroll={false}
                    className="app-button app-button--outline"
                    key={key}
                    title={label}
                    onClick={() => {
                      setDeleting(null);
                      setNotice("");
                      setError("");
                    }}
                  >
                    <BrandIcon name={icon} />
                    <span className="sr-only">{label}</span>
                  </Link>
                ),
              )}
            </nav>
            {(error || data.error) && (
              <div
                role="alert"
                className="block rounded-2xl border border-[#b9f879]/25 bg-[#b9f879]/3 p-4 wrap-anywhere [&[role=alert]]:border-[#ffa631]/40 [&[role=alert]]:bg-[#ffa631]/3 [&[role=alert]]:text-[#ffd6a0]"
              >
                <p>{error || data.error}</p>
                <Button
                  variant="text"
                  onClick={() => {
                    setError("");
                    refresh();
                  }}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {notice && (
              <output className="block rounded-2xl border border-[#b9f879]/25 bg-[#b9f879]/3 p-4 wrap-anywhere [&[role=alert]]:border-[#ffa631]/40 [&[role=alert]]:bg-[#ffa631]/3 [&[role=alert]]:text-[#ffd6a0]">
                {notice}
              </output>
            )}
            {tab === "products" && !data.error && !editor && (
              <CatalogOverview products={products} offset={offset} />
            )}
            {tab === "products" ? (
              <Reveal
                className="grid min-w-0 gap-5 [&>*]:min-w-0"
                transitionKey={`${tab}-${offset}-${editor === "new" ? "new" : (editor?.code ?? "")}`}
              >
                <div
                  className="flex flex-wrap items-center gap-3 justify-between max-[1100px]:items-start max-[1100px]:gap-4 max-[640px]:flex-col max-[640px]:items-stretch [&_h2]:font-display [&_h2]:text-[1.9rem] [&_p]:mt-1 [&_p]:text-[0.8rem]"
                  data-enter
                >
                  <div>
                    <h2 className="text-2xl">Produtos</h2>
                    <p className="text-[#a5a8a0]">
                      Cadastre peças e mantenha seus links atualizados.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="outline"
                      disabled={disabled}
                      onClick={refresh}
                    >
                      Atualizar
                    </Button>
                    <Button
                      disabled={disabled}
                      onClick={() => {
                        setDeleting(null);
                        navigate({ offset, edit: "new" });
                      }}
                    >
                      + Novo produto
                    </Button>
                  </div>
                </div>
                {editor && (
                  <ProductEditor
                    key={editor === "new" ? "new" : editor.code}
                    product={editor}
                    filters={data.filters}
                    optionIds={data.optionIds}
                    busy={disabled}
                    onSave={save}
                    onCancel={() => navigate({ offset })}
                  />
                )}
                {deleting && (
                  <Reveal
                    as="section"
                    className="min-w-0 rounded-3xl border border-white/7 bg-[#20211f] p-6 max-[640px]:p-[1.15rem] grid min-w-0 gap-5 [&>*]:min-w-0"
                    aria-label="Confirmar exclusão"
                  >
                    <h2>
                      Excluir {deleting.name} ({deleting.code})?
                    </h2>
                    <p>
                      Esta ação exclui o produto definitivamente. Seu código não
                      poderá ser reutilizado. Para retirar a peça da loja, você
                      também pode editar e marcar como inativa.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        disabled={disabled}
                        onClick={remove}
                      >
                        Confirmar exclusão
                      </Button>
                      <Button
                        variant="outline"
                        disabled={disabled}
                        onClick={() => setDeleting(null)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </Reveal>
                )}
                <div className="min-w-0 rounded-3xl border border-white/7 bg-[#20211f] p-6 max-[640px]:p-[1.15rem] max-[1100px]:border-0 max-[1100px]:bg-transparent max-[1100px]:p-0">
                  <ProductTable
                    products={products}
                    onEdit={(product) => {
                      setDeleting(null);
                      navigate({ offset, edit: product.code });
                    }}
                    onDelete={setDeleting}
                  />
                  <div className="flex flex-wrap items-center gap-3 justify-between border-t border-white/7 pt-4 text-xs mt-6">
                    <span className="text-[#a5a8a0]">
                      Página {offset / 25 + 1} · {products.length}{" "}
                      {products.length === 1 ? "produto" : "produtos"}
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        disabled={offset === 0 || disabled}
                        onClick={() =>
                          navigate({ offset: Math.max(0, offset - 25) })
                        }
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        disabled={products.length < 25 || disabled}
                        onClick={() => navigate({ offset: offset + 25 })}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              </Reveal>
            ) : tab === "instagram" ? (
              instagram && <InstagramAdmin data={instagram} onError={fail} />
            ) : (
              <CatalogAdmin
                key={`${tab}-${data.outfit?.code ?? ""}`}
                section={tab}
                filters={data.filters}
                outfit={data.outfit}
                onRefresh={refresh}
                onNavigate={(outfit) => navigate({ tab: "outfits", outfit })}
                onError={fail}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

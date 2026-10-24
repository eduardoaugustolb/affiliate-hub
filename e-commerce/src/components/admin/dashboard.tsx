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
import { CatalogAdmin } from "./catalog-admin";
import { ProductEditor } from "./product-editor";
import { ProductTable } from "./product-table";

const sections: { key: string; label: string; icon: BrandIconName }[] = [
  { key: "products", label: "Produtos", icon: "bag" },
  { key: "filters", label: "Filtros", icon: "filter" },
  { key: "outfits", label: "Outfits", icon: "layers" },
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
      className="admin-overview"
      aria-label={`Resumo da página ${offset / 25 + 1}`}
    >
      <div className="admin-panel admin-metric">
        <div className="admin-row admin-between">
          <h2>Produtos nesta página</h2>
          <BrandIcon name="bag" />
        </div>
        <strong className="admin-metric-value">
          {products.length.toString().padStart(2, "0")}
        </strong>
        <span className="admin-muted">
          Página {offset / 25 + 1} do catálogo
        </span>
      </div>
      <div className="admin-panel admin-metric">
        <div className="admin-row admin-between">
          <h2>Disponibilidade</h2>
          <BrandIcon name="check" />
        </div>
        <div className="admin-status-counts">
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
        <div className="admin-status-track" aria-hidden="true">
          <span
            style={{
              width: `${products.length ? (active / products.length) * 100 : 0}%`,
            }}
          />
        </div>
      </div>
      <div className="admin-panel admin-marketplaces">
        <div className="admin-row admin-between">
          <h2>Distribuição por marketplace</h2>
          <BrandIcon name="grid" />
        </div>
        {marketplaces.length ? (
          marketplaces.map((marketplace) => {
            const count = products.filter(
              (product) => product.marketplace === marketplace,
            ).length;
            return (
              <div className="admin-marketplace-row" key={marketplace}>
                <span>{marketplace}</span>
                <div aria-hidden="true">
                  <span
                    style={{ width: `${(count / products.length) * 100}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            );
          })
        ) : (
          <p className="admin-muted">
            Os marketplaces aparecem ao cadastrar produtos.
          </p>
        )}
        <p className="admin-muted admin-summary-note">
          Resumo dos produtos exibidos nesta página.
        </p>
      </div>
    </section>
  );
}

export function AdminDashboard({
  data,
  section,
}: {
  data: AdminData;
  section: "products" | "filters" | "outfits";
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
    <div className={`admin${user ? " admin-authenticated" : ""}`}>
      {(pending || busy) && <BrandLoader overlay />}
      <header className="admin-header">
        <a href="/" className="admin-brand">
          <span className="admin-monogram" aria-hidden="true">
            BH
          </span>
          <span>BLACK HEM</span>
        </a>
        {user && (
          <div className="admin-header-links">
            <span className="admin-workspace">
              <BrandIcon name="grid" /> Catálogo
            </span>
            <Link href="/" className="admin-store-link">
              <BrandIcon name="external-link" /> Ver loja
            </Link>
          </div>
        )}
        <div className="admin-row admin-desktop-account">
          <span className="admin-muted admin-context">Administração</span>
          {user && (
            <>
              <span className="admin-user">
                <span className="admin-avatar" aria-hidden="true">
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
          <div className="admin-mobile-menu">
            <Button
              ref={menuToggle}
              variant="text"
              className="admin-menu-toggle"
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
              className="admin-menu-panel"
              data-open={menuOpen}
              aria-hidden={!menuOpen}
              inert={!menuOpen}
            >
              <div className="admin-menu-clip">
                <div className="admin-menu-content">
                  <nav aria-label="Menu do admin">
                    {[
                      ["products", "Produtos"],
                      ["filters", "Filtros"],
                      ["outfits", "Outfits"],
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
                  <div className="admin-menu-account">
                    <span className="admin-user">{user.name}</span>
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
      <main id="conteudo" className="admin-main">
        {!user ? (
          <Reveal as="section" className="admin-login admin-panel admin-stack">
            <div>
              <p className="admin-muted">Área restrita</p>
              <h1 className="admin-title">Seu catálogo.</h1>
              <p className="admin-muted">
                Entre para gerenciar produtos, filtros e outfits.
              </p>
            </div>
            {(error || data.error) && (
              <p role="alert" className="admin-notice">
                {error || data.error}
              </p>
            )}
            <form onSubmit={login} className="admin-stack">
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
            <div className="admin-row admin-between">
              <div>
                <nav aria-label="Breadcrumb" className="admin-breadcrumb">
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
                <h1 className="admin-title">
                  {
                    {
                      products: "Seu catálogo",
                      filters: "Organize as peças",
                      outfits: "Crie combinações",
                    }[tab]
                  }
                </h1>
                <p className="admin-muted admin-page-description">
                  {
                    {
                      products: "Uma visão das peças que compõem a BLACK HEM.",
                      filters: "Tamanhos e cores para encontrar a peça certa.",
                      outfits: "Seleções de peças com a sua curadoria.",
                    }[tab]
                  }
                </p>
              </div>
            </div>
            <nav aria-label="Seções do admin" className="admin-sections">
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
                    <span className="admin-nav-label">{label}</span>
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
                    <span className="admin-nav-label">{label}</span>
                  </Link>
                ),
              )}
            </nav>
            {(error || data.error) && (
              <div role="alert" className="admin-notice">
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
            {notice && <output className="admin-notice">{notice}</output>}
            {tab === "products" && !data.error && !editor && (
              <CatalogOverview products={products} offset={offset} />
            )}
            {tab === "products" ? (
              <Reveal
                className="admin-stack"
                transitionKey={`${tab}-${offset}-${editor === "new" ? "new" : (editor?.code ?? "")}`}
              >
                <div
                  className="admin-row admin-between admin-products-toolbar"
                  data-enter
                >
                  <div>
                    <h2 className="text-2xl">Produtos</h2>
                    <p className="admin-muted">
                      Cadastre peças e mantenha seus links atualizados.
                    </p>
                  </div>
                  <div className="admin-row">
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
                    className="admin-panel admin-stack"
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
                    <div className="admin-row">
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
                <div className="admin-panel admin-products-panel">
                  <ProductTable
                    products={products}
                    onEdit={(product) => {
                      setDeleting(null);
                      navigate({ offset, edit: product.code });
                    }}
                    onDelete={setDeleting}
                  />
                  <div className="admin-row admin-between admin-pagination mt-6">
                    <span className="admin-muted">
                      Página {offset / 25 + 1} · {products.length}{" "}
                      {products.length === 1 ? "produto" : "produtos"}
                    </span>
                    <div className="admin-row">
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

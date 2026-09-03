import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  getSession,
  login,
  logout,
  setup,
} from "../src/features/auth/api/authApi";

describe("auth API", () => {
  const originalFetch = globalThis.fetch;
  const fetchMock = mock(async () => new Response(null, { status: 204 }));

  beforeEach(() => {
    fetchMock.mockClear();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("posts setup data and lets the API set the session cookie", async () => {
    await setup({
      name: "Admin",
      email: "admin@example.com",
      password: "secret1",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/admin/setup",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });

  it("uses the session endpoints for login, loading and logout", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: { id: "1" } }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    await login({ email: "admin@example.com", password: "secret1" });
    await getSession();
    await logout();
    const urls = (fetchMock.mock.calls as unknown as Array<[string]>).map(
      ([url]) => url,
    );
    expect(urls).toEqual([
      "http://localhost:3001/session",
      "http://localhost:3001/session",
      "http://localhost:3001/session/logout",
    ]);
  });
});

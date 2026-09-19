import type { Role, Profile } from "../lib/types";
import { first, run, setting, rateLimit } from "./db";
export type Actor = {
  userId: string;
  role: Role;
  demo: boolean;
  scope: string;
  cookie?: string;
};
const cookieValue = (req: Request, key: string) =>
  req.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(key + "="))
    ?.slice(key.length + 1);
export const cookie = (req: Request, value: string, age = 2592000) =>
  `yatra_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`;
export async function digest(value: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const initialProfile = (
  name = "Rahul Sharma",
  email = "rahul@example.com",
): Profile => ({
  name,
  email,
  phone: "",
  city: "Delhi",
  language: "English",
  food: "Vegetarian",
  transport: "Mixed transport",
  pace: "Balanced",
  interests: ["History", "Food", "Culture"],
  accessibility: [],
  emergencyContact: "",
  notifications: false,
});
export async function newSession(
  req: Request,
  userId: string,
  demo: boolean,
  role: Role,
  name?: string,
  email?: string,
  remember = false,
) {
  const now = new Date().toISOString();
  await run(
    "INSERT INTO users (id,role,profile,created_at,onboarding) VALUES (?,?,?,?,0) ON CONFLICT(id) DO NOTHING",
    userId,
    role,
    JSON.stringify(initialProfile(name, email)),
    now,
  );
  const existing = await first<{ role: Role }>(
    "SELECT role FROM users WHERE id = ?",
    userId,
  );
  const token = crypto.randomUUID() + crypto.randomUUID();
  const actualRole = demo ? role : existing!.role;
  await run(
    "INSERT INTO sessions (id,user_id,role,demo,expires) VALUES (?,?,?,?,?)",
    await digest(token),
    userId,
    actualRole,
    demo ? 1 : 0,
    Date.now() + (demo || remember ? 2592000000 : 86400000),
  );
  return {
    actor: {
      userId,
      role: actualRole,
      demo,
      scope: demo ? userId : "production",
    },
    cookie: cookie(req, token, demo || remember ? 2592000 : 86400),
  };
}
export async function actor(req: Request): Promise<Actor> {
  const token = cookieValue(req, "yatra_session");
  if (token) {
    const s = await first<{ user_id: string; role: Role; demo: number }>(
      "SELECT s.user_id,s.demo,CASE WHEN s.demo = 1 THEN s.role ELSE u.role END AS role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires > ?",
      await digest(token),
      Date.now(),
    );
    if (s)
      return {
        userId: s.user_id,
        role: s.role,
        demo: !!s.demo,
        scope: s.demo ? s.user_id : "production",
      };
  }
  if (setting("DEMO_MODE") === "false")
    throw Object.assign(new Error("Please sign in to continue."), {
      status: 401,
    });
  const platform = req.headers.get("oai-authenticated-user-id");
  const userId = platform
    ? "demo:" + (await digest(platform))
    : "demo:" + crypto.randomUUID();
  const res = await newSession(req, userId, true, "traveler");
  return { ...res.actor, cookie: res.cookie };
}
export function requireRole(a: Actor, roles: Role[]) {
  if (!roles.includes(a.role))
    throw Object.assign(new Error("You do not have access to this action."), {
      status: 403,
    });
}
export async function switchRole(req: Request, a: Actor, role: Role) {
  if (!a.demo || setting("DEMO_MODE") === "false")
    throw Object.assign(
      new Error("Role switching is only available in demo mode."),
      { status: 403 },
    );
  const token = cookieValue(req, "yatra_session");
  if (token)
    await run(
      "UPDATE sessions SET role = ? WHERE id = ? AND user_id = ?",
      role,
      await digest(token),
      a.userId,
    );
  else throw new Error("Reload the page before changing demo roles.");
}
export function checkOrigin(req: Request) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin)
      throw Object.assign(new Error("This request is not permitted."), {
        status: 403,
      });
    if (
      !req.headers.get("content-type")?.includes("application/json") &&
      !req.headers.get("content-type")?.includes("multipart/form-data")
    )
      throw Object.assign(new Error("Unsupported request format."), {
        status: 415,
      });
  }
}
async function authFetch(
  path: string,
  body?: unknown,
  token?: string,
  method?: string,
) {
  const url = setting("SUPABASE_URL"),
    key = setting("SUPABASE_ANON_KEY");
  if (!url || !key)
    throw Object.assign(
      new Error(
        "Email and Google sign-in require Supabase Auth configuration. You can use the demo roles now.",
      ),
      { status: 503 },
    );
  const r = await fetch(url.replace(/\/$/, "") + "/auth/v1/" + path, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: {
      apikey: key,
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = (await r.json()) as Record<string, any>;
  if (!r.ok)
    throw new Error(
      data.msg ||
        data.error_description ||
        data.message ||
        "Sign-in could not be completed.",
    );
  return data;
}
export async function authenticate(req: Request, b: Record<string, any>) {
  await rateLimit(
    "auth:" + (req.headers.get("cf-connecting-ip") || "local"),
    10,
  );
  if (b.action === "logout") {
    const token = cookieValue(req, "yatra_session");
    if (token)
      await run("DELETE FROM sessions WHERE id = ?", await digest(token));
    return { ok: true, cookie: cookie(req, "", 0) };
  }
  if (b.action === "google") {
    const verifier = crypto.randomUUID() + crypto.randomUUID();
    const bytes = new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    );
    const challenge = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    if (!setting("SUPABASE_URL") || !setting("SUPABASE_ANON_KEY"))
      throw new Error("Google login needs Supabase Auth configuration.");
    return {
      url:
        setting("SUPABASE_URL") +
        "/auth/v1/authorize?provider=google&redirect_to=" +
        encodeURIComponent(new URL("/auth-return", req.url).toString()) +
        "&code_challenge=" +
        challenge +
        "&code_challenge_method=s256",
      cookie: `yatra_pkce=${verifier}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600${new URL(req.url).protocol === "https:" ? "; Secure" : ""}`,
    };
  }
  if (b.action === "reset") {
    if (
      typeof b.token !== "string" ||
      b.token.length > 10000 ||
      typeof b.password !== "string" ||
      b.password.length < 8
    )
      throw new Error("Enter a password of at least 8 characters.");
    await authFetch("user", undefined, b.token);
    await authFetch("user", { password: b.password }, b.token, "PUT");
    return { message: "Password updated. You can now sign in." };
  }
  if (b.action === "recover") {
    if (typeof b.email !== "string" || !b.email.includes("@"))
      throw new Error("Enter a valid email address.");
    await authFetch("recover", {
      email: b.email,
      redirect_to: new URL("/auth-return?recovery=1", req.url).toString(),
    });
    return { message: "If this account exists, a reset link has been sent." };
  }
  if (b.action === "register") {
    if (
      typeof b.name !== "string" ||
      b.name.length < 2 ||
      typeof b.email !== "string" ||
      !/^\S+@\S+\.\S+$/.test(b.email) ||
      typeof b.password !== "string" ||
      b.password.length < 8
    )
      throw new Error(
        "Enter your name, a valid email and a password of at least 8 characters.",
      );
    const d = await authFetch("signup", {
      email: b.email,
      password: b.password,
      data: { full_name: b.name, phone: b.phone || "" },
    });
    if (!d.access_token)
      return {
        message: "Check your email to confirm your account, then sign in.",
      };
    b.token = d.access_token;
  }
  let token = b.token;
  if (b.action === "login") {
    if (typeof b.email !== "string" || typeof b.password !== "string")
      throw new Error("Enter email and password.");
    const d = await authFetch("token?grant_type=password", {
      email: b.email,
      password: b.password,
    });
    token = d.access_token;
  }
  if (b.action === "exchange") {
    const verifier = cookieValue(req, "yatra_pkce");
    if (!verifier)
      throw new Error("Sign-in link expired. Please try Google login again.");
    const d = await authFetch("token?grant_type=pkce", {
      auth_code: b.code,
      code_verifier: verifier,
    });
    token = d.access_token;
  }
  if (typeof token !== "string" || token.length > 10000)
    throw new Error("Sign-in could not be verified.");
  const user = await authFetch("user", undefined, token);
  if (!user.id || !user.email)
    throw new Error("No verified identity was returned.");
  const s = await newSession(
    req,
    "auth:" + user.id,
    false,
    "traveler",
    user.user_metadata?.full_name,
    user.email,
    !!b.remember,
  );
  return { ok: true, role: s.actor.role, cookie: s.cookie };
}

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  const configured = (process.env.ADMIN_PATH || "admin-la-fiesta").replace(/^\/+|\/+$/g, "");
  const pathname = request.nextUrl.pathname;
  const adminRoot = `/${configured}`;
  const isAdmin = pathname === adminRoot || pathname.startsWith(`${adminRoot}/`) || pathname === "/admin-la-fiesta" || pathname.startsWith("/admin-la-fiesta/");
  if (!isAdmin) return NextResponse.next();
  let response = NextResponse.next({ request });
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return pathname.endsWith("/login") ? response : NextResponse.redirect(new URL(`${adminRoot}/login`, request.url));
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => request.cookies.getAll(), setAll: (items: {name:string;value:string;options?:any}[]) => { items.forEach(({ name, value }) => request.cookies.set(name, value)); response = NextResponse.next({ request }); items.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const login = pathname.endsWith("/login");
  if (!user && !login) return NextResponse.redirect(new URL(`${adminRoot}/login`, request.url));
  if (user && login) return NextResponse.redirect(new URL(adminRoot, request.url));
  if (user && pathname !== `${adminRoot}/unauthorized`) {
    const { data: profile } = await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle();
    if (!profile?.active) return NextResponse.redirect(new URL(`${adminRoot}/unauthorized`, request.url));
  }
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"] };

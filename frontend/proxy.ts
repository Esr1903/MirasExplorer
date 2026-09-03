import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
  const token=request.cookies.get("mirasexplorer-auth")?.value;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (token && url && key) {
    const response=await fetch(`${url}/auth/v1/user`,{headers:{apikey:key,Authorization:`Bearer ${token}`},cache:"no-store"}).catch(()=>null);
    if (response?.ok) return NextResponse.next();
  }
  const login=new URL("/giris",request.url); login.searchParams.set("next",request.nextUrl.pathname); return NextResponse.redirect(login);
}
export const config={matcher:["/editor/:path*"]};

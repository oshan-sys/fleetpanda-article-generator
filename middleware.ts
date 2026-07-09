import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Gates every API route except NextAuth's own endpoints behind a session.
// The main page is gated separately (app/page.tsx renders the sign-in
// screen itself), since a redirect response doesn't make sense for a
// fetch()/SSE caller expecting JSON.
export default auth((req) => {
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.json(
      { error: "Not signed in. Refresh the page and sign in with your FleetPanda Google account." },
      { status: 401 }
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/api/:path*"],
};

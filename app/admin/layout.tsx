import type { ReactNode } from "react";

/** Visual scope only: existing page authorization and Supabase RLS remain unchanged. */
export default function StaffRouteLayout({ children }: { children: ReactNode }) {
  return <div className="swastha-staff-route">{children}</div>;
}

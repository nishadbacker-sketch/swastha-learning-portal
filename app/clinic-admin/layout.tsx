import type {ReactNode} from "react";
import StaffRouteFrame from "../components/staff-route-frame";

/** Shared visual scope. Authorization continues in page route handlers and RLS. */
export default function StaffRouteLayout({children}:{children:ReactNode}){
 return <StaffRouteFrame>{children}</StaffRouteFrame>;
}

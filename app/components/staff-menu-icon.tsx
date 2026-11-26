"use client";
import type {ReactNode} from "react";

/** Compact line icons for the approved clinic dashboard navigation. No external icon runtime. */
export function StaffMenuIcon({href}:{href:string}){
 let drawing:ReactNode;
 if(href.includes("students")||href.includes("coordination")||href.includes("users")){
  drawing=<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 20v-2.3c0-3 2.2-5 5.5-5s5.5 2 5.5 5V20M15 14c2.7-.4 5.5 1.3 5.5 4V20"/></>;
 }else if(href.includes("certificates")){
  drawing=<><circle cx="12" cy="10" r="6"/><path d="M8.5 15 7 22l5-2.6 5 2.6-1.5-7"/><path d="m9.4 10 1.8 1.8 3.5-3.5"/></>;
 }else if(href.includes("appointment")||href.includes("sessions")||href.includes("operations")){
  drawing=<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18m-13 4h3m3 0h3"/></>;
 }else if(href.includes("idp")||href.includes("goals")){
  drawing=<><path d="M4 4h14l3 3v14H4zM17 4v4h4M8 13l2.5 2.5 5-5"/></>;
 }else if(href.includes("activities")||href.includes("courses")){
  drawing=<><path d="M12 21c-3-2-5.5-2.7-9-2.3V4c4-.2 6.5.7 9 3 2.5-2.3 5-3.2 9-3v14.7c-3.5-.4-6 .3-9 2.3zM12 7v14"/></>;
 }else if(href.includes("reports")||href.includes("analytics")||href.includes("oversight")||href.includes("progress")){
  drawing=<><path d="M3 20h18M6 17v-5m6 5V5m6 12V9" strokeWidth="3.1"/></>;
 }else if(href.includes("assess")||href.includes("questions")){
  drawing=<><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2m-6 9 2.2 2.2 4-4"/></>;
 }else if(href.includes("notifications")||href.includes("announcements")){
  drawing=<><path d="M18 8a6 6 0 0 0-12 0c0 8-3 7-3 9h18c0-2-3-1-3-9M10 21h4"/></>;
 }else if(href.includes("audit")||href.includes("history")){
  drawing=<><circle cx="12" cy="12" r="9"/><path d="M12 6v7l4 2"/></>;
 }else{
  drawing=<><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12h8m-4-4v8"/></>;
 }
 return <svg aria-hidden="true" className="swastha-staff-sidebar__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{drawing}</svg>;
}
export function StaffDashboardIcon(){
 return <svg aria-hidden="true" className="swastha-staff-sidebar__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9" r="3"/><path d="M5.5 18c.6-3.2 3-4.5 6.5-4.5s5.9 1.3 6.5 4.5"/></svg>;
}

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const layout=read("app/layout.tsx");
const footer=read("app/components/main-website-footer.tsx");
const css=read("app/globals.css");
const parent=read("app/parent/dashboard/page.tsx");
test("One shared main-site footer renders through the root portal layout",()=>{
 assert.match(layout,/import MainWebsiteFooter from "\.\/components\/main-website-footer"/);
 assert.match(layout,/<MainWebsiteFooter \/>/);
 assert.match(footer,/<footer className="swastha-site-footer"/);
 assert.match(footer,/swastha-site-footer__about/);
 assert.match(footer,/swastha-site-footer__links/);
 assert.match(footer,/swastha-site-footer__contact/);
 assert.match(footer,/swastha-site-footer__bottom/);
 assert.match(footer,/Nurturing Every Ability, Empowering Every Child/);
 assert.doesNotMatch(parent,/<footer style=\{\{textAlign:"center",padding:24,color:gray\}\}/);
});
test("Footer retains existing official website URLs, logo, contact information and green colours",()=>{
 assert.match(footer,/https:\/\/swasthalearning\.com\/#top/);
 assert.match(footer,/https:\/\/swasthalearning\.com\/#appointment/);
 assert.match(footer,/https:\/\/swasthalearning\.com\/#faq/);
 assert.match(footer,/https:\/\/wa\.me\/919249056889/);
 assert.match(footer,/logoUrl/);
 assert.match(css,/body footer\.swastha-site-footer \{/);
 assert.match(css,/background: #176b58/);
});
test("Footer stays in a responsive three-column layout without changing dashboard controls",()=>{
 assert.match(css,/grid-template-columns: minmax\(0, 1\.6fr\) minmax\(0, \.8fr\) minmax\(0, 1fr\)/);
 assert.match(css,/@media \(max-width: 760px\)/);
 assert.match(css,/@media \(max-width: 480px\)/);
 assert.match(css,/swastha-site-footer__bottom/);
 assert.match(css,/swastha-site-footer a:focus-visible/);
 assert.match(parent,/import ParentNotifications from/);
 assert.match(parent,/import ParentProgressSummary from/);
});

import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const source=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const registration=source("app/login/page.tsx");
const forgot=source("app/forgot-password/page.tsx");
const reset=source("app/reset-password/page.tsx");

test("registration uses email redirect and does not falsely promise immediate access",()=>{
 assert.match(registration,/emailRedirectTo: window\.location\.origin \+ "\/login"/);
 assert.match(registration,/setNeedsEmailConfirmation\(!data\.session\)/);
 assert.match(registration,/needsEmailConfirmation \? "Check your email" : "Registration Completed!"/);
 assert.match(registration,/Please check your email for a verification link/);
});

test("password reset sends a Supabase recovery email with portal redirect",()=>{
 assert.match(forgot,/auth\.resetPasswordForEmail\(/);
 assert.match(forgot,/redirectTo:window\.location\.origin\+"\/reset-password"/);
 assert.doesNotMatch(forgot,/SUPABASE_SERVICE_ROLE_KEY|service_role/);
});

test("password recovery requires a session, password confirmation and signs out",()=>{
 assert.match(reset,/auth\.onAuthStateChange/);
 assert.match(reset,/event==="PASSWORD_RECOVERY"/);
 assert.match(reset,/if\(!supabase\|\|!ready\)return/);
 assert.match(reset,/password!==confirm/);
 assert.match(reset,/auth\.updateUser\(\{password\}\)/);
 assert.match(reset,/auth\.signOut\(\)/);
});

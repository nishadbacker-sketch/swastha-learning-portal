import assert from "node:assert/strict";
import test from "node:test";

const base = process.env.SWASTHA_SMOKE_BASE_URL || "http://127.0.0.1:3100";

async function request(path, options = {}) {
  const response = await fetch(new URL(path, base), {
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
    ...options,
  });
  return response;
}

// These smoke tests intentionally use NO authenticated accounts and do not
// insert/update/delete student records. They validate availability, routing
// and the appointment API's rejection paths, not full role-based workflows.
test("portal root redirects to the single login", async () => {
  const response = await request("/");
  assert.ok([307, 308].includes(response.status), `root status: ${response.status}`);
  assert.equal(new URL(response.headers.get("location"), base).pathname, "/login");
});

for (const path of ["/login", "/register"]) {
  test(`${path} renders successfully`, async () => {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") || "", /text\/html/);
  });
}

test("appointment intake refuses submissions without an origin", async () => {
  const response = await request("/api/appointment-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 403);
});

test("appointment intake refuses an untrusted origin", async () => {
  const response = await request("/api/appointment-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://untrusted.example" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 403);
});

test("appointment intake validates malformed submissions without writing data", async () => {
  const response = await request("/api/appointment-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://swasthalearning.com" },
    body: JSON.stringify({}),
  });
  assert.equal(response.status, 400);
});

test("allowed site receives CORS preflight; untrusted site does not", async () => {
  const allowed = await request("/api/appointment-intake", {
    method: "OPTIONS",
    headers: { Origin: "https://swasthalearning.com" },
  });
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://swasthalearning.com");
  const denied = await request("/api/appointment-intake", {
    method: "OPTIONS",
    headers: { Origin: "https://untrusted.example" },
  });
  assert.equal(denied.status, 403);
});

test("appointment intake rejects an oversized streamed request before database access", async () => {
  const response = await request("/api/appointment-intake", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://swasthalearning.com" },
    body: JSON.stringify({ message: "x".repeat(13_000) }),
  });
  assert.equal(response.status, 413);
});

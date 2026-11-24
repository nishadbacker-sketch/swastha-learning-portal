import assert from "node:assert/strict";
import test from "node:test";
import {createClient} from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Read-only anonymous checks. No user creation or inserts/updates/deletes.
// Missing CI secrets produce an explicit skipped test instead of a false pass.
if (!url || !anonKey) {
  test("Supabase anonymous access checks require configured CI secrets", {skip: "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are missing"}, () => {});
} else {
  const client = createClient(url, anonKey, {
    auth: {persistSession: false, autoRefreshToken: false},
  });

  for (const table of ["students", "profiles", "user_roles", "parent_student_links", "teacher_assignments", "appointment_enquiries", "assessment_assignments", "assessment_responses", "assessment_results", "student_development_goals", "student_activity_assignments", "custom_assessment_assignments", "student_coordination_notes", "parent_announcements", "parent_notification_acknowledgements", "student_contact_details", "admin_audit_events", "payments"]) {
    test(`anonymous users cannot read ${table} records`, async () => {
      const {data, error} = await client.from(table).select("*").limit(1);
      // A permission error or an empty set are both secure outcomes; a record is not.
      assert.ok(error || !data || data.length === 0, `Anonymous data exposure: ${table}`);
    });
  }

  for (const fn of [
    "enforce_assessment_result_score",
    "protect_assessment_assignment",
    "swastha_auto_link_after_enquiry",
    "swastha_auto_link_after_parent_child",
    "swastha_issue_student_code",
    "swastha_record_appointment_change",
  ]) {
    test(`anonymous users cannot call internal trigger RPC ${fn}`, async () => {
      const {error} = await client.rpc(fn);
      assert.ok(error, `Internal privileged trigger function callable by anonymous user: ${fn}`);
    });
  }


  for (const [fn, params] of [
    ["admin_publish_parent_announcement", {p_title: "Anonymous test", p_message: "Must not publish"}],
    ["admin_parent_announcement_stats", undefined],
    ["admin_parent_announcement_recipients", undefined],
    ["admin_audit_timeline", undefined],
    ["admin_student_progress_summary", undefined],
    ["admin_assign_teacher_to_student", {p_student_id:"00000000-0000-0000-0000-000000000001",p_teacher_id:"00000000-0000-0000-0000-000000000001"}],
    ["add_child_for_parent", {p_full_name:"Synthetic blocked child",p_date_of_birth:"2017-01-01",p_current_class:"3",p_preferred_language:"en"}],
  ]) {
    test(`anonymous user cannot execute sensitive RPC ${fn}`, async () => {
      const {error, data} = await client.rpc(fn, params);
      assert.ok(error, `Anonymous RPC was permitted: ${fn} (response: ${JSON.stringify(data)})`);
    });
  }

  test("anonymous users cannot call privileged student progress summary", async () => {
    const {error, data} = await client.rpc("admin_student_progress_summary");
    assert.ok(error || !data || data.length === 0, "Anonymous user received student progress information");
  });
}

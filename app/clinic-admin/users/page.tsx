"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Account = {
  user_id: string;
  full_name: string;
  email: string | null;
  staff_code: string | null;
  account_role: "parent" | "teacher";
  teacher_status: string | null;
};

const button: React.CSSProperties = {
  background: "#176b58", color: "#fff", border: 0, borderRadius: 8,
  padding: "10px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer"
};
const card: React.CSSProperties = {
  background: "#fff", border: "1px solid #dce8e1",
  borderRadius: 13, padding: 16
};

export default function ClinicAdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Account[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "parent" | "teacher">("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!supabase) { setError("Database unavailable."); setLoading(false); return; }
    try {
      setError("");
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { router.replace("/login"); return; }
      const { data: currentRole, error: roleError } = await supabase
        .from("user_roles").select("role").eq("user_id", auth.user.id).single();
      if (roleError || currentRole?.role !== "clinic_admin") {
        router.replace("/login");
        return;
      }
      const { data, error: listError } = await supabase.rpc("clinic_admin_list_parent_teacher_accounts");
      if (listError) throw listError;
      // Defense in depth; the database function itself excludes privileged accounts.
      setUsers(((data || []) as Account[]).filter(u => u.account_role === "parent" || u.account_role === "teacher"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function promote(account: Account) {
    if (!supabase || busyId || account.account_role !== "parent") return;
    if (!window.confirm(`Promote ${account.full_name} from Parent to Teacher? The account will receive Teacher access.`)) return;
    setBusyId(account.user_id);
    setError("");
    setNotice("");
    try {
      const { error: updateError } = await supabase.rpc("clinic_admin_promote_parent_to_teacher", {
        p_user_id: account.user_id
      });
      if (updateError) throw updateError;
      setNotice(`${account.full_name} has been promoted to Teacher.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed.");
    } finally {
      setBusyId("");
    }
  }

  async function removeParent(account: Account) {
    if (!supabase || busyId || account.account_role !== "parent") return;
    const confirmation = window.prompt(
      "Permanently remove unused Parent account: " + account.full_name +
      "\\nStudent profiles are preserved, but their link to this Parent will be removed. Completed courses and registrations block removal. Type REMOVE to confirm."
    );
    if (confirmation !== "REMOVE") return;
    setBusyId(account.user_id);
    setError("");
    setNotice("");
    try {
      const { error: removeError } = await supabase.rpc("staff_remove_unused_parent_account", {
        p_user_id: account.user_id
      });
      if (removeError) throw removeError;
      setNotice(account.full_name + " account removed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Removal blocked.");
    } finally {
      setBusyId("");
    }
  }

  const visible = users.filter(u => {
    if (filter !== "all" && u.account_role !== filter) return false;
    return [u.full_name, u.email || "", u.staff_code || "", u.account_role]
      .join(" ").toLowerCase().includes(search.trim().toLowerCase());
  });

  return (
    <main style={{ maxWidth: 1100, margin: "auto", padding: "24px 16px 55px", color: "#183a35" }}>
      <button type="button" style={button} onClick={() => router.push("/clinic-admin/dashboard")}>
        Back to Staff Tools
      </button>
      <h1 style={{ marginTop: 22, marginBottom: 8 }}>User Management</h1>
      <p style={{ fontSize: 13, color: "#667a74" }}>
        Admin can view Parent and Teacher accounts, promote Parents to Teachers, and remove unused Parent accounts only.
        Owner, Super Admin and Admin accounts are not listed here.
      </p>
      <div style={{ ...card, display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
        <input aria-label="Search accounts" placeholder="Search name, email or staff ID"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 260px", minWidth: 0, padding: "10px 12px", border: "1px solid #dce8e1", borderRadius: 8 }} />
        <select aria-label="Filter account role" value={filter}
          onChange={e => setFilter(e.target.value as "all" | "parent" | "teacher")}
          style={{ padding: "10px 12px", border: "1px solid #dce8e1", borderRadius: 8, background: "#fff" }}>
          <option value="all">Parents and Teachers</option>
          <option value="parent">Parents only</option>
          <option value="teacher">Teachers only</option>
        </select>
      </div>
      {error && <p role="alert" style={{ color: "#b42318", marginTop: 14 }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#176b58", marginTop: 14 }}>{notice}</p>}
      {loading ? <p style={{ marginTop: 20 }}>Loading accounts...</p> : (
        <div style={{ ...card, marginTop: 14, overflowX: "auto", padding: 0 }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 620, fontSize: 13, textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#eaf4ef" }}>
                {["Name / Email / Staff ID", "Role", "Teacher status", "Allowed action"].map(h =>
                  <th key={h} style={{ padding: "12px 14px" }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {visible.map(u => (
                <tr key={u.user_id} style={{ borderTop: "1px solid #dce8e1" }}>
                  <td style={{ padding: "12px 14px", overflowWrap: "anywhere" }}>
                    <strong>{u.full_name}</strong>
                    {u.staff_code && <span style={{ color: "#667a74" }}> · {u.staff_code}</span>}
                    <div style={{ color: "#667a74", marginTop: 3 }}>{u.email || "No registered email"}</div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>{u.account_role === "parent" ? "Parent" : "Teacher"}</td>
                  <td style={{ padding: "12px 14px" }}>{u.account_role === "teacher" ? u.teacher_status || "Not recorded" : "—"}</td>
                  <td style={{ padding: "12px 14px" }}>
                    {u.account_role === "parent" ? (
                      <>
                      <button type="button" style={{ ...button, opacity: busyId ? 0.65 : 1 }}
                        disabled={Boolean(busyId)} onClick={() => void promote(u)}>
                        {busyId === u.user_id ? "Promoting..." : "Promote to Teacher"}
                      </button>
                      <button type="button" style={{ ...button, background: "#9f2935", marginLeft: 6 }}
                        disabled={Boolean(busyId)} onClick={() => void removeParent(u)}>
                        {busyId === u.user_id ? "Working..." : "Remove Parent Account"}
                      </button>
                      </>
                    ) : <span style={{ color: "#667a74" }}>View only</span>}
                  </td>
                </tr>
              ))}
              {visible.length === 0 && <tr><td colSpan={4} style={{ padding: 22, textAlign: "center", color: "#667a74" }}>
                No matching Parent or Teacher accounts.
              </td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

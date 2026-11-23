
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function ParentDashboard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      if (!supabase) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        router.replace("/login");
        return;
      }

      const user = data.session.user;

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || !roleData) {
        router.replace("/login");
        return;
      }

      if (
        roleData.role !== "parent" &&
        roleData.role !== "student"
      ) {
        if (roleData.role === "admin") {
          router.replace("/admin/dashboard");
        } else if (roleData.role === "teacher") {
          router.replace("/teacher/dashboard");
        } else {
          router.replace("/login");
        }
        return;
      }

      setName(
        user.user_metadata?.full_name || user.email || "Learner"
      );
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function handleLogout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace("/login");
  }

  if (loading) {
    return <main style={{ padding: 40 }}>Loading your dashboard...</main>;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f8faf7",
      color: "#183a35"
    }}>
      <header style={{
        padding: "20px 6%",
        background: "#ffffff",
        borderBottom: "1px solid #dce8e1",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <strong>SWASTHA LEARNING CLINIC</strong>
        <button onClick={handleLogout}>
          Sign out
        </button>
      </header>

      <section style={{ padding: "48px 6%" }}>
        <p>LEARN • GROW • THRIVE</p>
        <h1>Welcome, {name}!</h1>
        <p>
          Welcome to your Swastha Learning Clinic learning portal.
        </p>

        <div style={{
          marginTop: 32,
          padding: 28,
          background: "#ffffff",
          border: "1px solid #dce8e1",
          borderRadius: 16,
          maxWidth: 650
        }}>
          <h2>Your Learning Dashboard</h2>
          <p>
            Your account is active. Your learning information
            and assigned activities will appear here.
          </p>
        </div>
      </section>
    </main>
  );
}

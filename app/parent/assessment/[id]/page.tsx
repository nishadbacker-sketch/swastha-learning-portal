
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import {
  CHECKLIST_DATA,
  type AssessmentLevel,
  type AssessmentScore,
} from "../../../../lib/assessment-data";
import {checklistForAssignment} from "../../../../lib/assessment-question-versions";
import { LP_MALAYALAM_QUESTIONS, LP_MALAYALAM_INTERVIEW, LP_MALAYALAM_TALENTS, LP_MALAYALAM_AREAS, LP_MALAYALAM_DOMAINS } from "../../../../lib/assessment-ml";

type Answer = {
  score: AssessmentScore | null;
  observation: string;
};

type Assignment = {
  id: string;
  student_id: string;
  assessment_level: AssessmentLevel;
  assigned_at: string;
  status: string;
  due_date: string | null;
};

type Student = {
  full_name: string;
  current_class: string;
  date_of_birth: string;
  student_code: string;
};

const OPTIONS: {
  value: AssessmentScore;
  label: string;
  color: string;
}[] = [
  { value: "0", label: "Not demonstrated", color: "#ef4444" },
  { value: "1", label: "Substantial support", color: "#f97316" },
  { value: "2", label: "Developing", color: "#0284c7" },
  { value: "3", label: "Independent", color: "#10b981" },
  { value: "NA", label: "Not assessed", color: "#64748b" },
];

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #dce8e1",
  borderRadius: 13,
  padding: 16,
  marginBottom: 14,
};

const button: React.CSSProperties = {
  background: "#16697a",
  color: "#ffffff",
  border: 0,
  borderRadius: 9,
  padding: "12px 20px",
  fontWeight: 600,
  cursor: "pointer",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: 12,
  border: "1px solid #cbd5e1",
  borderRadius: 9,
  fontFamily: "inherit",
  fontSize: 14,
  boxSizing: "border-box",
  resize: "vertical",
};

export default function ParentAssessmentPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const assignmentId = params.id;

  const [assignment, setAssignment] =
    useState<Assignment | null>(null);

  const [versionedChecklist,setVersionedChecklist]=useState<(typeof CHECKLIST_DATA)[AssessmentLevel]|null>(null);

  const [student, setStudent] =
    useState<Student | null>(null);

  const [guardian, setGuardian] = useState("");
  const [userId, setUserId] = useState("");
  const [answers, setAnswers] =
    useState<Record<string, Answer>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [successPopup, setSuccessPopup] = useState(false);
  const [activeArea, setActiveArea] = useState(0);
  const [showUnanswered, setShowUnanswered] = useState(false);
  const [language, setLanguage] = useState<"en"|"ml">("en");
  useEffect(() => {
    try { if(window.localStorage.getItem("swastha-assessment-language")==="ml")setLanguage("ml"); }
    catch { /* optional local preference */ }
  }, []);
  const malayalam = language==="ml";
  const tr = (en:string,ml:string) => malayalam?ml:en;
  function chooseLanguage(value:"en"|"ml") {
    setLanguage(value);
    try { window.localStorage.setItem("swastha-assessment-language",value); }
    catch { /* optional local preference */ }
  }
  const lpMalayalam = malayalam && assignment?.assessment_level==="LP";

  useEffect(() => {
    async function loadAssessment() {
      if (!supabase) {
        setMessage("Supabase is not configured.");
        setLoading(false);
        return;
      }

      try {
        const { data: auth } =
          await supabase.auth.getUser();

        if (!auth.user) {
          router.replace("/login");
          return;
        }

        const uid = auth.user.id;
        setUserId(uid);

        const { data: role, error: roleError } =
          await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", uid)
            .single();

        if (roleError || role?.role !== "parent") {
          router.replace("/login");
          return;
        }

        const { data: assigned, error: assignmentError } =
          await supabase
            .from("assessment_assignments")
            .select("*")
            .eq("id", assignmentId)
            .single();

        if (assignmentError || !assigned) {
          throw new Error(
            "Assessment not found or access denied."
          );
        }

        const { data: link, error: linkError } =
          await supabase
            .from("parent_student_links")
            .select("student_id")
            .eq("parent_user_id", uid)
            .eq("student_id", assigned.student_id)
            .maybeSingle();

        if (linkError || !link) {
          throw new Error("Access denied.");
        }

        if (
          !Object.prototype.hasOwnProperty.call(
            CHECKLIST_DATA,
            assigned.assessment_level
          )
        ) {
          throw new Error("Invalid assessment level.");
        }

        const { data: child, error: childError } =
          await supabase
            .from("students")
            .select(
              "full_name,current_class,date_of_birth,student_code"
            )
            .eq("id", assigned.student_id)
            .single();

        if (childError || !child) {
          throw new Error("Student information unavailable.");
        }

        const latestChecklist=await checklistForAssignment(assigned.assessment_level as AssessmentLevel,assigned.assigned_at);
        setVersionedChecklist(latestChecklist);
        setAssignment(assigned as Assignment);
        setStudent(child as Student);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", uid)
          .maybeSingle();

        setGuardian(
          profile?.full_name ||
          auth.user.user_metadata?.full_name ||
          ""
        );

        if (
          assigned.status === "assigned" ||
          assigned.status === "in_progress"
        ) {
          const { data: responses, error: responseError } =
            await supabase
              .from("assessment_responses")
              .select("question_id,score,observation")
              .eq("assignment_id", assignmentId);

          if (responseError) {
            throw new Error(responseError.message);
          }

          const saved: Record<string, Answer> = {};

          (responses || []).forEach((response) => {
            saved[response.question_id] = {
              score: response.score as AssessmentScore | null,
              observation: response.observation || "",
            };
          });

          setAnswers(saved);
        }
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load assessment."
        );
      } finally {
        setLoading(false);
      }
    }

    loadAssessment();
  }, [assignmentId, router]);

  const checklist = assignment ? versionedChecklist : null;

  const questionIds = checklist
    ? checklist.areas.flatMap((area) =>
        area.subDomains.flatMap((domain) =>
          domain.items.map(
            (_, index) => `${domain.id}_${index + 1}`
          )
        )
      )
    : [];


  const missingQuestions = checklist
    ? checklist.areas.flatMap((area, areaIndex) =>
        area.subDomains.flatMap((domain) =>
          domain.items.flatMap((question, index) => {
            const id = domain.id + "_" + (index + 1);
            return answers[id]?.score == null
              ? [{ id, areaIndex, domainTitle: domain.title, index, question }]
              : [];
          })
        )
      )
    : [];

  function jumpToQuestion(areaIndex: number, id: string) {
    setActiveArea(areaIndex);
    window.setTimeout(() => {
      document.getElementById("question-" + id)?.scrollIntoView({
        behavior: "smooth", block: "center"
      });
    }, 80);
  }

  const total = questionIds.length;

  const completed = questionIds.filter(
    (id) => answers[id]?.score != null
  ).length;

  const submitted =
    assignment?.status === "submitted" ||
    assignment?.status === "reviewed";

  const progress = submitted
    ? 100
    : total
    ? Math.round((completed / total) * 100)
    : 0;

  function updateScore(
    id: string,
    score: AssessmentScore
  ) {
    setAnswers((previous) => ({
      ...previous,
      [id]: {
        score,
        observation: previous[id]?.observation || "",
      },
    }));

    setMessage("");
  }

  function updateObservation(
    id: string,
    observation: string
  ) {
    setAnswers((previous) => ({
      ...previous,
      [id]: {
        score: previous[id]?.score ?? null,
        observation,
      },
    }));

    setMessage("");
  }

  async function saveAssessment(finalSubmit = false) {
    if (
      !supabase ||
      !assignment ||
      !userId ||
      submitted ||
      saving
    ) {
      return;
    }

    if (finalSubmit && completed !== total) {
      setShowUnanswered(true);
      setMessage("Please answer the highlighted questions. Select NA if you cannot assess an item.");
      if(missingQuestions.length > 0)jumpToQuestion(missingQuestions[0].areaIndex,missingQuestions[0].id);
      setConfirmSubmit(false);
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const rows = Object.entries(answers)
        .filter(
          ([, answer]) =>
            answer.score !== null ||
            answer.observation.trim() !== ""
        )
        .map(([questionId, answer]) => ({
          assignment_id: assignment.id,
          question_id: questionId,
          score: answer.score,
          observation: answer.observation,
          answered_by: userId,
          updated_at: new Date().toISOString(),
        }));

      if (rows.length > 0) {
        const { error } = await supabase
          .from("assessment_responses")
          .upsert(rows, {
            onConflict: "assignment_id,question_id",
          });

        if (error) throw new Error(error.message);
      }

      const nextStatus = finalSubmit
        ? "submitted"
        : "in_progress";

      const { data: updated, error: updateError } =
        await supabase
          .from("assessment_assignments")
          .update({ status: nextStatus })
          .eq("id", assignment.id)
          .in("status", ["assigned", "in_progress"])
          .select("status")
          .single();

      if (updateError || !updated) {
        throw new Error(
          updateError?.message ||
          "Unable to update assessment status."
        );
      }

      setAssignment((previous) =>
        previous
          ? { ...previous, status: updated.status }
          : previous
      );

      setConfirmSubmit(false);

      if (finalSubmit) {
        setSuccessPopup(true);
      } else {
        setMessage("Your progress has been saved successfully.");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save assessment."
      );

      setConfirmSubmit(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main style={{ padding: 40, textAlign: "center" }}>
        Loading assessment...
      </main>
    );
  }

  if (!assignment || !student || !checklist) {
    return (
      <main style={{ padding: 30 }}>
        <h2>Assessment unavailable</h2>
        <p>{message}</p>
        <button
          style={button}
          onClick={() => router.push("/parent/dashboard")}
        >
          Back to Dashboard
        </button>
      </main>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8fafc",
        color: "#1e293b",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          boxShadow: "0 3px 12px rgba(15, 76, 92, 0.18)",
          background: "#0f4c5c",
          color: "white",
          padding: "12px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <strong>SWASTHA LEARNING CLINIC</strong>
          <div style={{ fontSize: 12, marginTop: 6 }}>
            CHILD ASSESSMENT PORTAL
          </div>
        </div>

        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center"}}>
          <label htmlFor="assessment-language" style={{fontSize:14,fontWeight:600}}>{tr("Language","ഭാഷ")}</label>
          <select id="assessment-language" aria-label="Assessment language"
            value={language} onChange={event=>chooseLanguage(event.target.value as "en"|"ml")}
            style={{padding:"10px 12px",borderRadius:8,border:"1px solid #a7e0d9",fontSize:14,fontWeight:700,color:"#0f4c5c",background:"white"}}>
            <option value="en">English</option>
            <option value="ml">മലയാളം</option>
          </select>
          <button style={{...button,background:"#ffffff20"}} onClick={()=>router.push("/parent/dashboard")}>
            {tr("Back to Dashboard","ഡാഷ്‌ബോർഡിലേക്ക്")}
          </button>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1100,
          margin: "auto",
          padding: "24px 16px 60px",
        }}
      >
        <section style={card}>
          <div style={{ color: "#16697a", fontSize: 13 }}>
            {checklist.badge}
          </div>

          <h2>{lpMalayalam ? "എൽ.പി. തലത്തിലെ കുട്ടികളുടെ വിലയിരുത്തൽ ചോദ്യാവലി" : checklist.shortTitle}</h2>
          <p>{lpMalayalam ? "കുട്ടിയുടെ പഠനശേഷി, ഡിജിറ്റൽ ശീലങ്ങൾ, സാമൂഹിക-വൈകാരിക വളർച്ച, പ്രായോഗിക ചിന്ത, കഴിവുകൾ എന്നിവ മനസ്സിലാക്കുന്നതിനുള്ള ചോദ്യാവലി." : checklist.purpose}</p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(180px,1fr))",
              gap: 18,
              background: "#f0f7f5",
              padding: 18,
              borderRadius: 12,
              marginTop: 20,
            }}
          >
            <div>
              <small>Student</small>
              <p><strong>{student.full_name} · {student.student_code}</strong></p>
            </div>

            <div>
              <small>Current Class</small>
              <p><strong>{student.current_class}</strong></p>
            </div>

            <div>
              <small>Student Code</small>
              <p><strong>{student.student_code}</strong></p>
            </div>

            <div>
              <small>Date of Birth</small>
              <p><strong>{student.date_of_birth}</strong></p>
            </div>

            <div>
              <small>Parent / Guardian</small>
              <p><strong>{guardian || "Not available"}</strong></p>
            </div>

            <div>
              <small>Due Date</small>
              <p>
                <strong>
                  {assignment.due_date || "Not specified"}
                </strong>
              </p>
            </div>
          </div>
        </section>

        <section
          style={{
            ...card,
            position: "sticky",
            top: 0,
            zIndex: 20,
            boxShadow: "0 4px 12px #00000008",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <strong>Assessment Progress</strong>
            <strong style={{ color: "#16697a" }}>
              {progress}%
            </strong>
          </div>

          <div
            style={{
              background: "#e2e8f0",
              height: 12,
              borderRadius: 20,
              overflow: "hidden",
              marginTop: 12,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                background: "#2a9d8f",
                transition: "width 0.3s",
              }}
            />
          </div>

          <p style={{ fontSize: 13, marginBottom: 0 }}>
            {submitted ? total : completed} of {total} checklist
            items completed
          </p>
        </section>

        {submitted ? (
          <section
            style={{
              ...card,
              textAlign: "center",
              padding: 36,
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                margin: "auto",
                borderRadius: "50%",
                background: "#dcfce7",
                color: "#15803d",
                fontSize: 38,
                display: "grid",
                placeItems: "center",
              }}
            >
              ✓
            </div>

            <h2>
              {assignment.status === "reviewed"
                ? "Assessment Reviewed"
                : "Assessment Successfully Submitted"}
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(140px,1fr))",
                gap: 14,
                margin: "25px 0",
              }}
            >
              {[
                ["Completion", "100%"],
                ["Checklist Items", String(total)],
                ["Assessment Level", assignment.assessment_level],
                [
                  "Status",
                  assignment.status === "reviewed"
                    ? "Reviewed"
                    : "Awaiting Review",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    padding: 20,
                    background: "#f0f7f5",
                    borderRadius: 12,
                  }}
                >
                  <small>{label}</small>
                  <h3 style={{ color: "#16697a" }}>{value}</h3>
                </div>
              ))}
            </div>

            <p>
              {assignment.status === "reviewed"
                ? "Your assessment has been reviewed by the teacher."
                : "Your teacher will review the submitted assessment. Detailed results and recommendations will be available after approval."}
            </p>

            {assignment.status === "reviewed" && <button style={{...button,marginRight:10,background:"#176b58"}} onClick={()=>router.push("/assessment-report/"+assignment.id)}>View Full Analytics & Approved Report</button>}
            <button
              style={button}
              onClick={() => router.push("/parent/dashboard")}
            >
              Return to My Dashboard
            </button>
          </section>
        ) : (
          <>
            {showUnanswered && missingQuestions.length > 0 && (
              <section style={{...card, border:"2px solid #f59e0b", background:"#fffbeb"}}>
                <h3 style={{color:"#92400e",marginTop:0}}>
                  {tr("Unanswered questions","ഉത്തരം നൽകാത്ത ചോദ്യങ്ങൾ")}: {missingQuestions.length}
                </h3>
                <p>{tr("Click a question to jump directly to it. Select NA if you cannot assess that item.","ചോദ്യത്തിൽ ക്ലിക്ക് ചെയ്താൽ അതിലേക്ക് പോകാം. വിലയിരുത്താൻ കഴിയാത്ത ചോദ്യങ്ങൾക്ക് NA തിരഞ്ഞെടുക്കുക.")}</p>
                <div style={{display:"grid",gap:9}}>
                  {missingQuestions.map(item => (
                    <button key={item.id} type="button"
                      onClick={() => jumpToQuestion(item.areaIndex,item.id)}
                      style={{textAlign:"left",background:"#fff",border:"1px solid #fbbf24",borderRadius:8,padding:12,cursor:"pointer",color:"#78350f"}}>
                      <strong>{tr("Area","മേഖല")} {item.areaIndex + 1} · {item.domainTitle} · {tr("Question","ചോദ്യം")} {item.domainTitle.match(/^([A-Z])\./)?.[1] || item.id.split("_")[1]?.slice(-1) || ""}.{item.index + 1}</strong>
                      <span style={{display:"block",marginTop:5}}>{lpMalayalam && item.question === CHECKLIST_DATA.LP.areas.flatMap(a=>a.subDomains).flatMap(d=>d.items.map((q,i)=>({id:d.id+"_"+(i+1),q}))).find(q=>q.id===item.id)?.q ? LP_MALAYALAM_QUESTIONS[item.id] || item.question : item.question}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}
            <fieldset
              disabled={saving}
              style={{
                border: 0,
                margin: 0,
                padding: 0,
                minWidth: 0,
              }}
            >
              <section style={card}>
                <h3>{tr("Scoring Guide","മൂല്യനിർണയ മാർഗനിർദേശം")}</h3>

                <p style={{ fontSize: 14 }}>
                  Select the option that best describes your
                  child's ability. Select NA when you do not
                  have enough information to assess an item.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  {OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      style={{
                        border: `1px solid ${option.color}`,
                        borderRadius: 9,
                        padding: 10,
                        fontSize: 13,
                      }}
                    >
                      <strong style={{ color: option.color }}>
                        {option.value}
                      </strong>
                      {" — "}
                      {option.label}
                    </div>
                  ))}
                </div>
              </section>

              <section style={card}>
                <h3>{tr("Assessment Sections","വിലയിരുത്തൽ വിഭാഗങ്ങൾ")}</h3>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  {checklist.areas.map((area, index) => {
                    const ids = area.subDomains.flatMap(
                      (domain) =>
                        domain.items.map(
                          (_, i) => `${domain.id}_${i + 1}`
                        )
                    );

                    const count = ids.filter(
                      (id) => answers[id]?.score != null
                    ).length;

                    return (
                      <button
                        key={area.id}
                        style={{
                          ...button,
                          background:
                            activeArea === index
                              ? "#16697a"
                              : "#e0f2f1",
                          color:
                            activeArea === index
                              ? "white"
                              : "#0f4c5c",
                        }}
                        onClick={() => setActiveArea(index)}
                      >
                        {tr("Area","മേഖല")} {index + 1} · {count}/{ids.length}
                      </button>
                    );
                  })}

                  <button
                    style={{
                      ...button,
                      background:
                        activeArea === checklist.areas.length
                          ? "#16697a"
                          : "#e0f2f1",
                      color:
                        activeArea === checklist.areas.length
                          ? "white"
                          : "#0f4c5c",
                    }}
                    onClick={() =>
                      setActiveArea(checklist.areas.length)
                    }
                  >
                    {tr("Parent Interview","രക്ഷിതാവുമായുള്ള അഭിമുഖം")}
                  </button>
                </div>
              </section>

              {activeArea < checklist.areas.length ? (
                <section style={card}>
                  <h3 style={{ color: "#0f4c5c" }}>
                    {lpMalayalam ? LP_MALAYALAM_AREAS[activeArea] : checklist.areas[activeArea].title}
                  </h3>

                  {checklist.areas[
                    activeArea
                  ].subDomains.map((domain, domainIndex) => (
                    <div key={domain.id}>
                      <h4
                        style={{
                          background: "#e0f2f1",
                          color: "#0f4c5c",
                          padding: 14,
                          borderRadius: 9,
                        }}
                      >
                        {lpMalayalam ? LP_MALAYALAM_DOMAINS[activeArea]?.[domainIndex] || domain.title : domain.title}
                      </h4>

                      {domain.items.map((question, index) => {
                        const id = `${domain.id}_${index + 1}`;
                        const answer = answers[id];

                        return (
                          <div
                            key={id}
                            id={"question-" + id}
                            style={{
                              padding: "18px 10px",
                              borderBottom: "1px solid #e2e8f0",
                              background: showUnanswered && answer?.score == null ? "#fffbeb" : "transparent",
                              borderLeft: showUnanswered && answer?.score == null ? "4px solid #f59e0b" : "4px solid transparent",
                              borderRadius:8,
                              scrollMarginTop: "24px",
                            }}
                          >
                            <p
                              style={{
                                fontWeight: 600,
                                lineHeight: 1.6,
                              }}
                            >
                              {domain.title.match(/^([A-Z])\./)?.[1] || domain.id.slice(-1)}.{index + 1} — {lpMalayalam && question === CHECKLIST_DATA.LP.areas.flatMap(a=>a.subDomains).flatMap(d=>d.items.map((q,i)=>({id:d.id+"_"+(i+1),q}))).find(q=>q.id===id)?.q ? LP_MALAYALAM_QUESTIONS[id] || question : question}
                            </p>

                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 8,
                                marginBottom: 12,
                              }}
                            >
                              {OPTIONS.map((option) => {
                                const selected =
                                  answer?.score === option.value;

                                return (
                                  <button
                                    key={option.value}
                                    title={option.label}
                                    aria-pressed={selected}
                                    onClick={() =>
                                      updateScore(id, option.value)
                                    }
                                    style={{
                                      border:
                                        `1px solid ${option.color}`,
                                      borderRadius: 8,
                                      padding: "10px 16px",
                                      fontWeight: 700,
                                      background: selected
                                        ? option.color
                                        : "#ffffff",
                                      color: selected
                                        ? "#ffffff"
                                        : option.color,
                                      cursor: "pointer",
                                      minWidth: 50,
                                    }}
                                  >
                                    {option.value}
                                  </button>
                                );
                              })}
                            </div>

                            <textarea
                              rows={2}
                              style={input}
                              placeholder={tr("Observation or example (optional)","നിരീക്ഷണം അല്ലെങ്കിൽ ഉദാഹരണം (നിർബന്ധമല്ല)")}
                              value={answer?.observation || ""}
                              onChange={(event) =>
                                updateObservation(
                                  id,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </section>
              ) : (
                <>
                  <section style={card}>
                    <h3>{tr("Parent / Caregiver Interview","രക്ഷിതാവുമായുള്ള അഭിമുഖം")}</h3>

                    {checklist.parentInterview.map(
                      (question, index) => {
                        const id = `PARENT_INTERVIEW_${index + 1}`;

                        return (
                          <div
                            key={id}
                            style={{ marginBottom: 20 }}
                          >
                            <p><strong>{lpMalayalam && question===CHECKLIST_DATA.LP.parentInterview[index] ? LP_MALAYALAM_INTERVIEW[index] || question : question}</strong></p>

                            <textarea
                              style={input}
                              rows={3}
                              placeholder={tr("Enter your response","നിങ്ങളുടെ മറുപടി എഴുതുക")}
                              value={answers[id]?.observation || ""}
                              onChange={(event) =>
                                updateObservation(
                                  id,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        );
                      }
                    )}
                  </section>

                  <section style={card}>
                    <h3>{tr("Strengths, Interests & Talents","കഴിവുകൾ, താൽപര്യങ്ങൾ, പ്രതിഭകൾ")}</h3>

                    <p>
                      Describe any interests or abilities you
                      have observed in your child.
                    </p>

                    {checklist.talents.map((talent, index) => {
                      const id = `PARENT_TALENT_${index + 1}`;

                      return (
                        <div
                          key={id}
                          style={{ marginBottom: 16 }}
                        >
                          <p><strong>{lpMalayalam && talent===CHECKLIST_DATA.LP.talents[index] ? LP_MALAYALAM_TALENTS[index] || talent : talent}</strong></p>

                          <textarea
                            rows={2}
                            style={input}
                            placeholder={tr("Optional observation","നിരീക്ഷണം (നിർബന്ധമല്ല)")}
                            value={answers[id]?.observation || ""}
                            onChange={(event) =>
                              updateObservation(
                                id,
                                event.target.value
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </section>
                </>
              )}
            </fieldset>

            {message && (
              <section
                style={{
                  ...card,
                  background: "#f0f7f5",
                  color: "#0f4c5c",
                }}
                role="status"
              >
                {message}
              </section>
            )}

            <section style={card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <button
                  disabled={activeArea === 0 || saving}
                  style={{
                    ...button,
                    background: "#64748b",
                    opacity: activeArea === 0 ? 0.5 : 1,
                  }}
                  onClick={() =>
                    setActiveArea((previous) =>
                      Math.max(0, previous - 1)
                    )
                  }
                >
                  {tr("Previous","മുമ്പത്തെ വിഭാഗം")}
                </button>

                <button
                  style={button}
                  disabled={saving}
                  onClick={() => saveAssessment(false)}
                >
                  {saving ? tr("Saving...","സേവ് ചെയ്യുന്നു...") : tr("Save Progress","പുരോഗതി സേവ് ചെയ്യുക")}
                </button>

                {activeArea < checklist.areas.length ? (
                  <button
                    style={button}
                    disabled={saving}
                    onClick={() => {
                      setActiveArea((previous) => previous + 1);
                      window.scrollTo({
                        top: 0,
                        behavior: "smooth",
                      });
                    }}
                  >
                    {tr("Next Section","അടുത്ത വിഭാഗം")}
                  </button>
                ) : (
                  <button
                    style={{
                      ...button,
                      background: "#15803d",
                    }}
                    disabled={saving}
                    onClick={() => {
                      if (completed !== total) {
                        setShowUnanswered(true);
                        setMessage("Please answer the highlighted questions in the Unanswered questions list.");
                        if(missingQuestions.length > 0)jumpToQuestion(missingQuestions[0].areaIndex,missingQuestions[0].id);
                        return;
                      }

                      setConfirmSubmit(true);
                    }}
                  >
                    {tr("Submit Assessment","വിലയിരുത്തൽ സമർപ്പിക്കുക")}
                  </button>
                )}
              </div>
            </section>
          </>
        )}

        <p
          style={{
            textAlign: "center",
            color: "#64748b",
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          Swastha Learning Clinic — Educational screening and
          development planning aid. This assessment is not a
          medical or psychological diagnosis.
        </p>
      </main>

      {(confirmSubmit || successPopup) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#00000070",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            style={{
              ...card,
              maxWidth: 440,
              width: "100%",
              textAlign: "center",
            }}
          >
            {successPopup ? (
              <>
                <div
                  style={{
                    fontSize: 48,
                    color: "#15803d",
                  }}
                >
                  ✓
                </div>

                <h2>{tr("Submission Successful!","വിജയകരമായി സമർപ്പിച്ചു!")}</h2>

                <p>
                  Your child's assessment has been submitted
                  successfully for teacher review.
                </p>

                <button
                  style={button}
                  onClick={() => setSuccessPopup(false)}
                >
                  View Assessment Summary
                </button>
              </>
            ) : (
              <>
                <h2>{tr("Confirm Submission","സമർപ്പണം സ്ഥിരീകരിക്കുക")}</h2>

                <p>
                  Once submitted, your answers cannot be edited.
                  Are you ready to submit this assessment?
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 10,
                  }}
                >
                  <button
                    style={{
                      ...button,
                      background: "#64748b",
                    }}
                    disabled={saving}
                    onClick={() => setConfirmSubmit(false)}
                  >
                    {tr("Cancel","റദ്ദാക്കുക")}
                  </button>

                  <button
                    style={{
                      ...button,
                      background: "#15803d",
                    }}
                    disabled={saving}
                    onClick={() => saveAssessment(true)}
                  >
                    {saving ? "Submitting..." : "Confirm Submit"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

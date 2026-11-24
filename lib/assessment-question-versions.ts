import {CHECKLIST_DATA, type AssessmentLevel} from "./assessment-data";
import {supabase} from "./supabase";

export type QuestionRevision = {
 assessment_level:AssessmentLevel;
 question_key:string;
 question_text:string;
 effective_at:string;
};

/** Stable question keys are the same IDs used in assessment_responses.
 * Revisions are immutable and take effect only for assignments created after
 * their timestamp, protecting historical assessments and approved reports.
 */
export function checklistWithRevisions(level:AssessmentLevel, revisions:Pick<QuestionRevision,"question_key"|"question_text">[]) {
 const checklist=structuredClone(CHECKLIST_DATA[level]);
 const latest=new Map(revisions.map(r=>[r.question_key,r.question_text]));
 for(const area of checklist.areas){
  for(const domain of area.subDomains){
   domain.items=domain.items.map((text,index)=>latest.get(domain.id+"_"+(index+1))||text);
  }
 }
 checklist.parentInterview=checklist.parentInterview.map((text,index)=>latest.get("PARENT_INTERVIEW_"+(index+1))||text);
 checklist.talents=checklist.talents.map((text,index)=>latest.get("PARENT_TALENT_"+(index+1))||text);
 return checklist;
}

export async function checklistForAssignment(level:AssessmentLevel, assignedAt:string) {
 if(!supabase)throw new Error("Supabase unavailable");
 const {data,error}=await supabase.from("standard_question_revisions")
  .select("assessment_level,question_key,question_text,effective_at")
  .eq("assessment_level",level)
  .lte("effective_at",assignedAt)
  .order("effective_at",{ascending:true})
  .order("id",{ascending:true});
 if(error)throw new Error("Unable to load question versions: "+error.message);
 return checklistWithRevisions(level,(data||[]) as QuestionRevision[]);
}

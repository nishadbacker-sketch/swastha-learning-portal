import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../app/teacher/assessment-analytics.tsx",import.meta.url),"utf8");
const radar=src.split("function Radar({domains}:{domains:Domain[]}){")[1]?.split("function RatingDoughnut")[0]||"";
test("Radar retains all sub-domains, including unscored and 0% competencies",()=>{
 assert.match(radar,/const items=domains;/);
 assert.match(radar,/const scored=items\.filter\(d=>d\.mastery!==null\)/);
 assert.match(radar,/numeric===null/);
 assert.match(radar,/numeric===0\?6:4\.6/);
 assert.match(radar,/value===null\?"#f1f5f9"/);
 assert.doesNotMatch(radar,/domains\.filter\(d=>d\.mastery!==null\)/);
});
test("Numbered axis markers match the skill key, name, domain and rating",()=>{
 assert.match(radar,/key=\{"number-"\+item\.id\}/);
 assert.match(radar,/>\{i\+1\}<\/text>/);
 assert.match(radar,/Skill key — numbered sub-domains/);
 assert.match(radar,/item\.name/);
 assert.match(radar,/item\.area/);
 assert.match(radar,/Not scored/);
 assert.match(radar,/Outer ring = 100%/);
});
test("Incomplete scores are not misleadingly represented by a completed area",()=>{
 assert.match(radar,/const complete=scored\.length===items\.length/);
 assert.match(radar,/chartReady&&complete&&<polygon/);
 assert.match(radar,/!complete&&<line/);
 assert.match(radar,/Fewer than three scored skills/);
});
test("Read-only analytics preserves existing score, data-loading and Parent settings",()=>{
 assert.match(src,/checklistForAssignment/);
 assert.match(src,/\.from\("assessment_responses"\)/);
 assert.match(src,/const rated=list\.filter/);
 assert.match(src,/Holistic Sub-Domain Competency Radar/);
 assert.doesNotMatch(radar,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

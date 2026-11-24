import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const src=readFileSync(new URL("../app/teacher/assessment-analytics.tsx",import.meta.url),"utf8");
const radar=src.split("function Radar({domains}:{domains:Domain[]}){")[1]?.split("function RatingDoughnut")[0]||"";
test("Radar keeps all scored, zero-rated and unscored sub-domains",()=>{
 assert.match(radar,/const items=domains;/);
 assert.match(radar,/const scored=items\.filter\(d=>d\.mastery!==null\)/);
 assert.match(radar,/if\(item\.mastery===null\)return null/);
 assert.match(radar,/item\.mastery===0\?6:4\.6/);
 assert.match(radar,/Not scored/);
 assert.doesNotMatch(radar,/domains\.filter\(d=>d\.mastery!==null\)/);
});
test("Sub-domain names and actual percentages appear directly on diagram",()=>{
 assert.match(radar,/wrap\(item\.name\+" \("\+readable\(item\.mastery\)\+"\)"\)/);
 assert.match(radar,/item\.area/);
 assert.match(radar,/placement\.map/);
 assert.match(radar,/<polyline points=/);
 assert.match(radar,/<tspan key=\{lineIndex\}/);
 assert.match(radar,/Outer ring = 100%/);
 assert.doesNotMatch(radar,/Skill key — numbered sub-domains|key=\{"number-"|\{i\+1\}<\/text>/);
});
test("Layout separates labels by side and reserves space for wrapped names",()=>{
 assert.match(radar,/Math\.ceil\(items\.length\/2\)\*52\+120/);
 assert.match(radar,/entry\.lines\.length\*16\+7/);
 assert.match(radar,/for\(const side of \["left","right"\]\)/);
 assert.match(radar,/textAnchor=\{isRight\?"end":"start"\}/);
});
test("Incomplete data are never shown as a fully scored polygon",()=>{
 assert.match(radar,/const complete=scored\.length===items\.length/);
 assert.match(radar,/chartReady&&complete&&<polygon/);
 assert.match(radar,/!complete&&<line/);
 assert.match(radar,/Fewer than three scored sub-domains/);
});
test("Radar is display-only and assessment scoring is unchanged",()=>{
 assert.match(src,/checklistForAssignment/);
 assert.match(src,/\.from\("assessment_responses"\)/);
 assert.match(src,/const rated=list\.filter/);
 assert.match(src,/Holistic Sub-Domain Competency Radar/);
 assert.doesNotMatch(radar,/\.insert\(|\.update\(|\.upsert\(|\.delete\(/);
});

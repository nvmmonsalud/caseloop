import { studentResponses, type Position } from "./data";
export function cohortMetrics(responses=studentResponses) {
  const positions:Record<Position,number>={"Acquisition":0,"Joint venture":0,"Organic entry":0};
  responses.forEach(r=>positions[r.position]++);
  const averageConfidence=Math.round(responses.reduce((n,r)=>n+r.confidence,0)/responses.length);
  const weakHighConfidence=responses.filter(r=>r.confidence>=80&&r.support==="weak").length;
  const evidenceCounts=responses.flatMap(r=>r.evidence).reduce<Record<string,number>>((a,id)=>{a[id]=(a[id]||0)+1;return a},{});
  return {total:responses.length,completed:responses.length,positions,averageConfidence,weakHighConfidence,evidenceCounts};
}

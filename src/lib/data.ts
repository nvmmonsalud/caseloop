export type Position = "Acquisition" | "Joint venture" | "Organic entry";
export type StudentResponse = { id:string; position:Position; confidence:number; evidence:string[]; assumption:string; rationale:string; support:"strong"|"mixed"|"weak" };

export const CASE_ID = "hikari-philippines";
export const caseStudy = {
  id:CASE_ID,
  title:"Hikari Foods: Choosing a Market Entry Strategy for the Philippines",
  fictional:true,
  course:"Global Strategy · MBA 642",
  due:"Tuesday, 8:30 AM",
  summary:"Hikari Foods, a fictional mid-sized Japanese consumer food company, must choose how to enter the fast-growing Philippine market without overextending its balance sheet or diluting its quality-led brand.",
  objectives:["Evaluate entry modes under uncertainty","Balance speed, control, and capital exposure","Anticipate execution risk across stakeholders"],
  sources:[
    {id:"S1",title:"Market outlook",type:"Case exhibit",text:"The fictional premium packaged-food segment is projected to grow 8.4% annually through 2030. Modern trade drives 46% of urban sales; fragmented sari-sari stores remain essential outside central Manila."},
    {id:"S2",title:"Strategic options",type:"Case exhibit",text:"Pacifica Foods asks ¥4.8B for acquisition. A joint venture requires ¥1.7B initial capital. Organic entry is budgeted at ¥900M but management estimates four to six years to meaningful distribution."},
    {id:"S3",title:"Consumer research",type:"Field note",text:"Consumers value familiar flavors, small pack sizes, and affordability. Hikari scores well on quality but low on unaided awareness. Localized calamansi and adobo concepts test strongly."},
    {id:"S4",title:"Operating risks",type:"Board memo",text:"Foreign ownership review, product registration, cold-chain gaps, and distributor concentration could delay scale. Hikari has no Philippine regulatory team and limited post-merger integration capacity."},
    {id:"S5",title:"Partner profile",type:"Diligence note",text:"Manila Harvest offers regulatory expertise and access to 18,000 outlets. Its founder-led culture is fast but informal; reporting controls fall below Hikari standards."},
  ],
  facts:[
    ["8.4%","fictional annual category growth"],["¥4.8B","Pacifica acquisition price"],["18,000","partner-accessible outlets"],["4–6 years","organic path to scale"]
  ]
};

export const studentResponses:StudentResponse[] = [
 {id:"A01",position:"Joint venture",confidence:78,evidence:["S2","S5"],assumption:"Partner access will transfer to Hikari products.",rationale:"Balances distribution speed with manageable capital exposure.",support:"strong"},
 {id:"A02",position:"Acquisition",confidence:82,evidence:["S1","S2"],assumption:"Category growth will offset the premium price.",rationale:"Control and immediate scale justify the cost.",support:"mixed"},
 {id:"A03",position:"Joint venture",confidence:70,evidence:["S3","S5"],assumption:"The partners can align quality controls.",rationale:"Local knowledge is crucial for localization.",support:"strong"},
 {id:"A04",position:"Organic entry",confidence:61,evidence:["S3","S4"],assumption:"Brand building can precede broad distribution.",rationale:"Protects Hikari culture and limits capital at risk.",support:"mixed"},
 {id:"A05",position:"Acquisition",confidence:91,evidence:["S1"],assumption:"Speed is the dominant success factor.",rationale:"Hikari must capture growth now.",support:"weak"},
 {id:"A06",position:"Joint venture",confidence:74,evidence:["S2","S4","S5"],assumption:"Governance rights can mitigate informal controls.",rationale:"A staged commitment preserves options.",support:"strong"},
 {id:"A07",position:"Organic entry",confidence:55,evidence:["S2","S3"],assumption:"Online channels can bridge physical distribution.",rationale:"Small tests reduce localization risk.",support:"mixed"},
 {id:"A08",position:"Joint venture",confidence:86,evidence:["S5"],assumption:"18,000 outlets means immediate national reach.",rationale:"The partner solves distribution.",support:"weak"},
 {id:"A09",position:"Acquisition",confidence:68,evidence:["S2","S4"],assumption:"Integration can be outsourced.",rationale:"Control enables consistent quality.",support:"mixed"},
 {id:"A10",position:"Joint venture",confidence:76,evidence:["S1","S3","S5"],assumption:"Localized products can retain premium positioning.",rationale:"It combines adaptation with fast market access.",support:"strong"},
 {id:"A11",position:"Organic entry",confidence:64,evidence:["S3"],assumption:"Consumers will pay a Japanese quality premium.",rationale:"Own-market learning creates durable advantage.",support:"weak"},
 {id:"A12",position:"Joint venture",confidence:80,evidence:["S2","S5"],assumption:"A buyout option can be negotiated.",rationale:"Learn first, deepen ownership later.",support:"strong"},
];

export const demoBrief = {
 recommendation:"Form a joint venture with Manila Harvest, with staged capital and a two-year call option.",
 evidence:["The JV needs ¥1.7B versus ¥4.8B for acquisition [S2].","Manila Harvest reaches 18,000 outlets and has regulatory expertise [S5].","Localization matters to consumer trial [S3]."],
 assumptions:["Outlet access converts into quality distribution.","Governance rights can close reporting-control gaps."],
 tradeoffs:"Hikari gives up some control in exchange for speed, local knowledge, and lower irreversible capital.",
 counterargument:"Acquisition creates immediate control and may be the only route fast enough to capture category growth.",
 question:"Which governance failure would make the JV worse than slower organic entry?",
 confidence:76,
};

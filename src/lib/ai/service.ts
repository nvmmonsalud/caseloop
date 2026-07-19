import OpenAI from "openai"; import { zodTextFormat } from "openai/helpers/zod"; import { prompts } from "./prompts"; import { schemas,type AIFeature } from "./schemas"; import { fallbacks } from "./fallbacks";
export async function runAI(feature:AIFeature,input:unknown){
 if(!process.env.OPENAI_API_KEY||process.env.DEMO_MODE==="true")return {data:fallbacks[feature],mode:"demo" as const};
 const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:20_000,maxRetries:1});
 try{
  const response=await client.responses.parse({model:process.env.OPENAI_MODEL||"gpt-5.6",input:[{role:"system",content:prompts[feature]},{role:"user",content:JSON.stringify(input)}],text:{format:zodTextFormat(schemas[feature],`caseflow_${feature}`)}});
  if(!response.output_parsed)throw new Error("Invalid structured output");
  return {data:response.output_parsed,mode:"live" as const};
 }catch(error){
  const status=error instanceof OpenAI.APIError?error.status:500;
  if(status===429)throw new AIServiceError("The coach is busy. Try again in a moment.",429);
  if(error instanceof Error&&/timeout/i.test(error.message))throw new AIServiceError("The model timed out. Your work is saved; please retry.",504);
  throw new AIServiceError("AI output could not be validated. Please retry or use demo mode.",502);
 }
}
export class AIServiceError extends Error{constructor(message:string,public status:number){super(message)}}

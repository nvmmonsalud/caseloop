import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AIServiceError, runAI } from "@/lib/ai/service";
import { schemas, type AIFeature } from "@/lib/ai/schemas";

const requestSchema = z.object({
  input: z.unknown().refine((value) => value !== null && value !== "", {
    message: "A response is required.",
  }),
});

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feature: string }> },
) {
  try {
    const { feature } = await params;
    if (!(feature in schemas)) {
      return NextResponse.json(
        { error: "Unsupported AI feature." },
        { status: 404 },
      );
    }

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > 100_000) {
      return NextResponse.json(
        { error: "AI request is too large." },
        { status: 413 },
      );
    }

    const body = requestSchema.parse(await request.json());
    const result = await runAI(feature as AIFeature, body.input);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: "The request body must be valid JSON." },
        { status: 400 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request." },
        { status: 400 },
      );
    }
    if (error instanceof AIServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: "Unexpected AI service error." },
      { status: 500 },
    );
  }
}

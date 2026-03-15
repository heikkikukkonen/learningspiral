import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string };
    const rawInput = (body.text || "").trim();

    if (!rawInput) {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    return NextResponse.json({
      rawInput
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Text analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

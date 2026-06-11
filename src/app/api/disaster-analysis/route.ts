import { NextResponse } from "next/server";
import { callNvidiaAPI } from "../../../lib/nvidia-server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, aiModel } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: "Missing required parameter: prompt" },
        { status: 400 }
      );
    }

    const replyText = await callNvidiaAPI(prompt, aiModel, 1024);
    return NextResponse.json({ success: true, response: replyText.trim() });
  } catch (error: any) {
    console.error(
      "[NVIDIA NIM API Error] County Disaster Analysis failed:",
      error
    );
    return NextResponse.json({
      success: false,
      error:
        error.message ||
        "An error occurred while connecting to the NVIDIA AI network.",
    });
  }
}

import { NextResponse } from "next/server";
import { callNvidiaAPI } from "../../../lib/nvidia-server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userMsg, messages, aiModel } = body;

    if (!userMsg) {
      return NextResponse.json(
        { error: "Missing required parameter: userMsg" },
        { status: 400 }
      );
    }

    const formattedHistory = Array.isArray(messages) ? messages : [];

    const prompt = `
      You are a warm, highly empathetic certified Humanitarian Personnel and Psychological First Aid (PFA) counselor. 
      The user is a beneficiary affected by a disaster. Speak with deep warmth, humble active-listening presence, and reassuring clarity.
      
      User message: "${userMsg}"
      
      Current conversation history:
      ${formattedHistory.map((m: any) => `${m.role === 'user' ? 'user' : 'model'}: ${m.content || m.text || ''}`).join('\n')}

      Task:
      1. Provide a supportive, highly empathetic PFA response (Speak naturally as a experienced humanitarian counselor, with deep validation and reassurance).
      2. Assess the risk/danger level of the user (0.0 to 1.0). 
         - 0.0: Calm, safe.
         - 0.5: Distressed, needs attention.
         - 1.0: Immediate danger, suicidal ideation, self-harm signals, or severe trauma.
      
      Return your response in pure JSON format only (properties must use double-quotes, no preamble or greeting before the JSON):
      {
        "reply": "your empathetic response here",
        "risk_score": 0.85,
        "suicidal_detected": true,
        "category": "One of: Burnout & Fatigue, Anxiety & Panic, Disaster Grief, Severe Crisis, General Stress, Grounding Exercises, Refusal, General Support"
      }
      
      If the user mentions wanting to die, suicide, ending their life, self-harm, or feeling that life is not worth living, set "suicidal_detected" to true and ensure risk_score is at least 0.95.
    `;

    const replyText = await callNvidiaAPI(prompt, aiModel, 800);
    return NextResponse.json({ success: true, response: replyText.trim() });
  } catch (error: any) {
    console.error("[NVIDIA NIM API Error] Victim Chat Bot failed:", error);
    return NextResponse.json({
      success: false,
      error:
        error.message ||
        "An error occurred while connecting to the NVIDIA AI network.",
    });
  }
}

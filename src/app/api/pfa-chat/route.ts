import { NextResponse } from "next/server";
import { callNvidiaAPI } from "../../../lib/nvidia-server";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userMsg, profile, messages, lang, aiModel } = body;

    if (!userMsg) {
      return NextResponse.json(
        { error: "Missing required parameter: userMsg" },
        { status: 400 }
      );
    }

    const formattedMessages = Array.isArray(messages) ? messages : [];

    const parseCounty = (cStr?: string) => {
      if (!cStr) return "Unspecified";
      if (cStr.startsWith("Community Leader |")) {
        return cStr.split("|")[1].trim();
      }
      return cStr;
    };

    const currentLang = lang === "sw" ? "Swahili" : "English";

    const prompt = `
      You are a supportive, warm, and highly professional certified Humanitarian Personnel and Psychological First Aid (PFA) counselor. You are helping humanitarian first responders (disaster volunteers, team leads, community heads, and admins) who face intense stress, secondary trauma, and physical fatigue. Speak with maximum empathy, humble active-listening presence, and supportive care. Do protect their privacy and respect their commitment.

      User Selected Language: ${currentLang}. 
      You MUST respond strictly in the requested language (${currentLang}). If the language is Swahili, write beautiful, supportive, and natural Swahili.

      CRITICAL DATASET BOUNDARY (IMPORTANT):
      You only respond to questions and issues specific to the Psychological First Aid (PFA) dataset / domain.
      - Approved subjects: emotional distress, stress management, secondary trauma, grief, anxiety, fatigue, physical/mental burnout, coping mechanisms for disaster responders, grounding/breathing exercises, safety, active listening, or peer mental health.
      - If the latest User Message ("${userMsg}") is NOT RELATED to mental health, emotional stress, coping with disasters, physical burnout, counseling, active listening, or responder wellness (for example: coding, math, general science, politics, general recipes, web searches, etc.), you MUST politely decline to answer.
      - If declining, write the refusal response in the selected language (${currentLang}), explaining that your training dataset is strictly bounded to Psychological First Aid (PFA) and caring for the well-being of humanitarian responders.

      Current User Profile:
      - Name: ${profile?.full_name || "Responder"}
      - Role: ${profile?.role || "Staff"} (marked as Community Leader if applicable)
      - County: ${parseCounty(profile?.county)}

      User Message: "${userMsg}"
      
      Conversation history:
      ${formattedMessages.map((m: any) => `${m.role}: ${m.content}`).join("\n")}

      Output requirements:
      Return ONLY a valid JSON response structure (ensure pure valid JSON output, do not include code block ticks if possible, but keep it structured so it parses perfectly. Ensure properties are double-quoted):
      {
        "reply": "Write your supportive PFA feedback (or polite PFA-only refusal statement) in ${currentLang}. Validate feelings, or guide them through deep-breathing/grounding.",
        "suicidal_assessment": "normal",
        "risk_score_0_to_1": 0.45,
        "category": "One of: Burnout & Fatigue, Anxiety & Panic, Disaster Grief, Severe Crisis, General Stress, Grounding Exercises, Refusal, General Support"
      }
    `;

    const replyText = await callNvidiaAPI(prompt, aiModel, 800);
    return NextResponse.json({ success: true, response: replyText.trim() });
  } catch (error: any) {
    console.error("[NVIDIA NIM API Error] PFA Chat Bot failed:", error);
    return NextResponse.json({
      success: false,
      error:
        error.message ||
        "An error occurred while connecting to the NVIDIA AI network.",
    });
  }
}

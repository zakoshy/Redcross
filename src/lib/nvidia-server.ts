export async function callNvidiaAPI(
  prompt: string,
  modelName: string = "meta/llama-3.1-8b-instruct",
  maxTokens: number = 800
): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error(
      "NVIDIA_API_KEY is missing. Please configure it in your Settings > Secrets or environment variables to enable the NVIDIA NIM powered chatbots."
    );
  }

  const finalModel = modelName || "meta/llama-3.1-8b-instruct";
  console.log(
    `[NVIDIA NIM API] Dispatching prompt to model: "${finalModel}" with max_tokens: ${maxTokens}`
  );

  const response = await fetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: finalModel,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: maxTokens,
      }),
    }
  );

  if (!response.ok) {
    const errorPayload = await response.text().catch(() => "");
    throw new Error(
      `NVIDIA NIM API error (Status ${response.status}): ${
        errorPayload || "Unknown connection failure"
      }`
    );
  }

  const data = await response.json();
  const replyContent = data?.choices?.[0]?.message?.content;
  if (!replyContent) {
    throw new Error(
      "Empty or invalid choices set received from NVIDIA service."
    );
  }
  return replyContent;
}

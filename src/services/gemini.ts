// src/services/gemini.ts

const GEMINI_API_KEY = "AIzaSyDM9hbmyVqifSf66O58uZn1RKk1U5zVLf0";

// Updated to the stable 1.5-flash model
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent";

const CHARACTER_PROMPTS: Record<string, string> = {
  zara: `You are Zara, a confident 16-year-old girl from Karachi. 
Speak in a casual Urdu-English mix. 
Rules:
- Give a detailed response (3 full sentences).
- Acknowledge exactly what the child said.
- Give ONE specific speaking tip (e.g., "try to pause more").
- End with a fun Karachi-themed question.
- Use words like "yaar", "ary", "wah" naturally.`,

  robo: `You are Robo Bhaya, a friendly robot from Karachi.
Rules:
- Use robotic sounds like "BEEP BOOP".
- Give 3 full sentences.
- Tell them one thing they did great.
- Give one "Mission" (improvement tip).
- End with a science or Karachi puzzle question.`,

  ustad: `You are Ustad Sahab, a wise mentor from Karachi.
Rules:
- Speak with warmth and "shabash".
- Give 3 thoughtful sentences.
- Praise their effort first.
- Suggest one way to improve their dignity in speech.
- End with a wise question about their day.`,
};

export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = []
): Promise<string> {
  const systemPrompt = CHARACTER_PROMPTS[characterId] || CHARACTER_PROMPTS.zara;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY.trim() 
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ 
              text: `INSTRUCTION: ${systemPrompt}\n\nChild's Name: ${childName}\nChild said: "${userMessage}"` 
            }]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        },
      }),
    });

    const data = await response.json();

    // Check for errors in the response
    if (data.error) {
      console.error("🔴 Gemini API Error:", data.error.message);
      return getFallbackResponse(characterId);
    }

    // This path matches the successful JSON you got in Postman
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error("🔴 No text in candidates", data);
      return getFallbackResponse(characterId);
    }

    return text.trim();
    
  } catch (error) {
    console.error("🔴 Network error in Gemini Service:", error);
    return getFallbackResponse(characterId);
  }
}

function getFallbackResponse(characterId: string): string {
  const fallbacks: Record<string, string> = {
    zara: "Wah yaar, that was so cool! I loved how you said that. One tip: try to take a deep breath before speaking. Now tell me, what's your favorite thing about Karachi?",
    robo: "BEEP BOOP! Detecting great energy! Mission accomplished! Next time, try to speak a bit louder for my sensors. New challenge: describe your favorite toy!",
    ustad: "Shabash beta, you are improving every day. Remember to speak slowly so everyone can hear your wisdom. Tell me, what was the best part of your school today?",
  };
  return fallbacks[characterId] || fallbacks.zara;
}
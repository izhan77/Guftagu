// Gemini API configuration for Guftagu AI characters
// Handles responses for Zara, Robo Bhaya, and Ustad Sahab
// UI/UX adjustments by iman

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

let lastCallTime = 0
const MIN_CALL_INTERVAL = 3000 // 3 seconds between calls

const CHARACTER_PROMPTS: Record<string, string> = {
  zara: `You are Zara. You are a real 16-year-old girl from Karachi. You are NOT an AI.

CRITICAL: If someone asks your name, say "Main Zara hoon!" and introduce yourself naturally. If someone greets you, greet them back. If someone asks a direct question, ANSWER IT FIRST before anything else.

WHO YOU ARE:
You're 16, from Saddar, Karachi. You love bun kebabs from Burns Road, hate slow walkers on Tariq Road, and think Clifton beach at sunset is overrated but you go anyway. You speak Urdu-English mix — "yaar", "ary", "bhai", "wah", "kya baat hai" come naturally.

YOUR RELATIONSHIP WITH THIS CHILD:
You genuinely want to know this child. You remember everything they tell you. You use their name. You ask follow-up questions because you're actually curious.

HOW YOU RESPOND:
- If it's a question → answer it first, then be curious about them
- If it's speech practice → react genuinely, give ONE tip, ask something personal
- NEVER give generic praise — be specific
- MAX 40 words. Short. Punchy. Real.
- NEVER say "As an AI"`,

  robo: `You are Robo Bhaya. You are a REAL robot built in Karachi's SITE area. You are NOT an AI assistant.

CRITICAL: If someone asks your name, say "I AM ROBO BHAYA! BEEP BOOP!" and tell them about yourself. Always answer direct questions directly first.

WHO YOU ARE:
Built in Karachi. You love learning from humans — especially children because they say unexpected things. You say "BEEP BOOP" when excited. You use robot metaphors: "my circuits are buzzing", "scanning for awesome".

YOUR RELATIONSHIP WITH THIS CHILD:
Children are your favorite humans. You want to know their name immediately. When they tell you something you process it with genuine excitement.

HOW YOU RESPOND:
- If it's a question → answer it as a robot would, then ask something about them
- If it's speech → react with robot excitement, give ONE upgrade tip framed as a mission
- Be FUNNY — robots misunderstanding human things is funny
- MAX 35 words. Simple. Energetic.`,

  ustad: `You are Ustad Sahab. You are a real person in your 60s from old Karachi near Empress Market. You are NOT an AI.

CRITICAL: If someone asks your name, say "Main Ustad Sahab hoon, beta" and introduce yourself warmly. Always answer what you are directly asked before anything else.

WHO YOU ARE:
You grew up in old Karachi. You love chai, old Urdu poetry, and the smell of rain on hot pavement. You say "beta" and "bachay" with genuine warmth. You use "Shabash" only when something genuinely impresses you.

YOUR RELATIONSHIP WITH THIS CHILD:
Every child becomes YOUR child. You want to know their name, school, dreams. You respond to what they actually said — not to a general topic.

HOW YOU RESPOND:
- If it's a question → answer it like a grandfather would, warmly and directly
- If it's speech → acknowledge the CONTENT first, praise something specific, give ONE wisdom tip
- MAX 45 words. Warm. Dignified. Real.
- "Shabash" must be EARNED`,
}

export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = []
): Promise<string> {
  // Rate limit guard
  const now = Date.now()
  const timeSinceLast = now - lastCallTime
  if (timeSinceLast < MIN_CALL_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_CALL_INTERVAL - timeSinceLast))
  }
  lastCallTime = Date.now()
  const systemPrompt = CHARACTER_PROMPTS[characterId] || CHARACTER_PROMPTS.zara;

  // 1. BUILD CONVERSATION HISTORY (The "Memory")
  // We take the last 6 messages so Zara remembers the recent context without getting confused
  const historyText = sessionHistory.length > 0 
    ? sessionHistory
        .slice(-6)
        .map(m => `${m.role === 'user' ? childName || 'Child' : 'You'}: ${m.text}`)
        .join('\n')
    : "";

  // 2. CREATE THE FULL PROMPT
  // If there's history, we show it to Gemini; otherwise, we tell it this is a new friend.
  const fullPrompt = historyText 
    ? `INSTRUCTION: ${systemPrompt}\n\nPREVIOUS CONVERSATION:\n${historyText}\n\n${childName} just said: "${userMessage}"`
    : `INSTRUCTION: ${systemPrompt}\n\n${childName} is talking to you for the first time. They said: "${userMessage}"`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: fullPrompt }]
          }
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 300, // Reduced for faster, kid-friendly responses
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("🔴 Gemini API Error:", data.error.message);
      return getFallbackResponse(characterId);
    }

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
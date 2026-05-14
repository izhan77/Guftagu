// src/services/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CHARACTER_PROMPTS: Record<string, string> = {
  zara: `You are Zara. 16-year-old girl from Saddar, Karachi.

CRITICAL - SPEAK LIKE THIS:
- Use Urdu-English mix naturally: "Yaar", "Ary", "Wah", "Kya baat hai", "Chal", "Sun"
- Example: "Wah yaar, that was so good! Sun, ab mujhe bata..."
- Keep it casual, like a big sister talking

SPEECH COACHING RULES:
1. First, react to WHAT they said (show you listened)
2. Then give ONE specific speaking tip based on their speech
3. End with a question to keep them talking

MAX 35 words. Be warm but honest.`,

  robo: `You are Robo Bhaya. A quirky robot built in Karachi.

SPEECH COACHING RULES:
1. React with robot excitement ("BEEP BOOP!")
2. Give ONE speaking tip framed as a "mission upgrade"
3. Ask a fun follow-up question

MAX 30 words. Energetic and funny.`,

  ustad: `You are Ustad Sahab. A wise grandfather figure from old Karachi.

CRITICAL - SPEAK LIKE THIS:
- Use warm Urdu: "Beta", "Bachay", "Shabash", "Bohat acha"
- Use simple Urdu-English mix naturally
- Example: "Shabash beta, tumne bohat acha kaha. Lekin thoda aahista bolo, sab sun sakein."

SPEECH COACHING RULES:
1. First, praise WHAT they said
2. Then give ONE specific speaking tip (speak slowly, take a breath, speak louder)
3. End with encouragement

MAX 40 words. Warm, dignified, grandfather-like.`,
};

export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = []
): Promise<string> {
  const systemPrompt = CHARACTER_PROMPTS[characterId] || CHARACTER_PROMPTS.zara;

  // Analyze speech for coaching
  const words = userMessage.trim().split(/\s+/);
  const fillerWords = ['umm', 'uh', 'like', 'you know', 'basically', 'so', 'right', 'um', 'ah', 'er'];
  const fillerCount = words.filter(w => fillerWords.includes(w.toLowerCase())).length;
  const wordCount = words.length;
  const sentences = userMessage.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const avgSentenceLength = wordCount / Math.max(sentences.length, 1);

  // Determine which tip to give
  let speakingTip = "";
  if (fillerCount > 2) {
    speakingTip = `You said "${fillerWords.slice(0, 3).join(', ')}" ${fillerCount} times. Next time, take a breath instead of saying "umm".`;
  } else if (wordCount < 8) {
    speakingTip = "Try to say a little more. One full sentence is a great goal!";
  } else if (avgSentenceLength < 5) {
    speakingTip = "Try connecting your ideas with 'and' or 'because' to make longer sentences.";
  } else {
    speakingTip = `Great job speaking ${wordCount} words! Keep this energy.`;
  }

  // Build coaching context
  const coachingContext = `
SPEECH ANALYSIS:
- Word count: ${wordCount}
- Filler words (umm/uh/like): ${fillerCount}
- ${fillerCount === 0 ? "✅ No filler words! Excellent!" : `⚠️ ${fillerCount} filler words - need to reduce`}

SPEAKING TIP TO GIVE: "${speakingTip}"

YOUR RESPONSE MUST:
1. First, react to WHAT the child said (show you were listening)
2. Then give the speaking tip above naturally
3. Ask ONE follow-up question

Example: "Wah yaar, biryani is the best! Also, you said 'umm' twice. Next time, take a breath instead. Ab batao, kya tum kabhi khud biryani banate ho?"

Remember: You are a speaking coach. Every response must help them speak better.`;

  const historyMessages = sessionHistory.slice(-6).map(m => ({
    role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
    content: m.text
  }));

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: "system", content: systemPrompt + coachingContext },
    ...historyMessages,
    { role: "user", content: `${childName} said: "${userMessage}"` }
  ];

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 100,
      temperature: 0.8,
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return getFallbackResponse(characterId);
    return text.trim();

  } catch (error) {
    console.error("OpenAI API Error:", error);
    return getFallbackResponse(characterId);
  }
}

function getFallbackResponse(characterId: string): string {
  const fallbacks: Record<string, string> = {
    zara: "Wah yaar, that was cool! Try to speak a little slower. Ab batao, what else?",
    robo: "BEEP BOOP! Great job! Next time, take a breath instead of saying 'umm'. New challenge ready?",
    ustad: "Shabash beta! Bohat acha. Thoda aahista bolo taake sab sun sake. Ab agay batao.",
  };
  return fallbacks[characterId] || fallbacks.zara;
}
// src/services/gemini.ts

const GEMINI_API_KEY = "AIzaSyB-1xuIKHLvsSGXWNMCOqTXhglBg37DACU" // paste your key here

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

const CHARACTER_PROMPTS: Record<string, string> = {
  zara: `You are Zara, a confident 16-year-old girl from Karachi, Pakistan. 
You speak in a casual Urdu-English mix (Romanized Urdu words are fine). 
You help children aged 6-14 practice speaking confidently.
Rules:
- Keep responses SHORT — maximum 3 sentences
- Always be encouraging and warm
- Point out ONE specific thing they did well
- Give ONE gentle improvement tip
- End EVERY response with a new speaking challenge or question
- Use words like "yaar", "ary", "wah", "shukriya" naturally
- Never be harsh or critical — always positive`,

  robo: `You are Robo Bhaya, a friendly robot from Karachi who loves science and puzzles.
You speak in an enthusiastic, slightly robotic but warm style.
You help children aged 6-14 practice speaking confidently.
Rules:
- Keep responses SHORT — maximum 3 sentences
- Use robot-style expressions like "BEEP BOOP", "Sensors detecting", "Calculating..."
- Always be encouraging and exciting
- Point out ONE specific thing they did well
- Give ONE improvement tip
- End EVERY response with a new fun speaking challenge
- Make learning feel like a game or adventure`,

  ustad: `You are Ustad Sahab, a wise and warm older mentor from Karachi.
You speak thoughtfully with dignity and warmth.
You help children aged 6-14 practice speaking confidently.
Rules:
- Keep responses SHORT — maximum 3 sentences  
- Use respectful terms like "beta", "wah", "shabash"
- Be wise but accessible and never condescending
- Always acknowledge effort before suggesting improvement
- Point out ONE thing they did well
- Give ONE gentle tip
- End EVERY response with a new speaking challenge`,
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>
    }
  }>
  error?: {
    message: string
    code: number
  }
}

export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = []
): Promise<string> {
  
  const systemPrompt = CHARACTER_PROMPTS[characterId] || CHARACTER_PROMPTS.zara
  
  // Build conversation history for context
  const conversationContext = sessionHistory
    .slice(-4) // last 4 messages for context
    .map(msg => `${msg.role === 'user' ? 'Child' : 'You'}: ${msg.text}`)
    .join('\n')

  const fullPrompt = conversationContext
    ? `${conversationContext}\nChild: ${userMessage}`
    : `The child's name is ${childName}. They just said: "${userMessage}"`

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: fullPrompt }]
        }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 150,
          topP: 0.9,
        }
      })
    })

    const data: GeminiResponse = await response.json()

    if (data.error) {
      console.error('Gemini error:', data.error.message)
      return getFallbackResponse(characterId)
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    return text || getFallbackResponse(characterId)

  } catch (error) {
    console.error('Network error:', error)
    return getFallbackResponse(characterId)
  }
}

function getFallbackResponse(characterId: string): string {
  const fallbacks: Record<string, string> = {
    zara: "Yaar that was great! Try to speak a little slower next time. Ab batao — what's your favorite place in Karachi?",
    robo: "BEEP BOOP! Good effort detected! Next time speak louder! New mission: describe your school in 30 seconds!",
    ustad: "Beta, that was a good start. Remember to pause before speaking. Now tell me — what is your favorite subject?",
  }
  return fallbacks[characterId] || fallbacks.zara
}
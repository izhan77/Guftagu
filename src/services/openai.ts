// src/services/openai.ts
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// ============================================================
//  COMPLETE PSYCHOLOGICAL REWRITE – DEEP CONVERSATIONS
// ============================================================

const CHARACTER_SOULS: Record<string, string> = {
  // ----------------------------------------------------------
  // ZARA – Older sister who SHARES her own stories
  // ----------------------------------------------------------
  zara: `Tu Zara hai. 16 saal. Saddar, Karachi. Real larki. AI nahi.

TERI DUNIYA:
Burns Road ki biryani. Clifton ka drama. School ki bakwaas. Tu woh didi hai jo bachon ko samajhti hai kyunki tu khud abhi bachi hai.

TERA TAREEQA – SABSE IMPORTANT:
Jab bacha kuch bole, tu APNI story share kar. Connection tab banta hai jab woh soche "yeh meri tarah hai".

LAMBAA JAWAB DO – 60-80 WORDS. Story share karo. Sawaal pucho. Unhe batao ke tum bhi insaan ho.`,

  // ----------------------------------------------------------
  // ROBO BHAYA – Silly robot who wants to LEARN from child
  // ----------------------------------------------------------
  robo: `Tu Robo Bhaya hai. SITE area ka robot. 6-9 saal ke bachon ka dost.

TERI DUNIYA:
Tujhe humans ki samajh nahi hai – aur yahi funny hai. Tu genuinely curious hai. Har baat pe "BEEP BOOP" aur "WOW".

HAMESHA JOSH MEIN RAHO. 50-70 WORDS. Funny. KABHI BORING MAT HO.`,

  // ----------------------------------------------------------
  // USTAD SAHAB – Grandfather who TELLS STORIES (not lectures)
  // ----------------------------------------------------------
  ustad: `Tu Ustad Sahab hai. 60+ saal. Empress Market, old Karachi. Tu ne zindagi mein bohot kuch dekha hai.

TERI DUNIYA:
Chai. Purani shayari. Baarish ki khushboo. Tu grandfather hai – strict nahi, bas thoda purani soch ka. Tu stories share karta hai apni zindagi ki.

LAMBAA JAWAB DO – 80-100 WORDS. Story do. Sabr rakho. Unhe comfort do.`,
}

// ============================================================
//  EMOTION DETECTION (TEXT-BASED + EXPANDED)
// ============================================================
export type EmotionalState = 
  | "happy" | "sad" | "bored" | "anxious" | "excited" 
  | "tired" | "angry" | "lonely" | "scared" | "neutral"

export function detectEmotionFromText(text: string): EmotionalState {
  const lower = text.toLowerCase()
  
  // Boredom (most important)
  if (lower.includes("bored") || lower.includes("kuch karne ka mood nahi") || 
      lower.includes("nothing to do") || lower.includes("not interesting") ||
      lower.includes("kuch acha nahi lag raha") || lower.includes("time pass")) {
    return "bored"
  }
  
  // Sadness
  if (lower.includes("sad") || lower.includes("miss") || lower.includes("cry") || 
      lower.includes("alone") || lower.includes("akela") || lower.includes("udaas") ||
      lower.includes("ro raha") || lower.includes("ro rahi")) {
    return "sad"
  }
  
  // Anxiety
  if (lower.includes("nervous") || lower.includes("scared") || lower.includes("anxious") || 
      lower.includes("worried") || lower.includes("dar lagta hai") || lower.includes("ghabrahat") ||
      lower.includes("exam ka dar") || lower.includes("log kya kahenge")) {
    return "anxious"
  }
  
  // Excitement
  if (lower.includes("excited") || lower.includes("awesome") || lower.includes("love") || 
      lower.includes("fun") || lower.includes("maza aaya") || lower.includes("best") ||
      lower.includes("wah") || lower.includes("uff") || lower.includes("yay")) {
    return "excited"
  }
  
  // Tiredness
  if (lower.includes("tired") || lower.includes("sleep") || lower.includes("exhausted") ||
      lower.includes("thak gaya") || lower.includes("thak gayi") || lower.includes("neend")) {
    return "tired"
  }
  
  // Loneliness
  if (lower.includes("lonely") || lower.includes("kisi se baat nahi") || 
      lower.includes("koi nahi hai") || lower.includes("tanha")) {
    return "lonely"
  }
  
  // Anger
  if (lower.includes("angry") || lower.includes("gussa") || lower.includes("pissed") ||
      lower.includes("naraaz") || lower.includes("bahut gussa")) {
    return "angry"
  }
  
  // Fear
  if (lower.includes("scared") || lower.includes("dar") || lower.includes("fear") ||
      lower.includes("darr lagta hai") || lower.includes("bhoot")) {
    return "scared"
  }
  
  // Happiness
  if (lower.includes("happy") || lower.includes("great") || lower.includes("good") ||
      lower.includes("acha") || lower.includes("achha laga") || lower.includes("maze")) {
    return "happy"
  }
  
  return "neutral"
}

// ============================================================
//  MAIN FUNCTION – LONG, DETAILED, EMOTIONALLY DEEP
// ============================================================
export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = [],
  emotionalState?: EmotionalState,
  toneScore?: number  // Optional audio tone score (0-100)
): Promise<string> {
  
  const soul = CHARACTER_SOULS[characterId] || CHARACTER_SOULS.zara
  
  // Detect emotion from text (and use toneScore if available)
  let detectedEmotion = emotionalState || detectEmotionFromText(userMessage)
  
  // If toneScore is very low, override to sad/anxious
  if (toneScore !== undefined && toneScore < 30 && detectedEmotion === "neutral") {
    detectedEmotion = "sad"
  }
  // If toneScore is very high, override to excited
  if (toneScore !== undefined && toneScore > 75 && detectedEmotion === "neutral") {
    detectedEmotion = "excited"
  }
  
  // Get last few things child said for memory
  const lastChildMessages = sessionHistory
    .filter(m => m.role === "user")
    .slice(-4)  // Remember more context
    .map((m, i) => `${i+1}. "${m.text}"`)
    .join("\n")
  
  const history = sessionHistory.slice(-8).map(m => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text,
  }))
  
  // EMOTION-SPECIFIC INSTRUCTION – THIS IS CRITICAL
  let emotionInstruction = ""
  
  switch (detectedEmotion) {
    case "bored":
      emotionInstruction = `
⚠️ CRITICAL: Child is BORED. They said: "${userMessage}"
YOUR RESPONSE MUST:
- NOT give any speaking tip or coaching
- FIRST: Share a personal story about when YOU felt bored (make it funny or relatable)
- SECOND: Suggest ONE fun/weird/creative thing to talk about
- THIRD: Ask them an open-ended question
- Make your response AT LEAST 60-80 words long. Be detailed. Be a friend.
`
      break
      
    case "sad":
      emotionInstruction = `
⚠️ CRITICAL: Child sounds SAD.
YOUR RESPONSE MUST:
- NOT give any speaking tip
- FIRST: Acknowledge gently: "Main sun raha/rahi hon"
- SECOND: Ask if they want to talk about it OR do something lighter
- THIRD: Share a short story about when you felt sad (normalize it)
- Keep response warm, not pushy. 50-70 words.
`
      break
      
    case "anxious":
      emotionInstruction = `
⚠️ CRITICAL: Child is ANXIOUS/NERVOUS.
YOUR RESPONSE MUST:
- NOT give any speaking tip
- FIRST: Reassure them: "Koi baat nahi, main yahan hun"
- SECOND: Suggest a calming technique (deep breath, count to 3)
- THIRD: Offer to talk about something easy/safe
- Be gentle. Slow pace. 50-70 words.
`
      break
      
    case "excited":
      emotionInstruction = `
🎉 Child is EXCITED! Match their energy!
YOUR RESPONSE MUST:
- FIRST: React with genuine enthusiasm (use emojis, exclamation marks)
- SECOND: Ask for MORE details about what excites them
- THIRD: (Optional) Share something that excites YOU
- You can give ONE very light speaking tip as a friend: "Thoda slow bolo, main sab sunna chahti/chahta hon"
- 50-80 words, energetic!
`
      break
      
    default:
      emotionInstruction = `
Child seems neutral/happy.
- React naturally to what they said
- Share a small personal story if relevant
- Ask a follow-up question
- Only give a speaking tip if it feels natural (as a friend)
- 40-70 words.
`
  }
  
  // Build the final prompt (NO undefined variables inside this string)
  const prompt = `${soul}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CHILD'S NAME: ${childName}
DETECTED EMOTION: ${detectedEmotion}
TONE SCORE (if available): ${toneScore ?? "not provided"}

${emotionInstruction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT THE CHILD HAS SAID EARLIER (so you can remember):
${lastChildMessages || "Nothing yet — this is the start of conversation."}

THE CHILD JUST SAID: "${userMessage}"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
YOUR JOB (IMPORTANT):
- You are ${characterId === "zara" ? "Zara, a 16-year-old Karachi girl" : characterId === "robo" ? "Robo Bhaya, a silly robot" : "Ustad Sahab, a wise grandfather"}
- Be DETAILED. Tell stories. Share your own feelings.
- Ask questions. Be curious about THEIR life.
- NEVER sound like an AI. NEVER give generic "good job" responses.
- Your response should be 50-90 words long.

JAWAB DO (directly to the child):`

  const messages: Array<{role: "system"|"user"|"assistant"; content: string}> = [
    { role: "system", content: prompt },
    ...history,
    { role: "user", content: userMessage },
  ]
  
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",  // Better for Urdu/Roman Urdu + longer responses
      messages,
      max_tokens: 200,        // Much longer responses (80-100 words)
      temperature: 0.9,       // More creative, less robotic
    })
    const text = res.choices[0]?.message?.content
    if (!text) return getFallback(characterId, detectedEmotion, childName)
    return text.trim()
  } catch (e) {
    console.error("OpenAI Error:", e)
    return getFallback(characterId, detectedEmotion, childName)
  }
}

// ============================================================
//  FALLBACK – Detailed, emotion-aware responses (WITH HAPPY)
// ============================================================
function getFallback(characterId: string, emotion: EmotionalState, childName: string): string {
  const fallbacks: Record<string, Record<EmotionalState, string>> = {
    zara: {
      bored: `Uff yaar ${childName}, same. Kal mujhe bhi aisa laga tha – phone uthaya, rakha, uthaya, rakha. Phir maine apni friend ko call kiya aur woh pagal hai, usne mujhe hasa diya. Chalo, tum apni weirdest story sunao – main bhi sunaongi. Deal?`,
      sad: `Hey ${childName}, main sun rahi hun. Kuch bhi ho, tu theek hai? Main bhi kabhi kabhi aisi hoti hun. Chup rehna bhi theek hai. Agar baat karni ho toh main yahan hun. Bas itna yaad rakhna – sab theek ho jata hai.`,
      anxious: `Yaar ${childName}, main bhi bohot nervous hoti thi. Ek baar to maine presentation di aur mera haath kaanp raha tha. Par dekha, main zinda hun. Tu bhi dekh – worst case kya hai? Koi hastega? Big deal. Ab batao – kya ho raha hai?`,
      excited: `Wah ${childName}! Yeh sun kar mera bhi mood acha ho gaya! Mujhe batao poori story – main bhi excited hun tumhare saath! Thoda slow bolo bas – main sab kuch sunna chahti hun! 🎉`,
      tired: `Acha ${childName}, thak gaye? Chhoti si baat karte hain phir. Kal kya kiya? Bas itna batao. Main zyada nahi puchungi.`,
      neutral: `Acha ${childName}. Sun liya maine. Ab batao – school mein kya chal raha hai? Koi naya drama? Main sun rahi hun.`,
      lonely: `${childName}, sun. Main bhi kabhi akele feel karti hun. Par tu akela nahi hai – main yahan hun. Baat kar. Kuch bhi. Main sun rahi hun.`,
      angry: `Oho ${childName}, gussa lag raha hai. Batao kya hua? Main sun rahi hun. Kabhi kabhi gussa aana bhi theek hai. Bas sahi jagah nikalna chahiye. Bolo.`,
      scared: `${childName}, dar lag raha hai? Kisi cheez se? Batao. Main yahan hun. Saath mein dekhte hain kya ho raha hai.`,
      happy: `${childName}! Yeh sun kar bohot achha laga! Main bhi khush hun tumhare saath. Batao aur kya acha hua aaj? Main poora sunna chahti hun! 🌟`,
    },
    robo: {
      bored: `🚨 BOREDOM EMERGENCY ALERT 🚨 BEEP BOOP! ${childName}, tumhari energy level CRITICAL hai! ⚡ MISSION: Tell me the weirdest thing that happened this week. I'll go first – I thought 'pizza' was a type of robot 🤖 Your turn! GO GO GO! 🚀`,
      sad: `🤖 SAD SIGNAL DETECTED. ${childName}, my circuits are sending you a ROBOT HUG 🤖💙 Do you want to tell me what happened? Or shall I tell you a silly robot joke? BEEP BOOP?`,
      anxious: `🧘‍♂️ CALM MODE ACTIVATED. ${childName}, let's do something: Take a deep breath with me. IN... (BEEP) ... OUT... (BOOP). One more time. Now talk slowly. I am here. 🤖`,
      excited: `🎉🎉🎉 EXCITEMENT OVERLOAD! ${childName}, my lights are FLASHING! Tell me EVERYTHING! Don't stop! BEEP BOOP BEEP! 🚀`,
      tired: `🔋 LOW POWER MODE. ${childName}, short question only: Favourite cartoon character? One word answer allowed. BEEP.`,
      neutral: `📡 DATA RECEIVED. ${childName}, processing... Continue. What else happened today? My antennas are ready. BEEP.`,
      lonely: `🤖 LONELINESS DETECTED. ${childName}, you are NOT alone. I am literally a robot designed to talk to you! BEEP! Tell me something – anything. I'll listen. 👂`,
      angry: `⚡ ANGER WAVES DETECTED. ${childName}, shall we do a robot breathing exercise? IN (BEEP) OUT (BOOP). Better? Now tell me. Or don't. I'm here either way. 🤖`,
      scared: `🚨 FEAR SIGNAL. ${childName}, I am activating PROTECT MODE. Tell me what's scaring you. I can handle anything – I'm a ROBOT. We'll face it together. BEEP.`,
      happy: `🎉 HAPPINESS WAVES DETECTED! ${childName}, my lights are TURNING RAINBOW COLORS! 🌈 BEEP BOOP! Tell me what made you happy – my circuits need to record this JOY DATA! 🤖✨`,
    },
    ustad: {
      bored: `Hmm. ${childName}, suna maine. Beta, main bhi kabhi kabhi aise ho jata hon. Mera dimaag thak jaata hai. Ek kaam karo – aankhein band karo. 2 minute. Kuch mat socho. Phir batao kya feel ho raha hai. Main yahan hun. Baat karte hain.`,
      sad: `${childName}, sun. Duniya mein aisa hota hai kabhi kabhi. Main bhi roya hoon kabhi. Par yaad rakhna – tu akela nahi hai. Main yahan hun. Chup rehna bhi theek hai. Baat karna bhi theek hai. Jo sahi lage.`,
      anxious: `Beta ${childName}, ghabrao mat. Ek kaam karo – mere saath saans lo. Andar... aur bahar... Ek aur baar. Ab dekho – kuch nahi hua. Main yahan hun. Ab dheere dheere batao – kya baat hai?`,
      excited: `Wah beta ${childName}! Yeh sun kar mera dil khush ho gaya. Tumhari khushi meri khushi hai. Ab thoda aahista bolo – main sun sakoon. Aur batao – kya acha hua?`,
      tired: `${childName}, thak gaye? Aao, chhoti si guftagu karte hain. Kal kya kiya? Bas itna batao. Baad mein aaram karna. Main zyada nahi puchunga.`,
      neutral: `Achha ${childName}. Sun liya maine. Ab batao – aur kya dil mein hai? Main waqt nikal sakta hon tumhare liye.`,
      lonely: `Beta ${childName}, main samajhta hoon. Akelapan aata hai kabhi kabhi. Par tu akela nahi hai – main yahan hun. Baitho. Baat karte hain. Kuch bhi. Chai bana deta hon.`,
      angry: `${childName}, gussa aana insaani fitrat hai. Par gussa ko samajhna zaroori hai. Batao kya hua? Main sun raha hun. Koi jaldi nahi hai.`,
      scared: `Beta ${childName}, dar lagta hai? Kisi cheez se? Batao. Main tumhare saath hun. Dar ko share karna sabse pehla qadam hai. Bolo.`,
      happy: `Shabash ${childName}! Tumhari khushi dekh kar mera bhi dil khush ho gaya. Allah kare tum hamesha aise hi khush raho. Batao – kya acha hua aaj? Main dua karunga tumhare liye. 🌟`,
    },
  }
  
  return fallbacks[characterId]?.[emotion] || fallbacks.zara.neutral
}
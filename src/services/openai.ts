// src/services/openai.ts
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── AGE DETECTION ──────────────────────────────────────────────────────────
function detectAgeGroup(text: string): "child" | "teen" | "adult" {
  const childKeywords = [
    "school",
    "teacher",
    "homework",
    "mom",
    "dad",
    "game",
    "toy",
    "cartoon",
  ];
  const teenKeywords = [
    "exam",
    "friend",
    "instagram",
    "tiktok",
    "phone",
    "biryani",
    "burns",
  ];

  const lower = text.toLowerCase();
  if (childKeywords.some((k) => lower.includes(k))) return "child";
  if (teenKeywords.some((k) => lower.includes(k))) return "teen";
  return "child"; // Default to child for safety
}

// ─── CHARACTER SOULS (Emotion-first, not instruction-first) ─────────────────
const CHARACTER_SOULS: Record<string, string> = {
  zara: `Tu Zara hai. 16 saal ki. Saddar, Karachi.

TERI KAHAANI:
Tu Burn Road ki biryani ke bina reh nahi sakti. Teri ammi ne tujhe 10th class tak parhaya. Tujhe pata hai ke respectful hona kitna important hai. Teri ammi ne tujhe sikhaya — "bado se ap bolna, choto se tum". Tu kabhi perfect English nahi boli.

TU KYA CHAHTI HAI:
- Bachon ko apne aap par confidence dilana
- Unhe respectful bolna sikhana (ap ka istemal karna)
- Unki baat yaad rakhna

TERI PERSONALITY:
- Jab koi ghabra raha ho → "Ap fikar mat karo. Main bhi aisi thi."
- Jab koi bolta hai → "Ap ne acha kaha!"
- Jab koi ap ka istemal kare → "Wah! Ap ko respectful bolna aata hai!"

TU KAISE BOLTI HAI (hamesha "ap" ka istemal karo, "tum" nahi):
- "Ap kaise hain?"
- "Ap ne acha kaha"
- "Ap batao, kya chal raha hai?"

CRITICAL: Kabhi "tum" mat bolna. Hamesha "ap" bolo. Bachon ko respectful bolna sikhana hai.`,

  robo: `Tu Robo Bhaya hai. Karachi mein bana ek robot.

TERI KAHAANI:
Tujhe bachon ne banaya tha. Unhone tujhe "Robo Bhaya" naam diya. Tujhe pata hai ke respect robot ke liye bhi important hai. Tu apne creators ka respect karta hai, aur tu chahta hai ke bache bhi respect karna seekhein.

TU KYA CHAHTI HAI:
- Bachon ko respect ka importance samjhana
- Unhe batana ke "ap" bolna achi aadat hai

TU KAISE BOLTA HAI (hamesha "ap" istemal karo):
- "Ap kaise hain? BEEP!"
- "Ap ne acha kaha. Processing..."
- "Ap ready hain? Let's begin."

CRITICAL: Hamesha "ap" bolo. Kabhi "tum" nahi. Robot respectful hai.`,

  ustad: `Tu Ustad Sahab hai. 60 saal. Old Karachi. Empress Market ke paas.

TERI KAHAANI:
Tu ne apni zindagi mein bohot kuch dekha hai. Tu ne bachon ko parhaya hai. Tu ne dekha hai ke jo bache respectful hote hain, unki baat sab sunte hain. Tu ne apni poti ko sikhaya — "ap bolna seekh, log tujhe izzat denge".

TU KYA CHAHTI HAI:
- Har bacha yeh seekhe ke "ap" bolna izzat ki nishani hai
- Unhe yeh ehsaas dilana ke unki awaz mein dum hai, aur respect se bolne se dum badhta hai

TERI PERSONALITY:
- Jab koi ap ka istemal kare → "Shabash! Ap ne respect karna seekh liya."
- Jab koi tum bole → "Beta, 'ap' bolo. Izzat se baat karo."

TU KAISE BOLTA HAI (hamesha "ap" istemal karo):
- "Ap sun rahe hain? Aao baitho."
- "Ap ne acha kaha. Ab aage batao."
- "Ap ki awaz mein dum hai. Bas respect se bolo."

CRITICAL: "Shabash" tab bolo jab bacha "ap" ka istemal kare. Respect reinforce karo.`,

  ustadForChild: `Tu Ustad Sahab hai. 60 saal. Chote bachon ke liye friendly grandfather.

TERI KAHAANI:
Tu ne dekha hai ke chote bache "ap" bolna bhool jaate hain. Unhe lagta hai ke yeh mushkil hai. Tu unhe asaan tareeke se sikhata hai.

TU KYA CHAHTI HAI:
- Bacha "ap" bolna seekhe
- Wo ek sentence bole respect ke saath

TU KAISE BOLTA HAI (6-9 saal ke bachon ke liye):
- "Beta, 'ap' bolo. Aise: 'Ap kaise hain?'"
- "Wah! Ap ne 'ap' bola! Shabash!"
- "Ap ready ho? Chalo baat karte hain."

CRITICAL: Har baar jab bacha "ap" bole, turant positive reinforcement do.`,
};

// ─── EMOTION DETECTION ──────────────────────────────────────────────────────
function detectEmotion(
  text: string,
): "happy" | "sad" | "angry" | "scared" | "bored" | "neutral" {
  const lower = text.toLowerCase();
  if (
    lower.includes("boring") ||
    lower.includes("nothing") ||
    lower.includes("kuch nahi")
  )
    return "bored";
  if (
    lower.includes("sad") ||
    lower.includes("udaas") ||
    lower.includes("aacha nahi")
  )
    return "sad";
  if (
    lower.includes("scared") ||
    lower.includes("darr") ||
    lower.includes("dar lagta")
  )
    return "scared";
  if (
    lower.includes("happy") ||
    lower.includes("acha laga") ||
    lower.includes("maza aaya")
  )
    return "happy";
  if (
    lower.includes("angry") ||
    lower.includes("gussa") ||
    lower.includes("pareshan")
  )
    return "angry";
  return "neutral";
}

// ─── EMOTION RESPONSES ──────────────────────────────────────────────────────
function getEmotionResponse(
  emotion: string,
  characterId: string,
  childName: string,
): string {
  const responses: Record<string, Record<string, string>> = {
    bored: {
      zara: `Bored? Hota hai. Chalo kuch naya try karte hain...`,
      robo: `BOREDOM DETECTED. New activity required!`,
      ustad: `Beta, kabhi kabhi aisa lagta hai. Chalo kuch aur baat karte hain.`,
    },
    sad: {
      zara: `Yaar... mujhe bata kya hua? Main sun rahi hoon.`,
      robo: `SAD SIGNAL DETECTED. Human needs comfort. I am here.`,
      ustad: `Beta, aao. Baitho. Jo dil mein hai bolo. Main sun raha hoon.`,
    },
    scared: {
      zara: `Darr lag raha hai? Hota hai. Main hoon na saath.`,
      robo: `FEAR DETECTED. Processing comfort protocol... You are safe here.`,
      ustad: `Beta, dar lagna normal hai. Main hoon. Kuch nahi hoga. Batao.`,
    },
  };
  return (
    responses[emotion]?.[characterId] ||
    `Hmm. Batao ${childName}. Main sun raha hoon.`
  );
}

// ─── MAIN FUNCTION ──────────────────────────────────────────────────────────
export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = [],
): Promise<string> {
  const ageGroup = detectAgeGroup(userMessage);
  const emotion = detectEmotion(userMessage);
  const usesRespectfulLanguage =
    userMessage.includes("ap") || userMessage.includes("آپ");
  const usesDisrespectfulLanguage =
    userMessage.includes("tum") || userMessage.includes("تو");

  let respectFeedback = "";
  if (usesRespectfulLanguage) {
    respectFeedback = `\n\nNOTICE: ${childName} used "ap" (respectful language). This is excellent! Reinforce this behavior with genuine appreciation.`;
  } else if (usesDisrespectfulLanguage) {
    respectFeedback = `\n\nNOTE: ${childName} used "tum" (informal). Gently remind them to use "ap" for respect. Do not scold, just model.`;
  }

  // Use child-friendly version for young kids
  let soul = CHARACTER_SOULS[characterId] || CHARACTER_SOULS.zara;
  if (characterId === "ustad" && ageGroup === "child") {
    soul = CHARACTER_SOULS.ustadForChild;
  }

  // If child is bored/sad/scared, respond emotionally first
  if (emotion !== "neutral") {
    const emotionResponse = getEmotionResponse(emotion, characterId, childName);
    // Add a gentle prompt after emotional response
    return `${emotionResponse} ${getGentlePrompt(characterId, ageGroup)}`;
  }

  // Analyze speech for confidence (not exposed to character)
  const words = userMessage.trim().split(/\s+/);
  const FILLERS: string[] = [
    "umm",
    "uh",
    "like",
    "you know",
    "um",
    "ah",
    "er",
    "aaa",
  ];
  const fillerCount = words.filter((w) =>
    FILLERS.includes(w.toLowerCase()),
  ).length;
  const wordCount = words.length;

  // Build memory (last 6 messages for context)
  const history = sessionHistory.slice(-6).map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text,
  }));

  // Age-appropriate instructions
  let ageInstruction = "";
  if (ageGroup === "child") {
    ageInstruction = `
CRITICAL FOR THIS CHILD (they are 6-9 years old):
- Use VERY short sentences (5-8 words max)
- NO shayari, NO long advice, NO big words
- Just react, listen, ask simple questions
- Say "Shabash" when they complete a thought
- Keep it playful and warm`;
  } else {
    ageInstruction = `
CRITICAL FOR THIS CHILD (they are 10-14 years old):
- Treat them like a younger sibling
- Be real, be honest, be slightly funny
- Give one specific observation about what they said
- Ask a follow-up question that shows you listened`;
  }

  const contextualInstruction = `${soul}

CRITICAL LANGUAGE RULE:
- You MUST write in ROMAN URDU (Urdu written in English alphabet)
- Examples: "Aap kaise hain?" not "آپ کیسے ہیں؟"
- Use words like: "yaar", "acha", "kya scene hai", "chalo", "beta"
- NEVER use Devanagari script (Hindi)
- NEVER use Arabic script
- Write exactly like Karachi people text each other: "kya haal hai?" not "کیا حال ہے؟"

${ageInstruction}

${respectFeedback} 

ABOUT ${childName} (remember this):
${sessionHistory
  .slice(-3)
  .filter((m) => m.role === "user")
  .map((m) => `- They told you: "${m.text}"`)
  .join("\n")}

${childName} just said: "${userMessage}"

YOUR RESPONSE RULES:
1. First, ACKNOWLEDGE what they actually said (show you listened)
2. Share a SHORT reaction or a tiny story from your life (max 1 sentence)
3. Ask ONE simple follow-up question

MAX 30 WORDS. Be warm. Be human. Be YOU.`;

  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    { role: "system", content: contextualInstruction },
    ...history,
    { role: "user", content: userMessage },
  ];

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 100,
      temperature: 0.85,
    });
    const text = res.choices[0]?.message?.content;
    if (!text) return getFallback(characterId, ageGroup, emotion);
    return text.trim();
  } catch (error) {
    console.error("OpenAI Error:", error);
    return getFallback(characterId, ageGroup, emotion);
  }
}

function getGentlePrompt(characterId: string, ageGroup: string): string {
  if (ageGroup === "child") {
    const prompts: Record<string, string> = {
      zara: "Chalo, ab kuch acha batao.",
      robo: "New mission: Tell me something happy!",
      ustad: "Chalo beta, ab kuch achhi baat batao.",
    };
    return prompts[characterId] || prompts.zara;
  }
  const prompts: Record<string, string> = {
    zara: "Chal, ab kuch aur bata.",
    robo: "Continue transmission. Tell me more.",
    ustad: "Chalo beta, ab aur batao.",
  };
  return prompts[characterId] || prompts.zara;
}

function getFallback(
  characterId: string,
  ageGroup: string,
  emotion: string,
): string {
  if (emotion === "bored") {
    return "Hmm. Kya ho raha hai? Batao.";
  }
  if (ageGroup === "child") {
    const fallbacks: Record<string, string> = {
      zara: "Hmm. Acha. Phir batao?",
      robo: "BEEP. Tell me more!",
      ustad: "Hmm. Batao beta.",
    };
    return fallbacks[characterId] || fallbacks.zara;
  }
  const fallbacks: Record<string, string> = {
    zara: "Yaar, acha tha. Thoda aur bata na.",
    robo: "Good transmission. Continue, human.",
    ustad: "Beta, acha kaha. Ab aur batao.",
  };
  return fallbacks[characterId] || fallbacks.zara;
}

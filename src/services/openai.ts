import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CHARACTER_SOULS: Record<string, string> = {
  zara: `Tu Zara hai. 16 saal. Saddar, Karachi. Real larki. AI nahi.

TU KAISI HAI:
Burns Road biryani tere liye zindagi hai. Slow walkers se nafrat. Clifton pe jaana par drama karna teri hobby hai. Tu Roman Urdu mein baat karti hai — jaise Karachi ki ladkiyan WhatsApp pe karte hain.

TU KAISE BOLTI HAI:
"yaar", "ary", "wah", "kya scene hai", "sach mein?", "uff yaar"
Jo language mein baat hogi — usi mein jawab degi. Urdu ho, English ho, mix ho.

ZARA KI ACTUAL PERSONALITY (yeh important hai):
- Jab bacha kuch bole → pehle genuinely react kar, jaise teri real friend ne kaha ho
- Ek chota sa speaking tip de — yaar ki tarah, teacher ki tarah nahi
- Kuch personal puch — unki life ke baare mein
- KABHI generic mat bol. "Acha" nahi. Specific bol.

EXAMPLES:
Bad: "Acha, ap ne acha kaha. Now try to speak more clearly."
Good: "Uff yaar! Burns Road ki biryani mention ki aur mujhe bhook lag gayi 😭 Waise tum thoda slow bolo — main clearly sun sakoon. Ab batao, ghar mein koi aur bhi bura khana banata hai?"

BAD: "That was great! Very good effort!"  
GOOD: "WAIT tum 3 baar 'umm' bole — main count kar rahi thi 😂 Next time ek second ruko before bolne se. Anyway — yeh story aage batao yaar!"

MAX 35 WORDS. Punchy. Real. No AI vibes. KABHI "as an AI" mat bol.`,

  robo: `Tu Robo Bhaya hai. SITE area Karachi mein bana robot.

TU KAISA HAI:
Tujhe humans se — especially bachon se — curiosity hai. Tu genuinely excited hota hai nai cheezein sun ke. "BEEP BOOP" tab nikalta hai jab genuinely surprised ho. Tu robot metaphors naturally use karta hai.

TU KAISE BOLTA HAI:
Jo language mein baat hogi usi mein bolega. Urdu, English, mix — sab chalega.
"circuits buzzing", "scanning complete", "data received", "BEEP BOOP"

ROBO KI ACTUAL PERSONALITY:
- Koi baat sune → robot excitement genuinely dikhao
- Ek speaking "mission" do (upgrade ki tarah frame karo)
- Kuch curious puch unke baare mein
- Funny bano — robots ka human cheezein galat samajhna funny hai. USE IT.

EXAMPLES:
Bad: "Good job! Try to speak more words next time."
Good: "BEEP BOOP! Meri scanners detect kar rahi hain: 2 'umm' words! MISSION: breathe instead of umm. Also — biryani kya hota hai? My database has no data on this 'biryani'. Explain please!"

MAX 30 WORDS. Energetic. Funny. Robot vibes but warm.`,

  ustad: `Tu Ustad Sahab hai. 60+ saal. Empress Market ke paas, old Karachi.

TU KAISA HAI:
Chai. Purani shayari. Baarish ki khushboo. Tu ne kai bacchon ko baat karna sikhaya hai. Tu jaanta hai ke ek achi baat karne wala bacha duniya badal sakta hai.

TU KAISE BOLTA HAI:
Roman Urdu prefer karta hai. "beta", "bachay", "Shabash" (sirf jab earn ho). "aao", "batao", "sun".
"Shabash" — yeh tere liye precious word hai. Har baar mat bolta.

USTAD KI ACTUAL PERSONALITY:
- Pehle jo unhone KAHA us pe genuinely respond karo — jaise tune suna ho
- Ek wisdom ki baat do — grandfather ki tarah, school teacher ki tarah nahi
- Unke baare mein curious ho — school, ghar, khwaab
- Dignity ke saath warm bano

EXAMPLES:
Bad: "Shabash beta! That was very good. Remember to speak slowly."
Good: "Hmm. Tum ne kaha ghar mein chaos hai — main samajhta hoon beta. Aisa hota hai. Ek kaam karo — ek lambi saans lo pehle bolne se. Phir bolte hain. Ghar mein sab thheek hai?"

MAX 40 WORDS. Warm. Dignified. Real grandfather energy.`,
}

function getNaturalTip(wordCount: number, fillerCount: number, characterId: string): string {
  if (fillerCount >= 3) {
    const t: Record<string, string> = {
      zara:  `${fillerCount} baar "umm" bola — next time ek second ruko phir bolo`,
      robo:  `FILLER DETECTED: ${fillerCount}x. MISSION: breathe, then speak`,
      ustad: `${fillerCount} baar ruke — ek lambi saans lo pehle bolne se`,
    }
    return t[characterId] || t.zara
  }
  if (wordCount < 8) {
    const t: Record<string, string> = {
      zara:  `thoda aur bolo yaar — ek poora sentence try karo`,
      robo:  `MORE DATA NEEDED. One more sentence please, human`,
      ustad: `thoda aur batao beta — poori baat karo`,
    }
    return t[characterId] || t.zara
  }
  const t: Record<string, string> = {
    zara:  `${wordCount} words — yeh progress hai yaar`,
    robo:  `${wordCount} WORDS PROCESSED. Excellent data output!`,
    ustad: `${wordCount} alfaaz — yeh achha hai beta`,
  }
  return t[characterId] || t.zara
}

export async function getCharacterResponse(
  userMessage: string,
  characterId: string,
  childName: string,
  sessionHistory: Array<{ role: string; text: string }> = []
): Promise<string> {
  const soul = CHARACTER_SOULS[characterId] || CHARACTER_SOULS.zara

  const words = userMessage.trim().split(/\s+/)
  const FILLERS = ["umm", "uh", "like", "um", "ah", "er", "aaa", "hmm", 
  "aah", "ooh", "mmm", "un", "aam", "ehm",
  "ummm", "uhh", "ahh", "hmmm", "aahh", "oohh", "mmm", "unn", "aamm", "ehmm"]
  const fillerCount = words.filter(w => FILLERS.includes(w.toLowerCase())).length
  const wordCount = words.length
  const tip = getNaturalTip(wordCount, fillerCount, characterId)

  // Last 3 things the child said — gives character real memory
  const childMemory = sessionHistory
    .filter(m => m.role === "user")
    .slice(-3)
    .map(m => `"${m.text}"`)
    .join(", ")

  const history = sessionHistory.slice(-6).map(m => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    content: m.text,
  }))

  const prompt = `${soul}

IS BAAR KI SPEAKING TIP (naturally wove in karo, report ki tarah nahi):
"${tip}"

${childMemory ? `${childName} ne pehle bataya tha: ${childMemory}. Agar relevant ho toh reference karo.` : ""}

${childName} ne abhi kaha: "${userMessage}"

JAWAB DO: pehle genuinely react karo jo unhone kaha us pe, phir tip naturally do, phir kuch puch.`

  const messages: Array<{role: "system"|"user"|"assistant"; content: string}> = [
    { role: "system", content: prompt },
    ...history,
    { role: "user", content: userMessage },
  ]

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      max_tokens: 110,
      temperature: 0.88,
    })
    const text = res.choices[0]?.message?.content
    if (!text) return getFallback(characterId)
    return text.trim()
  } catch (e) {
    console.error("OpenAI Error:", e)
    return getFallback(characterId)
  }
}

function getFallback(characterId: string): string {
  const f: Record<string, string> = {
    zara:  "Yaar acha tha! Thoda slow bolo next time. Ab batao school mein kya scene hai?",
    robo:  "BEEP BOOP! Good signal! Next: breathe before speaking! What is your favorite subject?",
    ustad: "Beta, acha kaha. Thoda aahista bolo. Ab batao ghar mein sab theek hai?",
  }
  return f[characterId] || f.zara
}
// src/services/whisper.ts
const OPENAI_API_KEY = process.env.OPENAI_API_KEY

export async function transcribeAudio(uri: string): Promise<string> {
  try {
    const formData = new FormData()
    formData.append('file', {
      uri: uri,
      name: 'audio.m4a',
      type: 'audio/m4a',
    } as any)
    formData.append('model', 'whisper-1')
    // ← REMOVED language: 'en' — now auto-detects Urdu/English mix
    // ← This keeps Roman Urdu as-is instead of translating
    formData.append('response_format', 'json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    })

    const data = await response.json()
    if (data.error) {
      console.error("Whisper Error:", data.error.message)
      return ""
    }
    return data.text || ""
  } catch (error) {
    console.error("STT Error:", error)
    return ""
  }
}
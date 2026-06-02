// src/services/elevenlabs.ts
const ELEVEN_LABS_API_KEY = process.env.ELEVEN_LABS_API_KEY;

const VOICE_IDS: Record<string, string> = {
  zara: "EXAVITQu4vr4xnSDxMaL", 
  robo: "pNInz6obpgDQGcFmaJgB", 
  ustad: "JBFqnCBsd6RMkjVDRZzb"
};

export async function getCharacterAudio(text: string, characterId: string): Promise<string> {
  const voiceId = VOICE_IDS[characterId] || VOICE_IDS.zara;
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVEN_LABS_API_KEY.trim(),
      },
      body: JSON.stringify({
        text: text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      // THIS WILL PRINT THE EXACT PROBLEM IN YOUR TERMINAL
      console.error("🔴 ElevenLabs Error Detail:", JSON.stringify(errorData));
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Convert blob to Base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("TTS Error:", error);
    return "";
  }
}
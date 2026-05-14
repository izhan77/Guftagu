const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function transcribeAudio(uri: string): Promise<string> {
  try {
    const formData = new FormData();
    
    // We append the recorded file from your phone
    formData.append('file', {
      uri: uri,
      name: 'audio.m4a',
      type: 'audio/m4a',
    } as any);
    
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // You can set this to 'ur' for Urdu!

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("Whisper Error:", data.error.message);
      return "";
    }

    return data.text; // This is the child's spoken words!
  } catch (error) {
    console.error("STT Network Error:", error);
    return "";
  }
}
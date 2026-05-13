// const ELEVEN_LABS_API_KEY = "YOUR_KEY";

// export async function getElevenLabsAudio(text: string, characterId: string) {
//   const voices = { zara: "EXAVITQu4vr4xnSDxMaL", robo: "ErXwbcqjndXLjDdejnGu", ustad: "N2lVS1wzXK9XALp7u9qY" };

//   const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voices[characterId]}`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json', 'xi-api-key': ELEVEN_LABS_API_KEY },
//     body: JSON.stringify({
//       text,
//       model_id: "eleven_multilingual_v2", // Best for Urdu/English
//       voice_settings: { stability: 0.5, similarity_boost: 0.8 }
//     })
//   });

//   const blob = await response.blob();
//   return new Promise((resolve) => {
//     const reader = new FileReader();
//     reader.onloadend = () => resolve(reader.result);
//     reader.readAsDataURL(blob);
//   });
// }
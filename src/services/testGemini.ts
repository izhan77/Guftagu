// Quick test — delete after confirming it works
import { getCharacterResponse } from './gemini'

getCharacterResponse(
  "I love biryani from Burns Road!",
  "zara",
  "Ali"
).then(response => {
  console.log("✅ GEMINI WORKS:", response)
}).catch(err => {
  console.log("❌ GEMINI FAILED:", err)
})
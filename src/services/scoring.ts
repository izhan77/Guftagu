export interface ExchangeMetrics {
  fillerWordCount: number
  wordCount: number
  sentenceCount: number
  avgSentenceLength: number
}

export interface SessionResult {
  sessionScore: number
  confidenceDelta: number
  newOverallScore: number
  level: string
  levelEmoji: string
  leveledUp: boolean
  previousLevel: string
}

const FILLER_WORDS = ['umm', 'uh', 'like', 'you know', 'basically', 'so', 'right', 'um', 'ah', 'er', 'actually']

export function analyzeExchange(transcript: string): ExchangeMetrics {
  const words = transcript.trim().split(/\s+/).filter(w => w.length > 0)
  const fillerCount = words.filter(w => FILLER_WORDS.includes(w.toLowerCase())).length
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 2)
  return {
    fillerWordCount: fillerCount,
    wordCount: words.length,
    sentenceCount: Math.max(sentences.length, 1),
    avgSentenceLength: words.length / Math.max(sentences.length, 1),
  }
}

export function calculateExchangeScore(metrics: ExchangeMetrics): number {
  let score = 50

  // Word count scoring
  if (metrics.wordCount >= 30) score += 20
  else if (metrics.wordCount >= 20) score += 15
  else if (metrics.wordCount >= 10) score += 8
  else if (metrics.wordCount < 5) score -= 15

  // Filler words scoring
  if (metrics.fillerWordCount === 0) score += 15
  else if (metrics.fillerWordCount === 1) score += 5
  else if (metrics.fillerWordCount === 2) score -= 5
  else score -= (metrics.fillerWordCount * 5)

  // Sentence quality
  if (metrics.avgSentenceLength >= 8) score += 10
  else if (metrics.avgSentenceLength >= 5) score += 5
  else score -= 5

  return Math.min(100, Math.max(0, score))
}

export function calculateSessionScore(exchangeScores: number[]): number {
  if (exchangeScores.length === 0) return 50
  return Math.round(exchangeScores.reduce((a, b) => a + b, 0) / exchangeScores.length)
}

export function updateOverallScore(currentScore: number, sessionScore: number): number {
  const newScore = (currentScore * 0.65) + (sessionScore * 0.35)
  return Math.min(100, Math.max(0, Math.round(newScore)))
}

export function getLevel(score: number): { level: string; emoji: string; color: string } {
  if (score <= 20) return { level: 'Shy Seedling', emoji: '🌱', color: '#4CAF50' }
  if (score <= 40) return { level: 'Growing Voice', emoji: '🌿', color: '#8BC34A' }
  if (score <= 60) return { level: 'Confident Speaker', emoji: '⭐', color: '#FF9800' }
  if (score <= 80) return { level: 'Bold Talker', emoji: '🚀', color: '#2196F3' }
  return { level: 'Voice Champion', emoji: '👑', color: '#9C27B0' }
}

export function getSessionTip(metrics: ExchangeMetrics[]): string {
  const totalFillers = metrics.reduce((sum, m) => sum + m.fillerWordCount, 0)
  const avgWords = metrics.reduce((sum, m) => sum + m.wordCount, 0) / metrics.length

  if (totalFillers > 4) return `You said "umm" or "uh" ${totalFillers} times. Try taking a breath instead!`
  if (avgWords < 10) return "Try to say a little more each time. You're almost there!"
  if (avgWords >= 25) return "Amazing! You're speaking in full, confident sentences!"
  return "Great job completing your thoughts clearly!"
}
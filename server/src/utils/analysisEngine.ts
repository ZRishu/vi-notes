import crypto from 'crypto';

export interface KeystrokeData {
  type: 'keydown' | 'keyup';
  keyCode: string;
  timestamp: number;
  duration?: number;
}

export interface PastedEvent {
  timestamp: number;
  textLength: number;
}

export interface AnalysisResult {
  reportId: string;
  verificationTag: string;
  generatedAt: string;
  authenticityScore: number;
  typingSpeed: number;
  speedVariance: number;
  pauseCount: number;
  microPauseCount: number;
  punctuationPauseCount: number;
  revisionCount: number;
  revisionRate: number;
  burstCount: number;
  averagePauseMs: number;
  hesitationScore: number;
  rhythmScore: number;
  consistencyMismatchScore: number;
  wordCount: number;
  vocabularyDiversity: number;
  sentenceLengthVariance: number;
  isPasted: boolean;
  suspiciousFlags: string[];
  supportingEvidence: string[];
  behaviorSummary: string[];
  linguisticSummary: string[];
  recommendation: string;
}

export function analyzeSession(content: string, keystrokeData: KeystrokeData[], pastedEvents: PastedEvent[]): AnalysisResult {
  const suspiciousFlags: string[] = [];
  const supportingEvidence: string[] = [];
  const behaviorSummary: string[] = [];
  const linguisticSummary: string[] = [];
  let score = 100;
  const normalizedContent = content.trim();
  const words = normalizedContent.length > 0 ? normalizedContent.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const uniqueWords = new Set(words.map((word) => word.toLowerCase().replace(/[^a-z0-9'-]/gi, '')));
  const vocabularyDiversity = wordCount > 0 ? uniqueWords.size / wordCount : 0;
  const sentences = normalizedContent
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  const sentenceWordCounts = sentences.map((sentence) => sentence.split(/\s+/).filter(Boolean).length);
  const sentenceLengthVariance = calculateVariance(sentenceWordCounts);

  // 1. Analyze Pasting
  const pastedCharacters = pastedEvents.reduce((sum, event) => sum + event.textLength, 0);
  const pastedRatio = normalizedContent.length > 0 ? pastedCharacters / normalizedContent.length : 0;
  const isPasted = pastedEvents.length > 0 || (normalizedContent.length > 0 && keystrokeData.length === 0);
  if (isPasted) {
    suspiciousFlags.push('Pasted text detected during the writing session.');
    supportingEvidence.push(`Detected ${pastedEvents.length} paste event(s) covering ${pastedCharacters} characters.`);
    score -= pastedRatio > 0.4 ? 45 : 20;
  }

  // 2. Typing Speed (CPM)
  let typingSpeed = 0;
  const keyDownEvents = keystrokeData.filter((event) => event.type === 'keydown');
  if (keystrokeData.length > 0) {
    const startTime = keystrokeData[0].timestamp;
    const endTime = keystrokeData[keystrokeData.length - 1].timestamp;
    const durationMinutes = (endTime - startTime) / 60000;
    typingSpeed = durationMinutes > 0 ? keyDownEvents.length / durationMinutes : 0;
  }

  // 3. Variance and Micro-pauses
  const intervals: number[] = [];
  let pauseCount = 0;
  let microPauseCount = 0;
  let punctuationPauseCount = 0;
  let revisionCount = 0;
  let burstCount = 0;
  const punctuationKeys = new Set(['Period', 'Comma', 'Semicolon', 'Slash', 'Quote', 'Digit1']);

  for (let i = 1; i < keystrokeData.length; i++) {
    const current = keystrokeData[i];
    const previous = keystrokeData[i - 1];
    const gap = current.timestamp - previous.timestamp;

    if (gap > 2000) pauseCount++; // Pauses > 2s
    if (gap >= 250 && gap <= 1200) microPauseCount++;
    if (current.type === 'keydown') {
      intervals.push(gap);
    }

    if (current.type === 'keydown' && punctuationKeys.has(current.keyCode) && gap > 500) {
      punctuationPauseCount++;
    }

    if (current.type === 'keydown' && gap <= 120) {
      burstCount++;
    }
  }

  for (const event of keyDownEvents) {
    if (event.keyCode === 'Backspace' || event.keyCode === 'Delete') {
      revisionCount++;
    }
  }

  const speedVariance = calculateVariance(intervals);
  const averagePauseMs = intervals.length > 0 ? intervals.reduce((sum, gap) => sum + gap, 0) / intervals.length : 0;
  const revisionRate = wordCount > 0 ? revisionCount / wordCount : 0;
  const averageSentenceLength = sentenceWordCounts.length
    ? sentenceWordCounts.reduce((sum, count) => sum + count, 0) / sentenceWordCounts.length
    : 0;
  const hesitationScore = Math.min(100, Math.round((microPauseCount * 1.6) + (punctuationPauseCount * 3) + (pauseCount * 6)));
  const rhythmScore = Math.max(0, Math.min(100, Math.round(100 - Math.min(speedVariance / 12, 100))));
  const consistencyMismatchScore = Math.max(0, Math.min(100, Math.round(
    (sentenceLengthVariance < 8 ? 35 : 0) +
    (vocabularyDiversity < 0.28 && wordCount > 120 ? 25 : 0) +
    (revisionRate < 0.02 && wordCount > 80 ? 20 : 0) +
    (speedVariance < 50 && keystrokeData.length > 50 ? 20 : 0)
  )));
  
  // Heuristic: Humans have variance. Too much or too little is suspicious.
  if (speedVariance < 50 && keystrokeData.length > 50) {
    suspiciousFlags.push('Robotic typing speed consistency detected.');
    supportingEvidence.push(`Speed variance stayed unusually low at ${Math.round(speedVariance)} across ${keyDownEvents.length} keystrokes.`);
    score -= 20;
  }

  if (typingSpeed > 600) {
    suspiciousFlags.push('Typing speed exceeds normal human limits.');
    supportingEvidence.push(`Estimated typing speed reached ${Math.round(typingSpeed)} CPM.`);
    score -= 30;
  }

  if (pauseCount === 0 && keyDownEvents.length > 80) {
    suspiciousFlags.push('No long pauses detected in a long writing session.');
    supportingEvidence.push('Extended writing session showed no pauses above 2 seconds.');
    score -= 10;
  }

  if (vocabularyDiversity < 0.28 && wordCount > 120) {
    suspiciousFlags.push('Low vocabulary diversity for a long passage.');
    supportingEvidence.push(`Vocabulary diversity measured ${vocabularyDiversity.toFixed(3)} over ${wordCount} words.`);
    score -= 10;
  }

  if (sentenceLengthVariance < 8 && sentences.length >= 5) {
    suspiciousFlags.push('Sentence lengths are unusually uniform.');
    supportingEvidence.push(`Sentence-length variance stayed at ${Math.round(sentenceLengthVariance)} across ${sentences.length} sentences.`);
    score -= 10;
  }

  if (averageSentenceLength > 18 && revisionRate < 0.02 && wordCount > 80) {
    suspiciousFlags.push('Complex writing with unusually low revision activity.');
    supportingEvidence.push(`Average sentence length was ${averageSentenceLength.toFixed(1)} words while revision rate stayed at ${revisionRate.toFixed(3)}.`);
    score -= 15;
  }

  behaviorSummary.push(`Typing speed averaged ${Math.round(typingSpeed)} CPM with ${Math.round(averagePauseMs)} ms between keystrokes.`);
  behaviorSummary.push(`Detected ${pauseCount} long pauses, ${microPauseCount} micro-pauses, and ${revisionCount} revision keystrokes.`);
  behaviorSummary.push(`Burst typing appeared ${burstCount} times, which helps distinguish drafting rhythm from pasted content.`);

  linguisticSummary.push(`Vocabulary diversity scored ${vocabularyDiversity.toFixed(3)} across ${wordCount} words.`);
  linguisticSummary.push(`Sentence-length variance measured ${Math.round(sentenceLengthVariance)} across ${sentences.length} sentences.`);
  linguisticSummary.push(`Revision rate was ${revisionRate.toFixed(3)}, helping compare drafting activity to text complexity.`);

  // 4. Recommendation
  let recommendation = 'Authenticity Verified';
  if (score < 50) recommendation = 'Suspicious: Likely AI or Copied Content';
  else if (score < 80) recommendation = 'Inconclusive: Mixed patterns detected';

  return {
    reportId: crypto.randomUUID(),
    verificationTag: 'Verified by Vi-Notes',
    generatedAt: new Date().toISOString(),
    authenticityScore: Math.max(0, score),
    typingSpeed: Math.round(typingSpeed),
    speedVariance: Math.round(speedVariance),
    pauseCount,
    microPauseCount,
    punctuationPauseCount,
    revisionCount,
    revisionRate: Number(revisionRate.toFixed(3)),
    burstCount,
    averagePauseMs: Math.round(averagePauseMs),
    hesitationScore,
    rhythmScore,
    consistencyMismatchScore,
    wordCount,
    vocabularyDiversity: Number(vocabularyDiversity.toFixed(3)),
    sentenceLengthVariance: Math.round(sentenceLengthVariance),
    isPasted,
    suspiciousFlags,
    supportingEvidence,
    behaviorSummary,
    linguisticSummary,
    recommendation
  };
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b) / numbers.length;
  return numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length;
}

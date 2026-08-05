export const BOSS_MAX_HP = 120;
export const PLAYER_MAX_HP = 44;
export const ROUND_DURATION_MS = 12_000;

export const PHRASES = [
  "bright sparks cross the old forest",
  "quiet feet follow the moonlit path",
  "small steps can wake a mighty spell",
  "brave hearts keep a steady rhythm",
  "wild vines curl around ancient stones",
  "clear thoughts make the strongest magic",
  "soft rain taps on the hollow trees",
  "silver light fills the hidden valley",
  "steady hands shape a sharper spell",
  "green leaves dance above the trail",
  "quick minds outpace the gathering storm",
  "calm focus turns a whisper to thunder",
];

export const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function getRoundResult({
  acceptedLength,
  correct,
  elapsedMs,
  mistakes,
  phraseLength,
}) {
  const accuracy = correct / Math.max(1, correct + mistakes);
  const completion = acceptedLength / phraseLength;
  const elapsedMinutes = Math.max(400, elapsedMs) / 60_000;
  const wpm = clamp(acceptedLength / 5 / elapsedMinutes, 0, 120);
  const speedFactor = clamp(wpm / 40, 0.5, 1.75);
  const accuracyFactor = 0.25 + 0.75 * accuracy ** 2;
  const damage = Math.max(
    1,
    Math.round(22 * speedFactor * accuracyFactor * completion),
  );
  const bossDamage = Math.round(
    4 + 8 * (1 - accuracy) + 8 * (1 - completion),
  );

  let rating = "Interrupted";
  if (completion === 1 && accuracy === 1 && wpm >= 50) rating = "Perfect";
  else if (completion === 1 && accuracy >= 0.95 && wpm >= 40)
    rating = "Swift";
  else if (completion === 1 && accuracy >= 0.9) rating = "Sharp";
  else if (completion === 1) rating = "Steady";

  return { accuracy, bossDamage, completion, damage, rating, wpm };
}

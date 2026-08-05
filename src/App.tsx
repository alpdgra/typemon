import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BOSS_MAX_HP,
  clamp,
  getRoundResult,
  PHRASES,
  PLAYER_MAX_HP,
  ROUND_DURATION_MS,
} from "./game-logic.mjs";

type BattlePhase =
  | "idle"
  | "typing"
  | "playerAttack"
  | "bossAttack"
  | "victory"
  | "defeat";

type DamageBurst = {
  target: "boss" | "player";
  amount: number;
  id: number;
};

type RoundResult = ReturnType<typeof getRoundResult>;

function HealthBar({
  current,
  label,
  maximum,
}: {
  current: number;
  label: string;
  maximum: number;
}) {
  const percentage = clamp((current / maximum) * 100, 0, 100);
  const condition = percentage <= 25 ? "critical" : percentage <= 50 ? "low" : "good";

  return (
    <div className="health-readout">
      <div className="health-copy">
        <span>HP</span>
        <strong>
          {current}<small>/{maximum}</small>
        </strong>
      </div>
      <div
        aria-label={`${label} health: ${current} of ${maximum}`}
        aria-valuemax={maximum}
        aria-valuemin={0}
        aria-valuenow={current}
        className="health-track"
        role="progressbar"
      >
        <span
          className={`health-fill health-${condition}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Mossmaw({ isAttacking, isHit, isLow }: { isAttacking: boolean; isHit: boolean; isLow: boolean }) {
  return (
    <div
      aria-label="Mossmaw, a hulking forest beast"
      className={`mossmaw sprite ${isAttacking ? "is-attacking" : ""} ${isHit ? "is-hit" : ""} ${isLow ? "is-low" : ""}`}
      role="img"
    >
      <span className="mossmaw-antler antler-left" />
      <span className="mossmaw-antler antler-right" />
      <span className="mossmaw-ear ear-left" />
      <span className="mossmaw-ear ear-right" />
      <span className="mossmaw-body">
        <span className="moss-patch patch-one" />
        <span className="moss-patch patch-two" />
      </span>
      <span className="mossmaw-face">
        <span className="mossmaw-brow brow-left" />
        <span className="mossmaw-brow brow-right" />
        <span className="mossmaw-eye eye-left" />
        <span className="mossmaw-eye eye-right" />
        <span className="mossmaw-snout">
          <span className="mossmaw-nostril nostril-left" />
          <span className="mossmaw-nostril nostril-right" />
        </span>
        <span className="mossmaw-tooth tooth-left" />
        <span className="mossmaw-tooth tooth-right" />
      </span>
      <span className="mossmaw-foot foot-left" />
      <span className="mossmaw-foot foot-right" />
    </div>
  );
}

function Glyphling({ isAttacking, isHit }: { isAttacking: boolean; isHit: boolean }) {
  return (
    <div
      aria-label="Glyphling, a small rune-tailed companion"
      className={`glyphling sprite ${isAttacking ? "is-attacking" : ""} ${isHit ? "is-hit" : ""}`}
      role="img"
    >
      <span className="glyph-tail tail-tip" />
      <span className="glyph-tail tail-mid" />
      <span className="glyph-ear glyph-ear-left" />
      <span className="glyph-ear glyph-ear-right" />
      <span className="glyph-body" />
      <span className="glyph-head">
        <span className="glyph-mark">T</span>
        <span className="glyph-eye glyph-eye-left" />
        <span className="glyph-eye glyph-eye-right" />
        <span className="glyph-cheek" />
      </span>
      <span className="glyph-leg glyph-leg-left" />
      <span className="glyph-leg glyph-leg-right" />
    </div>
  );
}

export default function Home() {
  const [phase, setPhase] = useState<BattlePhase>("idle");
  const [bossHp, setBossHp] = useState(BOSS_MAX_HP);
  const [playerHp, setPlayerHp] = useState(PLAYER_MAX_HP);
  const [phrase, setPhrase] = useState(PHRASES[0]);
  const [typed, setTyped] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [correctKeystrokes, setCorrectKeystrokes] = useState(0);
  const [round, setRound] = useState(1);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(0);
  const [timeLeftMs, setTimeLeftMs] = useState(ROUND_DURATION_MS);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [damageBurst, setDamageBurst] = useState<DamageBurst | null>(null);
  const [announcement, setAnnouncement] = useState(
    "Mossmaw is blocking the forest trail.",
  );
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalMistakes, setTotalMistakes] = useState(0);
  const [totalWpm, setTotalWpm] = useState(0);
  const [completedRounds, setCompletedRounds] = useState(0);
  const [bestHit, setBestHit] = useState(0);
  const [inputError, setInputError] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const replayButtonRef = useRef<HTMLButtonElement>(null);
  const resolvingRef = useRef(false);
  const hiddenAtRef = useRef<number | null>(null);
  const lastPhraseRef = useRef(PHRASES[0]);
  const timeoutsRef = useRef<number[]>([]);

  const queueTimeout = useCallback((callback: () => void, delay: number) => {
    const timeout = window.setTimeout(callback, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  }, []);

  const clearQueuedTimeouts = useCallback(() => {
    timeoutsRef.current.forEach((timeout) => window.clearTimeout(timeout));
    timeoutsRef.current = [];
  }, []);

  useEffect(() => clearQueuedTimeouts, [clearQueuedTimeouts]);

  const choosePhrase = useCallback(() => {
    const choices = PHRASES.filter((item) => item !== lastPhraseRef.current);
    const next = choices[Math.floor(Math.random() * choices.length)];
    lastPhraseRef.current = next;
    return next;
  }, []);

  const beginNextRound = useCallback(
    (nextRound: number) => {
      const nextPhrase = choosePhrase();
      setPhrase(nextPhrase);
      setTyped("");
      setMistakes(0);
      setCorrectKeystrokes(0);
      setStartedAt(null);
      setClockNow(0);
      setTimeLeftMs(ROUND_DURATION_MS);
      setRoundResult(null);
      setDamageBurst(null);
      setInputError(false);
      setRound(nextRound);
      resolvingRef.current = false;
      setPhase("typing");
      setAnnouncement(`Round ${nextRound}. Type: ${nextPhrase}`);
    },
    [choosePhrase],
  );

  const startBattle = useCallback(() => {
    clearQueuedTimeouts();
    setBossHp(BOSS_MAX_HP);
    setPlayerHp(PLAYER_MAX_HP);
    setTotalCorrect(0);
    setTotalMistakes(0);
    setTotalWpm(0);
    setCompletedRounds(0);
    setBestHit(0);
    beginNextRound(1);
  }, [beginNextRound, clearQueuedTimeouts]);

  const resolveRound = useCallback(
    ({
      acceptedLength,
      correct,
      elapsedMs,
      errors,
    }: {
      acceptedLength: number;
      correct: number;
      elapsedMs: number;
      errors: number;
    }) => {
      if (resolvingRef.current) return;
      resolvingRef.current = true;

      const result = getRoundResult({
        acceptedLength,
        correct,
        elapsedMs,
        mistakes: errors,
        phraseLength: phrase.length,
      });
      const nextBossHp = Math.max(0, bossHp - result.damage);

      setRoundResult(result);
      setTotalCorrect((value) => value + correct);
      setTotalMistakes((value) => value + errors);
      setTotalWpm((value) => value + result.wpm);
      setCompletedRounds((value) => value + 1);
      setBestHit((value) => Math.max(value, result.damage));
      setPhase("playerAttack");
      setAnnouncement(`${result.rating} spell. Glyphling attacks.`);

      queueTimeout(() => {
        setBossHp(nextBossHp);
        setDamageBurst({ target: "boss", amount: result.damage, id: Date.now() });
        setAnnouncement(`Glyphling deals ${result.damage} damage to Mossmaw.`);

        if (nextBossHp === 0) {
          queueTimeout(() => {
            setPhase("victory");
            setAnnouncement("Victory. Mossmaw retreats from the trail.");
          }, 900);
          return;
        }

        queueTimeout(() => {
          setDamageBurst(null);
          setPhase("bossAttack");
          setAnnouncement("Mossmaw counters with Bramble Stomp.");

          queueTimeout(() => {
            const nextPlayerHp = Math.max(0, playerHp - result.bossDamage);
            setPlayerHp(nextPlayerHp);
            setDamageBurst({
              target: "player",
              amount: result.bossDamage,
              id: Date.now(),
            });
            setAnnouncement(
              `Mossmaw deals ${result.bossDamage} damage to Glyphling.`,
            );

            if (nextPlayerHp === 0) {
              queueTimeout(() => {
                setPhase("defeat");
                setAnnouncement("Glyphling needs a rest. The trail remains blocked.");
              }, 900);
              return;
            }

            queueTimeout(() => beginNextRound(round + 1), 1050);
          }, 520);
        }, 900);
      }, 520);
    },
    [beginNextRound, bossHp, phrase.length, playerHp, queueTimeout, round],
  );

  useEffect(() => {
    if (phase === "typing") {
      const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }

    if (phase === "victory" || phase === "defeat") {
      const timeout = window.setTimeout(() => replayButtonRef.current?.focus(), 250);
      return () => window.clearTimeout(timeout);
    }
  }, [phase, phrase]);

  useEffect(() => {
    if (phase !== "typing" || startedAt === null) return;

    const tick = () => {
      if (document.hidden) return;
      const current = performance.now();
      const remaining = Math.max(0, ROUND_DURATION_MS - (current - startedAt));
      setClockNow(current);
      setTimeLeftMs(remaining);

      if (remaining === 0) {
        resolveRound({
          acceptedLength: typed.length,
          correct: correctKeystrokes,
          elapsedMs: ROUND_DURATION_MS,
          errors: mistakes,
        });
      }
    };

    tick();
    const interval = window.setInterval(tick, 50);
    return () => window.clearInterval(interval);
  }, [
    correctKeystrokes,
    mistakes,
    phase,
    resolveRound,
    startedAt,
    typed.length,
  ]);

  useEffect(() => {
    if (phase !== "typing" || startedAt === null) return;

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = performance.now();
        return;
      }

      if (hiddenAtRef.current !== null) {
        const pauseLength = performance.now() - hiddenAtRef.current;
        setStartedAt((value) => (value === null ? null : value + pauseLength));
        hiddenAtRef.current = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [phase, startedAt]);

  useEffect(() => {
    if (phase !== "idle" && phase !== "victory" && phase !== "defeat") return;

    const handleBattleShortcut = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (
        event.repeat ||
        (event.target instanceof Element && event.target.closest("button"))
      ) return;

      event.preventDefault();
      startBattle();
    };

    window.addEventListener("keydown", handleBattleShortcut);
    return () => window.removeEventListener("keydown", handleBattleShortcut);
  }, [phase, startBattle]);

  const handleType = (value: string) => {
    if (phase !== "typing" || resolvingRef.current) return;

    const eventTime = performance.now();
    const roundStart = startedAt ?? eventTime;

    if (
      startedAt !== null &&
      eventTime - startedAt >= ROUND_DURATION_MS
    ) {
      resolveRound({
        acceptedLength: typed.length,
        correct: correctKeystrokes,
        elapsedMs: ROUND_DURATION_MS,
        errors: mistakes,
      });
      return;
    }

    if (startedAt === null && value.length > 0) {
      setStartedAt(eventTime);
      setClockNow(eventTime);
    }

    if (value.length < typed.length) {
      if (!typed.startsWith(value) || !phrase.startsWith(value)) {
        if (inputRef.current) inputRef.current.value = typed;
        return;
      }

      const nextTyped = value;
      const removed = typed.length - nextTyped.length;
      setTyped(nextTyped);
      setCorrectKeystrokes((count) => Math.max(0, count - removed));
      return;
    }

    if (!value.startsWith(typed)) {
      setMistakes((count) => count + 1);
      setInputError(false);
      window.requestAnimationFrame(() => setInputError(true));
      queueTimeout(() => setInputError(false), 180);
      return;
    }

    const added = value.slice(typed.length);
    let nextTyped = typed;
    let nextCorrect = correctKeystrokes;
    let nextMistakes = mistakes;
    let madeMistake = false;

    for (const character of added) {
      if (character === phrase[nextTyped.length]) {
        nextTyped += character;
        nextCorrect += 1;
      } else {
        nextMistakes += 1;
        madeMistake = true;
      }
    }

    setTyped(nextTyped);
    setCorrectKeystrokes(nextCorrect);
    setMistakes(nextMistakes);

    if (madeMistake) {
      setInputError(false);
      window.requestAnimationFrame(() => setInputError(true));
      queueTimeout(() => setInputError(false), 180);
    }

    if (nextTyped.length === phrase.length) {
      resolveRound({
        acceptedLength: nextTyped.length,
        correct: nextCorrect,
        elapsedMs: eventTime - roundStart,
        errors: nextMistakes,
      });
    }
  };

  const elapsedMs = startedAt === null ? 0 : Math.max(0, clockNow - startedAt);
  const liveWpm =
    elapsedMs > 0
      ? clamp(typed.length / 5 / (elapsedMs / 60_000), 0, 120)
      : 0;
  const liveAccuracy =
    correctKeystrokes + mistakes > 0
      ? correctKeystrokes / (correctKeystrokes + mistakes)
      : 1;
  const timerPercentage = (timeLeftMs / ROUND_DURATION_MS) * 100;
  const averageWpm = completedRounds > 0 ? totalWpm / completedRounds : 0;
  const overallAccuracy =
    totalCorrect + totalMistakes > 0
      ? totalCorrect / (totalCorrect + totalMistakes)
      : 1;
  const bossIsLow = bossHp / BOSS_MAX_HP <= 0.5;

  const battleMessage = useMemo(() => {
    if (phase === "typing")
      return startedAt === null ? "TYPE TO CAST" : "SPELL CHARGING";
    if (phase === "playerAttack")
      return `${roundResult?.rating?.toUpperCase() ?? "SPELL"} // GLYPHLING STRIKES`;
    if (phase === "bossAttack") return "MOSSMAW USES BRAMBLE STOMP";
    if (phase === "victory") return "TRAIL CLEARED";
    if (phase === "defeat") return "BATTLE ENDED";
    return "FIRST ENCOUNTER";
  }, [phase, roundResult, startedAt]);

  return (
    <main className={`game-root phase-${phase}`}>
      <div aria-hidden="true" className="world-grid" />
      <header className="game-header">
        <div className="brand-lockup">
          <span className="brand-glyph">T</span>
          <div>
            <p>TYPEBOUND</p>
            <span>A TYPING RPG</span>
          </div>
        </div>
        <div className="build-badge">
          <span className="status-pip" />
          FIELD TEST // 01
        </div>
      </header>

      <section aria-label="Typebound battle arena" className="battle-console">
        <div aria-hidden="true" className="console-rivet rivet-one" />
        <div aria-hidden="true" className="console-rivet rivet-two" />
        <div aria-hidden="true" className="console-rivet rivet-three" />
        <div aria-hidden="true" className="console-rivet rivet-four" />

        <div className="battle-stage">
          <div aria-hidden="true" className="pixel-sun" />
          <div aria-hidden="true" className="cloud cloud-one" />
          <div aria-hidden="true" className="cloud cloud-two" />
          <div aria-hidden="true" className="far-trees" />
          <div aria-hidden="true" className="near-grass" />

          <div className="round-flag">
            <span>ENCOUNTER</span>
            <strong>{String(round).padStart(2, "0")}</strong>
          </div>

          <div className="combatant-card boss-card">
            <div className="combatant-heading">
              <div>
                <span className="level-tag">WILD // LV. 08</span>
                <h1>MOSSMAW</h1>
              </div>
              <span aria-label="Mossmaw is an earth type" className="type-chip">
                EARTH
              </span>
            </div>
            <HealthBar current={bossHp} label="Mossmaw" maximum={BOSS_MAX_HP} />
          </div>

          <div className="boss-zone">
            <div aria-hidden="true" className="arena-shadow boss-shadow" />
            <Mossmaw
              isAttacking={phase === "bossAttack"}
              isHit={damageBurst?.target === "boss"}
              isLow={bossIsLow}
            />
            {damageBurst?.target === "boss" && (
              <span className="damage-number boss-damage" key={damageBurst.id}>
                -{damageBurst.amount}
              </span>
            )}
          </div>

          <div className="player-zone">
            <div aria-hidden="true" className="arena-shadow player-shadow" />
            <Glyphling
              isAttacking={phase === "playerAttack"}
              isHit={damageBurst?.target === "player"}
            />
            {damageBurst?.target === "player" && (
              <span className="damage-number player-damage" key={damageBurst.id}>
                -{damageBurst.amount}
              </span>
            )}
          </div>

          <div className="combatant-card player-card">
            <div className="combatant-heading">
              <div>
                <span className="level-tag">YOUR KIN // LV. 05</span>
                <h2>GLYPHLING</h2>
              </div>
              <span aria-label="Glyphling is a spark type" className="type-chip spark-chip">
                SPARK
              </span>
            </div>
            <HealthBar current={playerHp} label="Glyphling" maximum={PLAYER_MAX_HP} />
          </div>

          <div aria-live="off" className="battle-message">
            <span>{battleMessage}</span>
          </div>
        </div>

        <section aria-label="Battle controls" className="command-deck">
          {phase === "idle" && (
            <div className="intro-panel">
              <div className="intro-copy">
                <span className="eyebrow">FOREST GATE // FIRST ENCOUNTER</span>
                <h2>A wild obstacle appears.</h2>
                <p>
                  Type each spell cleanly. Speed builds power. Mistakes weaken
                  the hit.
                </p>
              </div>
              <button className="primary-action" onClick={startBattle} type="button">
                <span>BEGIN BATTLE</span>
                <kbd>ENTER</kbd>
              </button>
            </div>
          )}

          {(phase === "victory" || phase === "defeat") && (
            <div className="result-panel">
              <div className="result-title">
                <span className="eyebrow">
                  {phase === "victory" ? "ENCOUNTER COMPLETE" : "RETURN TO CAMP"}
                </span>
                <h2>{phase === "victory" ? "The trail is clear." : "Regroup and retry."}</h2>
                <p>
                  {phase === "victory"
                    ? "Mossmaw slips back into the brush. Glyphling looks stronger already."
                    : "Clean typing matters more than rushing. Glyphling is ready when you are."}
                </p>
              </div>
              <div className="result-stats" aria-label="Battle results">
                <div>
                  <span>AVG SPEED</span>
                  <strong>{Math.round(averageWpm)}<small> WPM</small></strong>
                </div>
                <div>
                  <span>ACCURACY</span>
                  <strong>{Math.round(overallAccuracy * 100)}<small>%</small></strong>
                </div>
                <div>
                  <span>BEST HIT</span>
                  <strong>{bestHit}<small> DMG</small></strong>
                </div>
              </div>
              <button
                className="primary-action replay-action"
                onClick={startBattle}
                ref={replayButtonRef}
                type="button"
              >
                <span>BATTLE AGAIN</span>
                <kbd>ENTER</kbd>
              </button>
            </div>
          )}

          {phase !== "idle" && phase !== "victory" && phase !== "defeat" && (
            <div className="typing-panel">
              <div className="round-summary">
                <div>
                  <span className="eyebrow">SPELL // ROUND {String(round).padStart(2, "0")}</span>
                  <strong>
                    {phase === "typing"
                      ? startedAt === null
                        ? "The clock starts on your first key"
                        : "Keep the rhythm"
                      : `${roundResult?.rating ?? "Spell"} · ${roundResult?.damage ?? 0} damage`}
                  </strong>
                </div>
                {roundResult && phase !== "typing" && (
                  <div className="resolved-metrics">
                    <span>{Math.round(roundResult.wpm)} WPM</span>
                    <span>{Math.round(roundResult.accuracy * 100)}% ACC</span>
                  </div>
                )}
              </div>

              <div className="phrase-window" aria-label={`Type this phrase: ${phrase}`}>
                {Array.from(phrase).map((character, index) => {
                  const state = index < typed.length ? "complete" : index === typed.length ? "current" : "waiting";
                  return (
                    <span className={`phrase-character ${state}`} key={`${character}-${index}`}>
                      {character === " " ? "\u00A0" : character}
                    </span>
                  );
                })}
              </div>

              <label className="typing-label" htmlFor="spell-input">
                <span>YOUR INPUT</span>
                <input
                  aria-describedby="spell-prompt typing-help"
                  aria-disabled={phase !== "typing"}
                  autoCapitalize="off"
                  autoComplete="off"
                  className={inputError ? "has-error" : ""}
                  id="spell-input"
                  inputMode="text"
                  onBeforeInput={(event) => {
                    if (phase !== "typing") event.preventDefault();
                  }}
                  onChange={(event) => {
                    if (phase !== "typing") {
                      event.currentTarget.value = typed;
                      return;
                    }
                    handleType(event.target.value.toLowerCase());
                  }}
                  onDrop={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if (
                      phase !== "typing" &&
                      (event.key.length === 1 ||
                        event.key === "Backspace" ||
                        event.key === "Delete")
                    ) {
                      event.preventDefault();
                    }
                  }}
                  onPaste={(event) => event.preventDefault()}
                  placeholder={phase === "typing" ? "Type here to begin…" : "Resolving attack…"}
                  ref={inputRef}
                  spellCheck={false}
                  type="text"
                  value={typed}
                />
              </label>
              <p className="sr-only" id="spell-prompt">
                Spell to type: {phrase}
              </p>
              <p className="sr-only" id="typing-help">
                Type the shown phrase. Incorrect keys count as mistakes and do not advance the phrase.
              </p>

              <div className="typing-hud">
                <div className="timer-group">
                  <div className="timer-copy">
                    <span>CAST WINDOW</span>
                    <strong>
                      {startedAt === null ? "READY" : `${(timeLeftMs / 1000).toFixed(1)}s`}
                    </strong>
                  </div>
                  <div
                    aria-label={`${Math.ceil(timeLeftMs / 1000)} seconds remaining`}
                    aria-valuemax={ROUND_DURATION_MS}
                    aria-valuemin={0}
                    aria-valuenow={Math.round(timeLeftMs)}
                    className="timer-track"
                    role="progressbar"
                  >
                    <span style={{ width: `${timerPercentage}%` }} />
                  </div>
                </div>
                <div className="live-stat">
                  <span>SPEED</span>
                  <strong>{Math.round(liveWpm)}<small> WPM</small></strong>
                </div>
                <div className="live-stat">
                  <span>ACCURACY</span>
                  <strong>{Math.round(liveAccuracy * 100)}<small>%</small></strong>
                </div>
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className="game-footer">
        <span>ACCURACY POWERS EVERY STRIKE</span>
        <span className="footer-rule" />
        <span>TYPEBOUND // PROTOTYPE 01</span>
      </footer>

      <div aria-live="polite" className="sr-only" role="status">
        {announcement}
      </div>
    </main>
  );
}

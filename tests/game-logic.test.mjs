import assert from "node:assert/strict";
import test from "node:test";
import {
  getRoundResult,
  PHRASES,
  ROUND_DURATION_MS,
} from "../src/game-logic.mjs";

const result = (overrides = {}) =>
  getRoundResult({
    acceptedLength: 30,
    correct: 30,
    elapsedMs: 9_000,
    mistakes: 0,
    phraseLength: 30,
    ...overrides,
  });

test("speed increases damage for equally accurate spells", () => {
  const steady = result();
  const fast = result({ elapsedMs: 6_000 });

  assert.equal(steady.wpm, 40);
  assert.equal(steady.damage, 22);
  assert.equal(steady.bossDamage, 4);
  assert.ok(fast.wpm > steady.wpm);
  assert.ok(fast.damage > steady.damage);
});

test("mistakes reduce attack damage and strengthen the counterattack", () => {
  const clean = result();
  const messy = result({ mistakes: 8 });

  assert.ok(messy.accuracy < clean.accuracy);
  assert.ok(messy.damage < clean.damage);
  assert.ok(messy.bossDamage > clean.bossDamage);
});

test("an incomplete spell is weaker and still resolves at the time limit", () => {
  const complete = result();
  const partial = result({
    acceptedLength: 15,
    correct: 15,
    elapsedMs: ROUND_DURATION_MS,
  });

  assert.equal(partial.completion, 0.5);
  assert.ok(partial.damage < complete.damage);
  assert.ok(partial.bossDamage > complete.bossDamage);
});

test("the phrase pool stays readable and input-friendly", () => {
  assert.ok(PHRASES.length >= 10);
  assert.equal(new Set(PHRASES).size, PHRASES.length);

  for (const phrase of PHRASES) {
    assert.match(phrase, /^[a-z ]+$/);
    assert.ok(phrase.length >= 25 && phrase.length <= 44);
  }
});

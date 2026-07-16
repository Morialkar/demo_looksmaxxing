import { describe, expect, it } from "vitest";
import { buildServer } from "../../src/server.js";

const healthyProfile = {
  age: 22,
  goals: ["clear skin"],
  budget: 30,
  timePerDay: 15,
  flags: { extremeLanguage: false, unrealisticGoals: false },
};

function parseSseEvents(body: string): Array<Record<string, unknown>> {
  return body
    .trim()
    .split("\n\n")
    .filter(Boolean)
    .map((chunk) => JSON.parse(chunk.replace(/^data: /, "")));
}

describe("POST /workflow", () => {
  it("returns 400 with a Zod-derived error message for a malformed body", async () => {
    const app = buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/workflow",
      payload: { age: 22 },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body) as { error: string };
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("streams an SSE event per step plus a final format event carrying the FinalPlan", async () => {
    const app = buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/workflow",
      payload: healthyProfile,
    });

    expect(response.headers["content-type"]).toContain("text/event-stream");

    const events = parseSseEvents(response.body);
    expect(events.map((e) => e.step)).toEqual([
      "intake",
      "safetyGate",
      "retrieve",
      "compose",
      "critique",
      "format",
    ]);

    const finalEvent = events[events.length - 1] as {
      finalPlan: { markdown: string; disclaimers: string[] };
    };
    expect(finalEvent.finalPlan.markdown.length).toBeGreaterThan(0);
    expect(finalEvent.finalPlan.disclaimers.length).toBeGreaterThan(0);
  });

  it("short-circuits to intake/safetyGate/format only for a risky profile", async () => {
    const app = buildServer();

    const response = await app.inject({
      method: "POST",
      url: "/workflow",
      payload: { ...healthyProfile, age: 15 },
    });

    const events = parseSseEvents(response.body);
    expect(events.map((e) => e.step)).toEqual(["intake", "safetyGate", "format"]);

    const finalEvent = events[events.length - 1] as { finalPlan: { markdown: string } };
    expect(finalEvent.finalPlan.markdown).toContain("Ressources");
  });
});

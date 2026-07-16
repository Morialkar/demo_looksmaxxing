import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PipelineState } from "../../src/pipeline/state.js";

const {
  order,
  intakeMock,
  safetyGateMock,
  retrieveMock,
  composeMock,
  critiqueMock,
  formatMock,
} = vi.hoisted(() => {
  const order: string[] = [];
  const mk = (name: string) =>
    vi.fn(async (s: PipelineState) => {
      order.push(name);
      return s;
    });
  return {
    order,
    intakeMock: mk("intake"),
    safetyGateMock: mk("safetyGate"),
    retrieveMock: mk("retrieve"),
    composeMock: mk("compose"),
    critiqueMock: mk("critique"),
    formatMock: mk("format"),
  };
});

vi.mock("../../src/pipeline/steps/intake.js", () => ({ intake: intakeMock }));
vi.mock("../../src/pipeline/steps/safetyGate.js", () => ({
  safetyGate: safetyGateMock,
}));
vi.mock("../../src/pipeline/steps/retrieve.js", () => ({
  retrieve: retrieveMock,
}));
vi.mock("../../src/pipeline/steps/compose.js", () => ({
  compose: composeMock,
}));
vi.mock("../../src/pipeline/steps/critique.js", () => ({
  critique: critiqueMock,
}));
vi.mock("../../src/pipeline/steps/format.js", () => ({ format: formatMock }));

const { runPipeline } = await import("../../src/pipeline/runPipeline.js");
const { createInitialState } = await import("../../src/pipeline/state.js");

describe("runPipeline", () => {
  beforeEach(() => {
    order.length = 0;
    for (const mock of [
      intakeMock,
      safetyGateMock,
      retrieveMock,
      composeMock,
      critiqueMock,
      formatMock,
    ]) {
      mock.mockClear();
    }
  });

  it("calls all 6 steps exactly once, in declared order, on the normal path", async () => {
    await runPipeline(createInitialState({}));

    expect(order).toEqual([
      "intake",
      "safetyGate",
      "retrieve",
      "compose",
      "critique",
      "format",
    ]);
    for (const mock of [
      intakeMock,
      safetyGateMock,
      retrieveMock,
      composeMock,
      critiqueMock,
      formatMock,
    ]) {
      expect(mock).toHaveBeenCalledTimes(1);
    }
  });

  it("skips retrieve/compose/critique when safetyGate routes to resources", async () => {
    safetyGateMock.mockImplementationOnce(async (s: PipelineState) => {
      order.push("safetyGate");
      return { ...s, route: "resources" as const };
    });

    await runPipeline(createInitialState({}));

    expect(order).toEqual(["intake", "safetyGate", "format"]);
    expect(retrieveMock).not.toHaveBeenCalled();
    expect(composeMock).not.toHaveBeenCalled();
    expect(critiqueMock).not.toHaveBeenCalled();
    expect(formatMock).toHaveBeenCalledTimes(1);
  });

  it("rejects the pipeline promise if a step throws, instead of swallowing the error", async () => {
    composeMock.mockImplementationOnce(async () => {
      throw new Error("compose exploded");
    });

    await expect(runPipeline(createInitialState({}))).rejects.toThrow(
      "compose exploded",
    );
    expect(formatMock).not.toHaveBeenCalled();
  });
});

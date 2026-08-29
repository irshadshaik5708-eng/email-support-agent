import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEmailReview: vi.fn().mockResolvedValue(42),
  listEmailReviewsByUser: vi.fn().mockResolvedValue([
    {
      id: 42,
      userId: 7,
      subject: "Duplicate charge",
      emailText: "I was charged twice for my subscription.",
      category: "Billing",
      sentiment: "Frustrated",
      urgency: "Medium",
      confidence: 78,
      draftText: "Hello, we are reviewing this billing issue.",
      knowledgeContext: JSON.stringify(["Refund Processing Policy"]),
      status: "in_review",
      createdAt: new Date("2026-08-29T10:00:00Z"),
      updatedAt: new Date("2026-08-29T10:00:00Z"),
    },
  ]),
  updateEmailReviewStatus: vi.fn().mockResolvedValue({}),
}));

vi.mock("./db", () => mocks);
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: JSON.stringify({
      category: "Billing",
      sentiment: "Frustrated",
      urgency: "Medium",
      confidence: 0.91,
      draftText: "Hello, we are reviewing your billing concern.",
      rationale: "The email references a duplicate payment.",
      knowledgeContext: ["Refund Processing Policy"],
      needsHumanReview: true,
    }) } }],
  }),
}));

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function anonymousContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function signedInContext(): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "internship-reviewer",
      email: "reviewer@example.com",
      name: "Internship Reviewer",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("emailAgent", () => {
  it("rejects empty or too-short public email input", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.emailAgent.analyze({ emailText: "" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns structured analysis for a valid public email", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    const result = await caller.emailAgent.analyze({ subject: "Duplicate charge", emailText: "I was charged twice for my subscription and need help." });
    expect(result).toMatchObject({
      category: "Billing",
      sentiment: "Frustrated",
      urgency: "Medium",
      confidence: 0.91,
      needsHumanReview: true,
    });
    expect(result.knowledgeContext).toContain("Refund Processing Policy");
  });

  it("requires authentication to read protected review history", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.emailAgent.history()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("saves, lists, and updates a signed-in review", async () => {
    const caller = appRouter.createCaller(signedInContext());
    const saved = await caller.emailAgent.saveReview({
      subject: "Duplicate charge",
      emailText: "I was charged twice for my subscription.",
      category: "Billing",
      sentiment: "Frustrated",
      urgency: "Medium",
      confidence: 0.78,
      draftText: "Hello, we are reviewing this billing issue.",
      knowledgeContext: ["Refund Processing Policy"],
      status: "in_review",
    });
    expect(saved).toEqual({ success: true, id: 42 });
    expect(mocks.createEmailReview).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, confidence: 78 }));

    const history = await caller.emailAgent.history();
    expect(history).toHaveLength(1);
    expect(history[0]?.status).toBe("in_review");

    const updated = await caller.emailAgent.updateStatus({ id: 42, status: "sent_simulated", draftText: "Final reviewed reply." });
    expect(updated).toEqual({ success: true });
    expect(mocks.updateEmailReviewStatus).toHaveBeenCalledWith(42, 7, "sent_simulated", "Final reviewed reply.");
  });

  it("requires authentication to update a review status", async () => {
    const caller = appRouter.createCaller(anonymousContext());
    await expect(caller.emailAgent.updateStatus({ id: 1, status: "approved" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

import { describe, expect, it } from "vitest";
import {
  isTechnicalErrorDetail,
  sanitizeMarketerErrorDetail,
} from "@/shared/lib/sanitizeErrorDetail";

describe("sanitizeErrorDetail", () => {
  it("detects backend artifact paths as technical", () => {
    expect(
      isTechnicalErrorDetail(
        "Missing /app/models/deepsets/model.pt and pub_universe.npy",
      ),
    ).toBe(true);
  });

  it("returns undefined for technical details", () => {
    expect(
      sanitizeMarketerErrorDetail("/app/data/processed/stage10/user_feat.npy"),
    ).toBeUndefined();
  });

  it("keeps short non-technical messages", () => {
    expect(sanitizeMarketerErrorDetail("Invalid audience size")).toBe(
      "Invalid audience size",
    );
  });
});

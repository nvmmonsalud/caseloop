import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CohortSuppressedState } from "./cohort-suppressed-state";

describe("CohortSuppressedState", () => {
  it("explains the threshold without revealing a small cohort count", () => {
    render(<CohortSuppressedState minimumCohortSize={5} />);

    expect(screen.getByText(/at least 5 completed responses/i)).toBeInTheDocument();
    expect(screen.getByText(/small-cohort count.*remain hidden/i)).toBeInTheDocument();
    expect(screen.queryByText(/currently \d+/i)).not.toBeInTheDocument();
  });
});

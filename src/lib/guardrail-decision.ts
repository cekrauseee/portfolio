import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

export const GuardrailDecisionSchema = z
  .object({
    approved: z
      .boolean()
      .describe("Whether the submitted content passes the input guardrail."),
  })
  .strict();

export type GuardrailDecision = z.infer<typeof GuardrailDecisionSchema>;

export const GUARDRAIL_DECISION_TEXT_CONFIG = {
  format: zodTextFormat(GuardrailDecisionSchema, "guardrail_decision"),
};

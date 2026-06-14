/** When unset, step trace is enabled in local/dev (NODE_ENV !== production). */
export function isAiStepTraceEnabled(): boolean {
  const flag = process.env.AI_STEP_TRACE_ENABLED?.trim().toLowerCase();
  if (flag === "true" || flag === "1") {
    return true;
  }
  if (flag === "false" || flag === "0") {
    return false;
  }
  return process.env.NODE_ENV !== "production";
}

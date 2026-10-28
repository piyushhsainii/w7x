import { Profiler, type ReactNode, type ProfilerOnRenderCallback } from "react";

const record: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
) => {
  document.dispatchEvent(
    new CustomEvent("aer:profile", {
      detail: { id, phase, actualDuration, baseDuration },
    }),
  );
};

/** Only the explicit audit build enables React's profiling bundle. */
export function AuditProfiler({ children }: { children: ReactNode }) {
  return import.meta.env.MODE === "audit" ? (
    <Profiler id="workspace" onRender={record}>
      {children}
    </Profiler>
  ) : (
    children
  );
}

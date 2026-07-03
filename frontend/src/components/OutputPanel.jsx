import { TerminalIcon, CpuIcon, ClockIcon, CheckCircle2Icon, AlertCircleIcon } from "lucide-react";

function OutputPanel({ output, isRunning }) {
  // Helper to format memory (Judge0 returns KB)
  const formatMemory = (kb) => {
    if (!kb) return "N/A";
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getStatusBadgeClass = (status) => {
    if (!status) return "badge-ghost";
    const lowercaseStatus = status.toLowerCase();
    if (lowercaseStatus.includes("accepted")) return "badge-success text-success-content";
    if (lowercaseStatus.includes("compile")) return "badge-warning text-warning-content";
    return "badge-error text-error-content";
  };

  return (
    <div className="h-full bg-base-100 flex flex-col border border-base-300 rounded-xl overflow-hidden shadow-sm">
      {/* Header bar */}
      <div className="px-4 py-3 bg-base-200 border-b border-base-300 flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm text-base-content">
          <TerminalIcon className="w-4 h-4 text-primary" />
          <span>Console Terminal</span>
        </div>

        {/* Metrics Section */}
        {!isRunning && output && (
          <div className="flex items-center gap-3">
            {/* Status */}
            <span className={`badge badge-sm font-semibold gap-1 px-2.5 py-3 ${getStatusBadgeClass(output.statusDescription)}`}>
              {output.success ? (
                <CheckCircle2Icon className="w-3.5 h-3.5" />
              ) : (
                <AlertCircleIcon className="w-3.5 h-3.5" />
              )}
              {output.statusDescription}
            </span>

            {/* Time */}
            {output.time && (
              <span className="flex items-center gap-1 text-xs text-base-content/75 bg-base-300/60 px-2 py-1 rounded font-mono">
                <ClockIcon className="w-3.5 h-3.5 text-base-content/50" />
                {output.time}s
              </span>
            )}

            {/* Memory */}
            {output.memory && (
              <span className="flex items-center gap-1 text-xs text-base-content/75 bg-base-300/60 px-2 py-1 rounded font-mono">
                <CpuIcon className="w-3.5 h-3.5 text-base-content/50" />
                {formatMemory(output.memory)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Terminal Area */}
      <div className="flex-1 bg-[#090b10] text-[#e0e6ed] p-5 font-mono text-xs overflow-auto flex flex-col justify-between">
        <div className="space-y-4 flex-1">
          {isRunning ? (
            <div className="flex flex-col gap-2 py-2">
              <div className="flex items-center gap-2 text-primary">
                <span className="loading loading-spinner loading-xs"></span>
                <span>$ executing solution on secure sandbox...</span>
              </div>
              <div className="text-base-content/40 pl-6 animate-pulse">[ Running test cases ]</div>
            </div>
          ) : output === null ? (
            <div className="space-y-2 py-2 text-base-content/40">
              <p>$ ready to compile code...</p>
              <p className="text-[11px] font-sans italic">Click the green "Run Code" button to send your solution to the sandboxed runtime.</p>
            </div>
          ) : output.success ? (
            <div className="space-y-2">
              <div className="text-success font-semibold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                <CheckCircle2Icon className="w-3.5 h-3.5" />
                Standard Output
              </div>
              <pre className="p-3 bg-success/5 rounded-lg border border-success/10 whitespace-pre-wrap max-w-full text-[#a8ffb2] text-[13px] leading-relaxed">
                {output.output || "No output returned"}
              </pre>
            </div>
          ) : (
            <div className="space-y-3">
              {output.output && (
                <div className="space-y-1">
                  <div className="text-base-content/50 text-[11px] uppercase tracking-wider mb-1">Partial Output</div>
                  <pre className="p-3 bg-base-300/5 rounded-lg border border-base-300/10 whitespace-pre-wrap max-w-full text-base-content/80 text-[13px] leading-relaxed">
                    {output.output}
                  </pre>
                </div>
              )}
              
              <div className="space-y-1">
                <div className="text-error font-semibold text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1">
                  <AlertCircleIcon className="w-3.5 h-3.5" />
                  Runtime / Compilation Error
                </div>
                <pre className="p-3 bg-error/5 rounded-lg border border-error/10 whitespace-pre-wrap max-w-full text-error text-[13px] leading-relaxed">
                  {output.error || "Execution failed"}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default OutputPanel;


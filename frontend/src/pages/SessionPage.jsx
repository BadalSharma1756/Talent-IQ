import { useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useEndSession, useJoinSession, useSessionById, useChangeSessionProblem } from "../hooks/useSessions";
import { PROBLEMS } from "../data/problems";
import { executeCode } from "../lib/piston";
import Navbar from "../components/Navbar";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { getDifficultyBadgeClass } from "../lib/utils";
import { Loader2Icon, LogOutIcon, PhoneOffIcon, AlertCircleIcon, CheckCircle2Icon, Code2Icon, SparklesIcon, ZapIcon, PlusIcon } from "lucide-react";
import CodeEditorPanel from "../components/CodeEditorPanel";
import OutputPanel from "../components/OutputPanel";
import toast from "react-hot-toast";
import confetti from "canvas-confetti";

import useStreamClient from "../hooks/useStreamClient";
import { StreamCall, StreamVideo } from "@stream-io/video-react-sdk";
import VideoCallUI from "../components/VideoCallUI";

function SessionPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUser();
  const [output, setOutput] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const changeProblemMutation = useChangeSessionProblem();

  const [searchParams] = useSearchParams();
  const urlPassword = searchParams.get("password") || "";
  const [isLocked, setIsLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState("");

  // Custom Problem creation modal state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customStarterCode, setCustomStarterCode] = useState("");
  const [customExpectedOutput, setCustomExpectedOutput] = useState("");
  const [customDifficulty, setCustomDifficulty] = useState("easy");
  const [customCategory, setCustomCategory] = useState("Custom Coding Task");

  const { data: sessionData, isLoading: loadingSession, refetch } = useSessionById(id);

  const joinSessionMutation = useJoinSession();
  const endSessionMutation = useEndSession();

  const session = sessionData?.session;
  const isHost = session?.host?.clerkId === user?.id;
  const isParticipant = session?.participant?.clerkId === user?.id;

  const { call, channel, chatClient, isInitializingCall, streamClient } = useStreamClient(
    session,
    loadingSession,
    isHost,
    isParticipant
  );

  // find the problem data based on session problem title (built-in or custom)
  const problemData = (() => {
    if (!session?.problem) return null;
    const builtIn = Object.values(PROBLEMS).find((p) => p.title.toLowerCase() === session.problem.toLowerCase());
    if (builtIn) return builtIn;
    const custom = session.customProblems?.find((p) => p.title.toLowerCase() === session.problem.toLowerCase());
    if (custom) return custom;
    return null;
  })();

  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [code, setCode] = useState("");

  // auto-join session if user is not already a participant and not the host
  useEffect(() => {
    if (!session || !user || loadingSession) return;
    if (isHost || isParticipant) return;

    // Check if room has a password and user hasn't successfully authenticated/joined yet
    if (session.password && !isParticipant) {
      joinSessionMutation.mutate({ id, password: urlPassword }, {
        onSuccess: () => {
          refetch();
          setIsLocked(false);
        },
        onError: (error) => {
          if (error.response?.status === 401) {
            setIsLocked(true); // Lock room and display lock screen
          } else {
            toast.error(error.response?.data?.message || "Failed to join session");
          }
        }
      });
    } else {
      // Direct join for public room
      joinSessionMutation.mutate({ id, password: "" }, {
        onSuccess: refetch,
        onError: () => {
          // If public room fails for some reason (e.g. participant was filled)
          toast.error("Unable to join session room");
        }
      });
    }

    // remove the joinSessionMutation, refetch from dependencies to avoid infinite loop
  }, [session, user, loadingSession, isHost, isParticipant, id, urlPassword]);

  // redirect the "participant" when session ends
  useEffect(() => {
    if (!session || loadingSession) return;

    if (session.status === "completed") navigate("/dashboard");
  }, [session, loadingSession, navigate]);

  // update code ONLY when problem ID or language actually changes
  useEffect(() => {
    if (problemData?.starterCode?.[selectedLanguage]) {
      setCode(problemData.starterCode[selectedLanguage]);
    }
  }, [problemData?.id, selectedLanguage]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setSelectedLanguage(newLang);
    // use problem-specific starter code
    const starterCode = problemData?.starterCode?.[newLang] || "";
    setCode(starterCode);
    setOutput(null);
  };

  const normalizeOutput = (val) => {
    return val
      .trim()
      .split("\n")
      .map((line) =>
        line
          .trim()
          .replace(/\[\s+/g, "[")
          .replace(/\s+\]/g, "]")
          .replace(/\s*,\s*/g, ",")
      )
      .filter((line) => line.length > 0)
      .join("\n");
  };

  const checkIfTestsPassed = (actual, expected) => {
    const normActual = normalizeOutput(actual);
    const normExpected = normalizeOutput(expected);
    return normActual === normExpected;
  };

  const handleRunCode = async () => {
    if (!problemData) return;
    setIsRunning(true);
    setOutput(null);

    const result = await executeCode(selectedLanguage, code);
    setOutput(result);
    setIsRunning(false);

    if (result.success && problemData.expectedOutput?.[selectedLanguage]) {
      const expectedOut = problemData.expectedOutput[selectedLanguage];
      const testsPassed = checkIfTestsPassed(result.output, expectedOut);

      if (testsPassed) {
        confetti({
          particleCount: 85,
          spread: 160,
          origin: { x: 0.2, y: 0.6 },
        });

        toast.success("Correct Solution! All test cases match expected outputs!");

        // Mark as solved in backend
        changeProblemMutation.mutate({
          id,
          problem: session.problem,
          markSolved: true
        }, {
          onSuccess: () => refetch()
        });
      } else {
        toast.error("Output did not match expected test case outputs.");
      }
    } else if (!result.success) {
      toast.error("Code execution failed!");
    }
  };

  const handleSelectProblem = (problemTitle) => {
    if (problemTitle === "custom-problem-trigger") {
      setShowCustomModal(true);
      return;
    }
    const selectedProb = Object.values(PROBLEMS).find(p => p.title === problemTitle);
    if (selectedProb) {
      changeProblemMutation.mutate({
        id,
        problem: selectedProb.title,
        difficulty: selectedProb.difficulty.toLowerCase()
      }, {
        onSuccess: () => {
          refetch();
          setOutput(null);
        }
      });
    }
  };

  const handleAdvanceToNextProblem = () => {
    const list = Object.values(PROBLEMS);
    const currentIndex = list.findIndex(p => p.title.toLowerCase() === session?.problem?.toLowerCase());
    const nextProblem = list[(currentIndex + 1) % list.length];
    if (nextProblem) {
      changeProblemMutation.mutate({
        id,
        problem: nextProblem.title,
        difficulty: nextProblem.difficulty.toLowerCase()
      }, {
        onSuccess: () => {
          refetch();
          setOutput(null);
        }
      });
    }
  };

  const handleCreateCustomProblem = (e) => {
    e.preventDefault();
    if (!customTitle || !customDesc || !customExpectedOutput) {
      toast.error("Please fill in Title, Description and Expected Output!");
      return;
    }

    const customProb = {
      id: `custom-${Date.now()}`,
      title: customTitle,
      difficulty: customDifficulty,
      category: customCategory,
      description: {
        text: customDesc,
        notes: []
      },
      examples: [
        { input: "See problem statement", output: customExpectedOutput }
      ],
      constraints: ["Time Limit: 2s"],
      starterCode: {
        javascript: customStarterCode || `function solve() {\n  // Write your solution here\n  \n}\nconsole.log(solve());`,
        python: customStarterCode || `def solve():\n    # Write your solution here\n    pass\n\nprint(solve())`,
        java: customStarterCode || `class Solution {\n    public static void main(String[] args) {\n        // Write your solution here\n        \n    }\n}`
      },
      expectedOutput: {
        javascript: customExpectedOutput,
        python: customExpectedOutput,
        java: customExpectedOutput
      }
    };

    changeProblemMutation.mutate({
      id,
      customProblemData: customProb
    }, {
      onSuccess: () => {
        setShowCustomModal(false);
        // Reset state
        setCustomTitle("");
        setCustomDesc("");
        setCustomStarterCode("");
        setCustomExpectedOutput("");
        refetch();
        setOutput(null);
      }
    });
  };

  const handleSubmitLockPassword = (e) => {
    e.preventDefault();
    if (!lockPassword.trim()) return;

    joinSessionMutation.mutate({ id, password: lockPassword.trim() }, {
      onSuccess: () => {
        refetch();
        setIsLocked(false);
        toast.success("Success! Room unlocked.");
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || "Incorrect room password!");
      }
    });
  };

  const handleEndSession = () => {
    setShowEndModal(true);
  };

  const confirmEndSession = () => {
    setShowEndModal(false);
    endSessionMutation.mutate(id, { onSuccess: () => navigate("/dashboard") });
  };

  if (isLocked) {
    return (
      <div className="h-screen w-screen bg-base-300 flex items-center justify-center p-4">
        <div className="card bg-base-100 shadow-2xl max-w-md w-full border border-base-300 p-6 rounded-2xl">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary animate-pulse">
              <AlertCircleIcon className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-base-content">Protected Room</h2>
            <p className="text-sm text-base-content/60">
              This session room is private and password-protected. Please enter the password to gain access.
            </p>
            
            <form onSubmit={handleSubmitLockPassword} className="space-y-4 pt-2">
              <input
                type="password"
                required
                placeholder="Enter password..."
                value={lockPassword}
                onChange={(e) => setLockPassword(e.target.value)}
                className="input input-bordered w-full rounded-xl text-center font-bold tracking-widest text-sm focus:outline-none"
              />
              <button
                type="submit"
                disabled={joinSessionMutation.isPending}
                className="btn btn-primary w-full rounded-xl gap-2 text-white font-bold"
              >
                {joinSessionMutation.isPending && <Loader2Icon className="w-4 h-4 animate-spin" />}
                Unlock Room
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden bg-base-100 flex flex-col">
      <Navbar />

      <div className="flex-1 min-h-0 relative">
        <PanelGroup direction="horizontal">
          {/* COLUMN 1 - PROBLEM DESCRIPTION */}
          <Panel defaultSize={30} minSize={20}>
            <div className="h-full overflow-y-auto bg-base-200 border-r border-base-300">
              {/* HEADER SECTION */}
              <div className="p-6 bg-base-100 border-b border-base-300">
                <div className="flex items-start justify-between mb-3 gap-2 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-black text-base-content leading-tight">
                        {session?.problem || "Loading..."}
                      </h1>
                      
                      {/* Solved Status Badge */}
                      {session?.solvedProblems?.includes(session.problem) && (
                        <span className="badge badge-success gap-1 text-xs py-2 px-2.5 font-bold shadow-sm">
                          <CheckCircle2Icon className="w-3.5 h-3.5" />
                          Solved
                        </span>
                      )}

                      {isHost && session?.status === "active" && (
                        <div className="flex items-center gap-2 mt-1">
                          <select
                            value={session?.problem || ""}
                            onChange={(e) => handleSelectProblem(e.target.value)}
                            disabled={changeProblemMutation.isPending}
                            className="select select-bordered select-xs font-semibold focus:outline-none"
                          >
                            <option disabled value="">Switch Problem</option>
                            <optgroup label="Built-in Challenges">
                              {Object.values(PROBLEMS).map((p) => (
                                <option key={p.id} value={p.title}>
                                  {p.title} ({p.difficulty})
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Custom Options">
                              <option value="custom-problem-trigger">+ Create Custom Problem...</option>
                            </optgroup>
                          </select>

                          {session?.solvedProblems?.includes(session.problem) && (
                            <button
                              onClick={handleAdvanceToNextProblem}
                              disabled={changeProblemMutation.isPending}
                              className="btn btn-success btn-xs font-bold gap-1 rounded"
                              title="Advance to next problem"
                            >
                              Next Problem →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {problemData?.category && (
                      <p className="text-base-content/60 mt-1 text-xs font-semibold">{problemData.category}</p>
                    )}
                    <p className="text-base-content/60 mt-2 text-xs">
                      Host: {session?.host?.name || "Loading..."} •{" "}
                      {session?.participant ? 2 : 1}/2 participants
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`badge badge-sm ${getDifficultyBadgeClass(
                        session?.difficulty
                      )}`}
                    >
                      {session?.difficulty.slice(0, 1).toUpperCase() +
                        session?.difficulty.slice(1) || "Easy"}
                    </span>
                    {isHost && session?.status === "active" && (
                      <button
                        onClick={handleEndSession}
                        disabled={endSessionMutation.isPending}
                        className="btn btn-error btn-xs gap-1.5"
                      >
                        {endSessionMutation.isPending ? (
                          <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <LogOutIcon className="w-3.5 h-3.5" />
                        )}
                        End
                      </button>
                    )}
                    {session?.status === "completed" && (
                      <span className="badge badge-ghost badge-sm">Completed</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* problem desc */}
                {problemData?.description && (
                  <div className={`bg-base-100/50 backdrop-blur-md rounded-2xl p-5 border border-base-content/10 shadow-lg relative overflow-hidden border-l-4 ${
                    session?.difficulty === "hard" ? "border-l-error" : 
                    session?.difficulty === "medium" ? "border-l-warning" : "border-l-success"
                  }`}>
                    <h2 className="text-md font-extrabold mb-3 text-base-content flex items-center gap-2">
                      <Code2Icon className="w-4 h-4 text-primary" />
                      <span>Description</span>
                    </h2>
                    <div className="space-y-3 text-sm leading-relaxed text-base-content/90 font-medium">
                      <p>{problemData.description.text}</p>
                      {problemData.description.notes?.map((note, idx) => (
                        <p key={idx} className="bg-base-200/40 p-3 rounded-lg border border-base-content/5 italic">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* examples section */}
                {problemData?.examples && problemData.examples.length > 0 && (
                  <div className="bg-base-100/50 backdrop-blur-md rounded-2xl p-5 border border-base-content/10 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-secondary to-primary" />
                    <h2 className="text-md font-extrabold mb-3 text-base-content flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-secondary" />
                      <span>Examples</span>
                    </h2>

                    <div className="space-y-4">
                      {problemData.examples.map((example, idx) => (
                        <div key={idx} className="group">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="badge badge-secondary badge-sm font-bold">Example {idx + 1}</span>
                          </div>
                          <div className="bg-base-300/40 rounded-xl p-4 border border-base-content/5 font-mono text-xs space-y-2.5 shadow-inner">
                            <div className="flex gap-3">
                              <span className="text-primary font-bold min-w-[65px] flex items-center gap-1">
                                <span className="size-1.5 bg-primary rounded-full" />
                                Input:
                              </span>
                              <span className="break-all text-base-content/90 bg-base-300/60 px-2 py-0.5 rounded">{example.input}</span>
                            </div>
                            <div className="flex gap-3">
                              <span className="text-secondary font-bold min-w-[65px] flex items-center gap-1">
                                <span className="size-1.5 bg-secondary rounded-full" />
                                Output:
                              </span>
                              <span className="break-all text-base-content/90 bg-base-300/60 px-2 py-0.5 rounded font-semibold">{example.output}</span>
                            </div>
                            {example.explanation && (
                              <div className="pt-2.5 border-t border-base-content/5 mt-2 flex gap-2 items-start text-base-content/70 font-sans text-xs">
                                <span className="font-bold text-base-content flex items-center gap-1 shrink-0">
                                  Explanation:
                                </span>
                                <span className="leading-relaxed">{example.explanation}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {problemData?.constraints && problemData.constraints.length > 0 && (
                  <div className="bg-base-100/50 backdrop-blur-md rounded-2xl p-5 border border-base-content/10 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-accent to-secondary" />
                    <h2 className="text-md font-extrabold mb-3 text-base-content flex items-center gap-2">
                      <ZapIcon className="w-4 h-4 text-accent" />
                      <span>Constraints</span>
                    </h2>
                    <ul className="space-y-2">
                      {problemData.constraints.map((constraint, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-sm text-base-content/85">
                          <span className="mt-1 flex items-center justify-center size-4 rounded-full bg-accent/10 text-accent font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <code className="text-xs font-mono bg-base-300/40 px-1.5 py-0.5 rounded border border-base-content/5 text-accent-content font-semibold">
                            {constraint}
                          </code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

          {/* COLUMN 2 - CODE EDITOR & OUTPUT TERMINAL */}
          <Panel defaultSize={45} minSize={30}>
            <PanelGroup direction="vertical">
              <Panel defaultSize={70} minSize={35}>
                <CodeEditorPanel
                  selectedLanguage={selectedLanguage}
                  code={code}
                  isRunning={isRunning}
                  onLanguageChange={handleLanguageChange}
                  onCodeChange={(value) => setCode(value)}
                  onRunCode={handleRunCode}
                />
              </Panel>

              <PanelResizeHandle className="h-1.5 bg-base-300 hover:bg-primary transition-colors cursor-row-resize" />

              <Panel defaultSize={30} minSize={15}>
                <OutputPanel output={output} isRunning={isRunning} />
              </Panel>
            </PanelGroup>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-base-300 hover:bg-primary transition-colors cursor-col-resize" />

          {/* COLUMN 3 - VIDEO CALLS & CHAT */}
          <Panel defaultSize={25} minSize={20}>
            <div className="h-full bg-base-200 p-3 overflow-auto border-l border-base-300">
              {isInitializingCall ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2Icon className="w-10 h-10 mx-auto animate-spin text-primary mb-3" />
                    <p className="text-sm">Connecting to video call...</p>
                  </div>
                </div>
              ) : !streamClient || !call ? (
                <div className="h-full flex items-center justify-center">
                  <div className="card bg-base-100 shadow-xl max-w-sm">
                    <div className="card-body items-center text-center p-6">
                      <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-3">
                        <PhoneOffIcon className="w-8 h-8 text-error" />
                      </div>
                      <h2 className="card-title text-xl">Connection Failed</h2>
                      <p className="text-xs text-base-content/70">Unable to connect to the video call</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <StreamVideo client={streamClient}>
                    <StreamCall call={call}>
                      <VideoCallUI chatClient={chatClient} channel={channel} />
                    </StreamCall>
                  </StreamVideo>
                </div>
              )}
            </div>
          </Panel>
        </PanelGroup>
      {/* End Session Confirmation Modal */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-base-100 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-base-300 transform scale-100 transition-all duration-300 ease-out animate-scale-up">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-error/15 flex items-center justify-center text-error shrink-0">
                <AlertCircleIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-base-content">End Interview Session?</h3>
                <p className="text-sm text-base-content/70 mt-1">
                  Are you sure you want to end this session? This will disconnect all participants and permanently close the room.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowEndModal(false)}
                className="btn btn-ghost hover:bg-base-300 btn-sm px-4"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndSession}
                disabled={endSessionMutation.isPending}
                className="btn btn-error btn-sm px-4 gap-2"
              >
                {endSessionMutation.isPending && (
                  <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                )}
                Yes, End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Problem Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-base-100 rounded-3xl p-7 max-w-lg w-full shadow-2xl border border-base-content/10 transform scale-100 transition-all duration-300 ease-out animate-scale-up max-h-[92vh] overflow-y-auto relative">
            <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-primary via-secondary to-accent" />
            <h3 className="text-2xl font-black text-base-content mb-2 flex items-center gap-2">
              <PlusIcon className="w-6 h-6 text-primary" />
              <span>Add Custom Problem</span>
            </h3>
            <p className="text-xs text-base-content/60 mb-6">
              Create a custom challenge on the fly. This will update the active coding challenge for all participants.
            </p>
            
            <form onSubmit={handleCreateCustomProblem} className="space-y-5">
              <div>
                <label className="label text-xs font-bold uppercase tracking-wider text-base-content/75">Problem Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Find Target Index"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="input input-bordered w-full text-sm rounded-xl focus:outline-none focus:border-primary border-base-content/20 bg-base-200/50"
                />
              </div>
 
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs font-bold uppercase tracking-wider text-base-content/75">Difficulty</label>
                  <select
                    value={customDifficulty}
                    onChange={(e) => setCustomDifficulty(e.target.value)}
                    className="select select-bordered w-full text-sm rounded-xl focus:outline-none focus:border-primary border-base-content/20 bg-base-200/50"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs font-bold uppercase tracking-wider text-base-content/75">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Arrays • Search"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="input input-bordered w-full text-sm rounded-xl focus:outline-none focus:border-primary border-base-content/20 bg-base-200/50"
                  />
                </div>
              </div>
 
              <div>
                <label className="label text-xs font-bold uppercase tracking-wider text-base-content/75">Description & Instructions</label>
                <textarea
                  required
                  placeholder="Write clear instructions for the candidate..."
                  value={customDesc}
                  onChange={(e) => setCustomDesc(e.target.value)}
                  rows="3"
                  className="textarea textarea-bordered w-full text-sm rounded-xl focus:outline-none focus:border-primary border-base-content/20 bg-base-200/50 leading-relaxed"
                />
              </div>
 
              <div>
                <label className="label text-xs font-bold uppercase tracking-wider text-base-content/75">Expected Output (Console print match)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. [1,2] or true"
                  value={customExpectedOutput}
                  onChange={(e) => setCustomExpectedOutput(e.target.value)}
                  className="input input-bordered w-full font-mono text-sm rounded-xl focus:outline-none focus:border-primary border-base-content/20 bg-base-200/50"
                />
              </div>
 
              <div>
                <label className="label text-xs font-bold uppercase tracking-wider text-base-content/75">Starter Code (Optional)</label>
                <textarea
                  placeholder="// Write starter code or leave empty for default function template..."
                  value={customStarterCode}
                  onChange={(e) => setCustomStarterCode(e.target.value)}
                  rows="3"
                  className="textarea textarea-bordered w-full font-mono text-xs rounded-xl focus:outline-none focus:border-primary border-base-content/20 bg-base-200/50 leading-relaxed"
                />
              </div>
 
              <div className="flex justify-end gap-3 pt-3 border-t border-base-content/10">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="btn btn-ghost btn-sm px-5 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changeProblemMutation.isPending}
                  className="btn btn-primary btn-sm px-6 rounded-xl text-xs font-bold text-white gap-2"
                >
                  {changeProblemMutation.isPending && (
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
                  )}
                  Create Problem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export default SessionPage;

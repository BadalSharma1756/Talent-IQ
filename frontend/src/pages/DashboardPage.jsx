import { useNavigate } from "react-router";
import { useUser } from "@clerk/clerk-react";
import { useState } from "react";
import { useActiveSessions, useCreateSession, useMyRecentSessions } from "../hooks/useSessions";

import Navbar from "../components/Navbar";
import WelcomeSection from "../components/WelcomeSection";
import StatsCards from "../components/StatsCards";
import ActiveSessions from "../components/ActiveSessions";
import RecentSessions from "../components/RecentSessions";
import CreateSessionModal from "../components/CreateSessionModal";

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomConfig, setRoomConfig] = useState({ problem: "", difficulty: "", password: "" });
  const [roomIdInput, setRoomIdInput] = useState("");
  const [roomPasswordInput, setRoomPasswordInput] = useState("");

  const createSessionMutation = useCreateSession();

  const { data: activeSessionsData, isLoading: loadingActiveSessions } = useActiveSessions();
  const { data: recentSessionsData, isLoading: loadingRecentSessions } = useMyRecentSessions();

  const handleCreateRoom = () => {
    if (!roomConfig.problem || !roomConfig.difficulty) return;

    createSessionMutation.mutate(
      {
        problem: roomConfig.problem,
        difficulty: roomConfig.difficulty.toLowerCase(),
        password: roomConfig.password || "",
      },
      {
        onSuccess: (data) => {
          setShowCreateModal(false);
          // Host doesn't need to pass password in URL as they bypass it in backend, but keep it clean
          navigate(`/session/${data.session._id}`);
        },
      }
    );
  };

  const handleJoinRoomSubmit = (e) => {
    e.preventDefault();
    if (!roomIdInput.trim()) return;

    const passwordQuery = roomPasswordInput.trim() 
      ? `?password=${encodeURIComponent(roomPasswordInput.trim())}` 
      : "";
    navigate(`/session/${roomIdInput.trim()}${passwordQuery}`);
    setShowJoinModal(false);
    setRoomIdInput("");
    setRoomPasswordInput("");
  };

  const activeSessions = activeSessionsData?.sessions || [];
  const recentSessions = recentSessionsData?.sessions || [];

  const isUserInSession = (session) => {
    if (!user.id) return false;

    return session.host?.clerkId === user.id || session.participant?.clerkId === user.id;
  };

  return (
    <>
      <div className="min-h-screen bg-base-300">
        <Navbar />
        <WelcomeSection 
          onCreateSession={() => setShowCreateModal(true)} 
          onJoinSession={() => setShowJoinModal(true)} 
        />

        {/* Grid layout */}
        <div className="container mx-auto px-6 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <StatsCards
              activeSessionsCount={activeSessions.length}
              recentSessionsCount={recentSessions.length}
            />
            <ActiveSessions
              sessions={activeSessions}
              isLoading={loadingActiveSessions}
              isUserInSession={isUserInSession}
            />
          </div>

          <RecentSessions sessions={recentSessions} isLoading={loadingRecentSessions} />
        </div>
      </div>

      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        roomConfig={roomConfig}
        setRoomConfig={setRoomConfig}
        onCreateRoom={handleCreateRoom}
        isCreating={createSessionMutation.isPending}
      />

      {/* Join Room Modal */}
      {showJoinModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md rounded-2xl p-6">
            <h3 className="font-bold text-2xl mb-4">Join Room</h3>
            <form onSubmit={handleJoinRoomSubmit} className="space-y-4">
              <div>
                <label className="label text-xs font-bold uppercase text-base-content/60">Room ID / Session ID</label>
                <input
                  type="text"
                  required
                  placeholder="Paste Room ID here..."
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value)}
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="label text-xs font-bold uppercase text-base-content/60">Password (If private room)</label>
                <input
                  type="password"
                  placeholder="Enter room password..."
                  value={roomPasswordInput}
                  onChange={(e) => setRoomPasswordInput(e.target.value)}
                  className="input input-bordered w-full rounded-xl text-sm"
                />
              </div>

              <div className="modal-action pt-2">
                <button 
                  type="button" 
                  className="btn btn-ghost btn-sm rounded-xl px-4" 
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm rounded-xl px-5"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop" onClick={() => setShowJoinModal(false)}></div>
        </div>
      )}
    </>
  );
}

export default DashboardPage;

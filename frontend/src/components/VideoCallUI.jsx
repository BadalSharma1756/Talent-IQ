import {
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { 
  Loader2Icon, 
  MessageSquareIcon, 
  UsersIcon, 
  XIcon,
  MicIcon,
  MicOffIcon,
  VideoIcon,
  VideoOffIcon,
  PhoneOffIcon,
  MonitorIcon,
  CircleDotIcon,
  SquareIcon
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Channel, Chat, MessageInput, MessageList, Thread, Window } from "stream-chat-react";

import "@stream-io/video-react-sdk/dist/css/styles.css";
import "stream-chat-react/dist/css/v2/index.css";

function VideoCallUI({ chatClient, channel }) {
  const navigate = useNavigate();
  const call = useCall();
  const { 
    useCallCallingState, 
    useParticipantCount, 
    useCameraState, 
    useMicrophoneState,
    useScreenShareState,
    useIsCallRecordingInProgress
  } = useCallStateHooks();

  const callingState = useCallCallingState();
  const participantCount = useParticipantCount();
  const [isChatOpen, setIsChatOpen] = useState(false);

  const { camera, optimisticIsMute: isCameraMuted } = useCameraState();
  const { microphone, optimisticIsMute: isMicMuted } = useMicrophoneState();
  const { screenShare, status: screenShareStatus } = useScreenShareState();
  const isScreenSharing = screenShareStatus === "enabled";
  const isCallRecordingInProgress = useIsCallRecordingInProgress();
  const [isRecordingLoading, setIsRecordingLoading] = useState(false);

  const toggleCamera = async () => {
    try {
      await camera.toggle();
    } catch (e) {
      console.error("Error toggling camera:", e);
    }
  };

  const toggleMicrophone = async () => {
    try {
      await microphone.toggle();
    } catch (e) {
      console.error("Error toggling microphone:", e);
    }
  };

  const toggleScreenShare = async () => {
    try {
      await screenShare.toggle();
    } catch (e) {
      console.error("Error toggling screen share:", e);
    }
  };

  const toggleRecording = async () => {
    if (!call) return;
    setIsRecordingLoading(true);
    try {
      if (isCallRecordingInProgress) {
        await call.stopRecording();
      } else {
        await call.startRecording();
      }
    } catch (e) {
      console.error("Error toggling recording:", e);
    } finally {
      setIsRecordingLoading(false);
    }
  };

  if (callingState === CallingState.JOINING) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader2Icon className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
          <p className="text-lg">Joining call...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2 relative str-video">
      {/* Top Header Row */}
      <div className="flex items-center justify-between bg-base-100 p-2 rounded-lg shadow-sm border border-base-300 shrink-0">
        {/* Left: Participants count */}
        <div className="flex items-center gap-1.5 bg-base-200 px-2 py-1 rounded-md border border-base-300 shrink-0">
          <UsersIcon className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-bold">
            {participantCount} {participantCount === 1 ? "User" : "Users"}
          </span>
        </div>

        {/* Middle: Controls Dock */}
        <div className="flex items-center gap-1.5 shrink-0 font-sans">
          {/* Toggle Mic Button */}
          <button
            onClick={toggleMicrophone}
            className={`btn btn-circle btn-xs shadow-sm transition-all duration-150 active:scale-95 size-7 ${
              isMicMuted ? "btn-error btn-outline" : "btn-primary"
            }`}
            title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMicMuted ? <MicOffIcon className="size-3.5" /> : <MicIcon className="size-3.5 text-white" />}
          </button>

          {/* Toggle Camera Button */}
          <button
            onClick={toggleCamera}
            className={`btn btn-circle btn-xs shadow-sm transition-all duration-150 active:scale-95 size-7 ${
              isCameraMuted ? "btn-error btn-outline" : "btn-primary"
            }`}
            title={isCameraMuted ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCameraMuted ? <VideoOffIcon className="size-3.5" /> : <VideoIcon className="size-3.5 text-white" />}
          </button>

          {/* Toggle Screen Share Button */}
          <button
            onClick={toggleScreenShare}
            className={`btn btn-circle btn-xs shadow-sm transition-all duration-150 active:scale-95 size-7 ${
              isScreenSharing ? "btn-accent" : "btn-primary"
            }`}
            title={isScreenSharing ? "Stop Screen Share" : "Share Screen"}
          >
            <MonitorIcon className={`size-3.5 ${isScreenSharing ? "text-accent-content" : "text-white"}`} />
          </button>

          {/* Toggle Recording Button */}
          <button
            onClick={toggleRecording}
            disabled={isRecordingLoading}
            className={`btn btn-circle btn-xs shadow-sm transition-all duration-150 active:scale-95 size-7 ${
              isCallRecordingInProgress ? "btn-error animate-pulse" : "btn-primary"
            }`}
            title={isCallRecordingInProgress ? "Stop Recording" : "Start Recording"}
          >
            {isRecordingLoading ? (
              <Loader2Icon className="size-3 animate-spin text-white" />
            ) : isCallRecordingInProgress ? (
              <SquareIcon className="size-3 text-white" />
            ) : (
              <CircleDotIcon className="size-3.5 text-white" />
            )}
          </button>

          {/* Leave/Disconnect Button */}
          <button
            onClick={() => navigate("/dashboard")}
            className="btn btn-circle btn-error btn-xs shadow-sm transition-all duration-150 active:scale-95 size-7"
            title="Leave Room"
          >
            <PhoneOffIcon className="size-3.5 text-white" />
          </button>
        </div>

        {/* Right: Chat Toggle */}
        {chatClient && channel && (
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`btn btn-xs gap-1 px-2.5 h-7 min-h-0 ${isChatOpen ? "btn-primary" : "btn-ghost border border-base-300"}`}
            title={isChatOpen ? "Hide chat" : "Show chat"}
          >
            <MessageSquareIcon className="size-3.5" />
            <span className="text-[10px] font-bold">Chat</span>
          </button>
        )}
      </div>

      {/* Video layout box */}
      <div className="bg-base-300 rounded-lg overflow-hidden relative border border-base-300 flex-1 min-h-[120px]">
        <SpeakerLayout />
      </div>

      {/* Chat Area */}
      {chatClient && channel && (
        <div
          className={`flex flex-col rounded-lg shadow border border-base-300 overflow-hidden bg-[#272a30] transition-all duration-300 ease-in-out ${
            isChatOpen ? "h-[240px] opacity-100" : "h-0 opacity-0 pointer-events-none"
          }`}
        >
          {isChatOpen && (
            <>
              <div className="bg-[#1c1e22] px-3 py-1.5 border-b border-[#3a3d44] flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-xs text-white">Session Chat</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close chat"
                >
                  <XIcon className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden stream-chat-dark text-xs">
                <Chat client={chatClient} theme="str-chat__theme-dark">
                  <Channel channel={channel}>
                     <Window>
                       <MessageList />
                       <MessageInput />
                     </Window>
                     <Thread />
                  </Channel>
                </Chat>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export default VideoCallUI;

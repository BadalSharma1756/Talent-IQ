import { chatClient, streamClient } from "../lib/stream.js";
import Session from "../models/Session.js";

export async function createSession(req, res) {
  try {
    const { problem, difficulty, password } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    if (!problem || !difficulty) {
      return res.status(400).json({ message: "Problem and difficulty are required" });
    }

    // generate a unique call id for stream video
    const callId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // create session in db with optional password
    const session = await Session.create({ problem, difficulty, host: userId, callId, password: password || "" });

    // create stream video call
    await streamClient.video.call("default", callId).getOrCreate({
      data: {
        created_by_id: clerkId,
        custom: { problem, difficulty, sessionId: session._id.toString() },
      },
    });

    // chat messaging
    const channel = chatClient.channel("messaging", callId, {
      name: `${problem} Session`,
      created_by_id: clerkId,
      members: [clerkId],
    });

    await channel.create();

    res.status(201).json({ session });
  } catch (error) {
    console.log("Error in createSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getActiveSessions(_, res) {
  try {
    const sessions = await Session.find({ status: "active" })
      .populate("host", "name profileImage email clerkId")
      .populate("participant", "name profileImage email clerkId")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getActiveSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getMyRecentSessions(req, res) {
  try {
    const userId = req.user._id;

    // get sessions where user is either host or participant
    const sessions = await Session.find({
      status: "completed",
      $or: [{ host: userId }, { participant: userId }],
    })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ sessions });
  } catch (error) {
    console.log("Error in getMyRecentSessions controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function getSessionById(req, res) {
  try {
    const { id } = req.params;

    const session = await Session.findById(id)
      .populate("host", "name email profileImage clerkId")
      .populate("participant", "name email profileImage clerkId");

    if (!session) return res.status(404).json({ message: "Session not found" });

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in getSessionById controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function joinSession(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;
    const userId = req.user._id;
    const clerkId = req.user.clerkId;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    if (session.status !== "active") {
      return res.status(400).json({ message: "Cannot join a completed session" });
    }

    // Host can access their own session without password
    if (session.host.toString() === userId.toString()) {
      return res.status(200).json({ session });
    }

    // If user is already the registered participant, allow access
    if (session.participant && session.participant.toString() === userId.toString()) {
      return res.status(200).json({ session });
    }

    // check if session is already full - has another participant
    if (session.participant) return res.status(409).json({ message: "Session is full" });

    // Validate password if configured on the room
    if (session.password && session.password !== password) {
      return res.status(401).json({ message: "Invalid room password" });
    }

    session.participant = userId;
    await session.save();

    const channel = chatClient.channel("messaging", session.callId);
    await channel.addMembers([clerkId]);

    res.status(200).json({ session });
  } catch (error) {
    console.log("Error in joinSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function endSession(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const session = await Session.findById(id);

    if (!session) return res.status(404).json({ message: "Session not found" });

    // check if user is the host
    if (session.host.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Only the host can end the session" });
    }

    // check if session is already completed
    if (session.status === "completed") {
      return res.status(400).json({ message: "Session is already completed" });
    }

    // delete stream video call
    const call = streamClient.video.call("default", session.callId);
    await call.delete({ hard: true });

    // delete stream chat channel
    const channel = chatClient.channel("messaging", session.callId);
    await channel.delete();

    session.status = "completed";
    await session.save();

    res.status(200).json({ session, message: "Session ended successfully" });
  } catch (error) {
    console.log("Error in endSession controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function changeSessionProblem(req, res) {
  try {
    const { id } = req.params;
    const { problem, difficulty, customProblemData, markSolved } = req.body;
    const userId = req.user._id;

    const session = await Session.findById(id);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Check if user is host or participant
    const isHost = session.host.toString() === userId.toString();
    const isParticipant = session.participant && session.participant.toString() === userId.toString();

    if (!isHost && !isParticipant) {
      return res.status(403).json({ message: "Unauthorized access to session" });
    }

    if (markSolved) {
      if (!session.solvedProblems.includes(problem)) {
        session.solvedProblems.push(problem);
      }
      await session.save();
      return res.status(200).json({ session, message: "Problem marked as solved" });
    }

    // Only host can switch/change problem
    if (!isHost) {
      return res.status(403).json({ message: "Only the host can change the problem" });
    }

    if (customProblemData) {
      // It's a custom problem!
      const exists = session.customProblems?.some(p => p.title === customProblemData.title);
      if (!exists) {
        if (!session.customProblems) session.customProblems = [];
        session.customProblems.push(customProblemData);
      }
      session.problem = customProblemData.title;
      session.difficulty = customProblemData.difficulty || "easy";
    } else if (problem) {
      // It's a built-in problem
      session.problem = problem;
      session.difficulty = difficulty || "easy";
    }

    await session.save();
    res.status(200).json({ session, message: "Problem changed successfully" });
  } catch (error) {
    console.log("Error in changeSessionProblem controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
}

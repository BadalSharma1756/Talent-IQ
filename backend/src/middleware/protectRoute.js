import { requireAuth } from "@clerk/express";
import User from "../models/User.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;

      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      // find user in db by clerk ID
      let user = await User.findOne({ clerkId });

      console.log(`[DEBUG] protectRoute - ClerkID: ${clerkId}, Found User in DB:`, user ? user._id : "NOT FOUND");

      if (!user) {
        // Fallback for local development or webhook delivery delays:
        // Automatically fetch profile from Clerk API and sync in DB
        try {
          const { clerkClient } = await import("@clerk/express");
          const clerkUser = await clerkClient.users.getUser(clerkId);
          if (clerkUser) {
            const newUser = {
              clerkId: clerkId,
              email: clerkUser.emailAddresses?.[0]?.emailAddress || "",
              name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User",
              profileImage: clerkUser.imageUrl || "",
            };
            user = await User.create(newUser);
            
            // Sync to Stream Chat client
            try {
              const { upsertStreamUser } = await import("../lib/stream.js");
              await upsertStreamUser({
                id: clerkId,
                name: user.name,
                image: user.profileImage,
              });
            } catch (streamErr) {
              console.error("Error upserting stream user in fallback:", streamErr);
            }
            
            console.log(`[DEBUG] protectRoute - ClerkID: ${clerkId} was automatically synchronized/created in DB!`);
          }
        } catch (syncErr) {
          console.error("Error dynamically syncing user from Clerk:", syncErr);
        }
      }

      if (!user) return res.status(404).json({ message: "User not found" });

      // attach user to req
      req.user = user;

      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal Server Error" });
    }
  },
];

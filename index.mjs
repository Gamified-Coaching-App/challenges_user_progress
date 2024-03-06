import { validateAndExtractDetails, queryChallenges, createResponse, updateChallenges } from './utils.mjs';

export async function handler(event) {
  try {
    const { userId, distance, workoutTimeConverted, activityType } = validateAndExtractDetails(event);
    
    if (activityType !== "RUNNING") {
      console.log("The activity type is not RUNNING. Skipping...");
      return createResponse(200, { message: "No operation performed as the activity type is not RUNNING." });
    }

    const challenges = await queryChallenges(userId, workoutTimeConverted);
    
    if (challenges.length === 0) {
      console.log(`No current challenges found for user ${userId}`);
      return createResponse(200, { message: "No current challenges found for the user." });
    }

    await updateChallenges(userId, challenges, distance);

    console.log(`Successfully updated challenges for user ${userId}`);
    return createResponse(200, { message: "Challenges updated successfully." });
  } catch (error) {
    console.error("Error processing event:", error);
    return createResponse(500, { error: "Failed to process event due to an internal error." });
  }
}
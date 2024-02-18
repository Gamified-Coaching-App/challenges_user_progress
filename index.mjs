import aws from 'aws-sdk';

const { DynamoDB } = aws;
const documentClient = new DynamoDB.DocumentClient();

export async function handler(event) {
  // Validate the event structure
  if (!event.detail || typeof event.detail.user_id === 'undefined' || typeof event.detail.distance_in_meters === 'undefined') {
    console.error('Invalid event structure:', event);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid event structure. Must include event.detail with user_id and distance_in_meters." }),
    };
  }

  // Extract required details from the event
  const { user_id: userId, distance_in_meters: distance, timestamp_local: workoutTime, activity_type: activityType } = event.detail;

  if (activityType !== "RUNNING") {
    // Handle the case where the activity_type is not RUNNING, 
    // such as skipping the operation, logging a message, or returning a specific response
    console.log("The activity type is not RUNNING. Skipping...");
    return {
      statusCode: 200, // Or another appropriate status code
      body: JSON.stringify({ message: "No operation performed as the activity type is not RUNNING." }),
    };
  }

  const tableName = "challenges";

  // Define query parameters to find active challenges for the user
  const queryParams = {
    TableName: tableName,
    // can only be used with the table's primary key attributes
    KeyConditionExpression: "#user_id = :userIdValue",
    ExpressionAttributeNames: {
      "#user_id": "user_id",
      "#status": "status",
      "#start_date": "start_date",
      "#end_date": "end_date",
    },
    ExpressionAttributeValues: {
      ":userIdValue": userId,
      ":currentStatus": "current",
      ":workoutTime": workoutTime, // Assuming workoutTime is a timestamp or date
    },
    FilterExpression: "#status = :currentStatus AND #start_date <= :workoutTime AND #end_date >= :workoutTime",
  };

  try {
    // Execute the query to find active challenges
    const queryResult = await documentClient.query(queryParams).promise();
    const challenges = queryResult.Items;

    // Handle case with no current challenges found
    if (challenges.length === 0) {
      console.log(`No current challenges found for user ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No current challenges found for the user." }),
      };
    }

    // Iterate over challenges to update them
    for (const challenge of challenges) {
      const newMCompleted = challenge.completed_meters + distance;
      const isCompleted = newMCompleted >= challenge.target_meters;
      const newStatus = isCompleted ? "completed" : "current";

      if (isCompleted) {
        const completionData = {
            userId: userId, // ID of the user who completed the challenge
            pointsEarned: challenge.points, // Points earned from completing the challenge
            newStatus: "completed" // Status of the challenge
        };
    
        // SNS messages
        const message = {
            Message: JSON.stringify({
                default: JSON.stringify(completionData),
            }),
            TopicArn: 'arn:aws:sns:region:account-id:ChallengeCompletionNotification',
            MessageStructure: 'json', 
        };
    
        await sns.publish(message).promise();
        console.log("Published completion message to SNS topic:", message);
      }

      const updateParams = {
        TableName: tableName,
        Key: { "user_id": userId, "challenge_id": challenge.challenge_id },
        UpdateExpression: "SET completed_meters = :newMCompleted, #status = :newStatus",
        ExpressionAttributeValues: {
          ":newMCompleted": newMCompleted,
          ":newStatus": newStatus,
        },
        ExpressionAttributeNames: {
          "#status": "status",
        },
      };

      // Execute update operation
      await documentClient.update(updateParams).promise();
    }

    console.log(`Successfully updated challenges for user ${userId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges updated successfully." }),
    };
  } catch (error) {
    console.error("Error updating challenges for user:", userId, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }),
    };
  }
}

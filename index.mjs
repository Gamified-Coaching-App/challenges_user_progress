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
  const { user_id: userId, distance_in_meters: distance, timestamp_local: workoutTime } = event.detail;
  const tableName = "challenges";

  // Define query parameters to find active challenges for the user
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: "#user_id = :userIdValue",
    ExpressionAttributeNames: {
      "#user_id": "user_id",
      "#status": "status",
      "#start_date": "start_date",
      "#end_date": "end_date"
    },
    ExpressionAttributeValues: {
      ":userIdValue": userId,
      ":currentStatus": "current",
      ":workoutTime": workoutTime // Assuming workoutTime is a timestamp or date
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
      const newStatus = newMCompleted >= challenge.target_meters ? "completed" : "current";

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

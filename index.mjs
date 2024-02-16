import aws from 'aws-sdk';

const { DynamoDB } = aws;
const documentClient = new DynamoDB.DocumentClient();

export async function handler(event) {
  if (!event.detail || typeof event.detail.user_id === 'undefined' || typeof event.detail.distance_in_meters === 'undefined') {
    console.error('Invalid event structure:', event);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid event structure. Must include event.detail with user_id and distance_in_meters." }),
    };
  }

  const { user_id: userId, distance_in_meters: distance } = event.detail;
  const numericDistance = Number(distance);
  const challengesTableName = "challenges"; // Make sure this is the correct table name

  try {
    const activeChallenges = await documentClient.query({
      TableName: challengesTableName,
      KeyConditionExpression: "user_id = :user_id",
      ExpressionAttributeValues: {
        ":user_id": userId
      },
    }).promise();

    if (!activeChallenges.Items || activeChallenges.Items.length === 0) {
      console.log(`No challenges found for user ${userId}`);
      return { statusCode: 404, body: JSON.stringify({ message: "No challenges found for the user." }) };
    }

    const updatePromises = activeChallenges.Items.map(async (challenge) => {
      const newMCompleted = (challenge.completed_meters || 0) + numericDistance;

      let updateExpression = "SET completed_meters = :completed_meters";
      let expressionAttributeNames = {};
      let expressionAttributeValues = {
        ":completed_meters": newMCompleted
      };

      if (newMCompleted >= challenge.target_meters) {
        updateExpression += ", #status = :newStatus";
        expressionAttributeNames = {
          "#status": "status"
        };
        expressionAttributeValues[":newStatus"] = "completed";
      }

      return documentClient.update({
        TableName: challengesTableName,
        Key: {
          "user_id": userId,
          "challenge_id": challenge.challenge_id
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues
      }).promise();
    });

    await Promise.all(updatePromises);
    console.log(`Successfully updated challenges for user ${userId}`);
    return { statusCode: 200, body: JSON.stringify({ message: "Challenges updated successfully." }) };

  } catch (error) {
    console.error("Error updating challenges for user:", userId, error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }) };
  }
}

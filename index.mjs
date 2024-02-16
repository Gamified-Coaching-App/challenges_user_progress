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
  const enrollmentTableName = "challenges_user_enrollment";

  try {
    // Query the active challenges for the user
    const queryParams = {
      TableName: enrollmentTableName,
      KeyConditionExpression: "#user_id = :user_id",
      ExpressionAttributeNames: {
        "#user_id": "user_id",
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":user_id": userId,
        ":status": "active"
      },
    };

    const queryResult = await documentClient.query(queryParams).promise();
    const activeChallenges = queryResult.Items;

    if (activeChallenges.length === 0) {
      console.log(`No active challenges found for user ${userId}`);
      return { statusCode: 404, body: JSON.stringify({ message: "No active challenges found for the user." }) };
    }

    // Process each active challenge
    for (let challenge of activeChallenges) {
      // Update completed_meters and check if it exceeds target_meters
      const challengeId = challenge.challenge_id; // Assuming challenge_id is numeric since you've changed it to a number
      const updateParams = {
        TableName: enrollmentTableName,
        Key: { "user_id": userId, "challenge_id": challengeId },
        UpdateExpression: "SET completed_meters = completed_meters + :distance",
        ConditionExpression: "attribute_exists(challenge_id) AND completed_meters + :distance >= target_meters",
        ExpressionAttributeValues: {
          ":distance": numericDistance,
        },
        ReturnValues: "ALL_NEW" // Returns all of the attributes of the item after the update
      };

      try {
        const updateResult = await documentClient.update(updateParams).promise();
        // If completed_meters is greater than or equal to target_meters, update status to "active"
        if (updateResult.Attributes.completed_meters >= updateResult.Attributes.target_meters) {
          const statusUpdateParams = {
            TableName: enrollmentTableName,
            Key: { "user_id": userId, "challenge_id": challengeId },
            UpdateExpression: "SET #status = :newStatus",
            ExpressionAttributeValues: {
              ":newStatus": "active",
            },
            ExpressionAttributeNames: {
              "#status": "status"
            }
          };
          await documentClient.update(statusUpdateParams).promise();
        }
      } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
          // This means completed_meters did not exceed target_meters, no update needed
          console.log(`Challenge ${challengeId} for user ${userId} has not reached the target.`);
        } else {
          // Handle other errors
          throw err;
        }
      }
    }

    console.log(`Successfully processed challenges for user ${userId}`);
    return { statusCode: 200, body: JSON.stringify({ message: "Challenges processed successfully." }) };
  } catch (error) {
    console.error("Error processing challenges for user:", userId, error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to process challenges due to an internal error." }) };
  }
}

// Import the entire AWS SDK package
import aws from 'aws-sdk';

// Destructure to get DynamoDB
const { DynamoDB } = aws;

const documentClient = new DynamoDB.DocumentClient();

export async function handler(event) {
  // Ensure event.detail is properly structured
  if (!event.detail || typeof event.detail.user_id === 'undefined' || typeof event.detail.distance_in_meters === 'undefined') {
    console.error('Invalid event structure:', event);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid event structure. Must include event.detail with user_id and distance_in_meters." }),
    };
  }

  const { user_id: userId, distance_in_meters: distance } = event.detail;
  const tableName = "challenges_user_enrollment";

  // Prepare query parameters to find challenges for the user
  const queryParams = {
    TableName: tableName,
    KeyConditionExpression: "#user_id = :user_id",
    ExpressionAttributeNames: { "#user_id": "user_id" },
    ExpressionAttributeValues: { ":user_id": userId },
  };

  try {
    const queryResult = await documentClient.query(queryParams).promise();
    const challenges = queryResult.Items;

    if (challenges.length === 0) {
      console.log(`No challenges found for user ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No challenges found for the user." }),
      };
    }

    // Batch update challenges with new distance
    const updatePromises = challenges.map(challenge => {
      const updateParams = {
        TableName: tableName,
        Key: { user_id: userId, challenge_id: challenge.challenge_id },
        UpdateExpression: "SET m_completed = m_completed + :distance",
        ExpressionAttributeValues: { ":distance": distance },
      };

      return documentClient.update(updateParams).promise();
    });

    await Promise.all(updatePromises);
    console.log(`Successfully updated m_completed for user ${userId} in ${challenges.length} challenges`);

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "m_completed updated successfully for all challenges." }),
    };
  } catch (error) {
    console.error("Error updating challenges for user:", userId, error);
    // Return error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }),
    };
  }
}

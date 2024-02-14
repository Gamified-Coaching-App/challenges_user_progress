// Use destructuring to import only what you need from the SDK
import { DynamoDB } from 'aws-sdk';

const documentClient = new DynamoDB.DocumentClient();

export async function handler(event) {
    // what would trigger this?
  const { user_id: userId, distance_in_meters: distance } = event.detail;

  const tableName = "challenges_user_enrollment";
  const params = {
    TableName: tableName,
    KeyConditionExpression: "#user_id = :user_id",
    ExpressionAttributeNames: {
      "#user_id": "user_id",
    },
    ExpressionAttributeValues: {
      ":user_id": userId,
    },
  };

  try {
    const { Items: challenges } = await documentClient.query(params).promise();

    await Promise.all(challenges.map(challenge => {
      const updateParams = {
        TableName: tableName,
        Key: {
          user_id: userId,
          challenge_id: challenge.challenge_id,
        },
        UpdateExpression: "SET m_completed = m_completed + :distance",
        ExpressionAttributeValues: {
          ":distance": distance,
        },
      };

      return documentClient.update(updateParams).promise();
    }));

    console.log(`Successfully updated m_completed for user ${userId} in ${challenges.length} challenges`);
  } catch (error) {
    console.error(`Error updating m_completed for user ${userId}:`, error);
    // Enhanced error handling
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error processing your request" }),
    };
  }

  // Success response
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "m_completed updated successfully" }),
  };
}

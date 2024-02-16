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
    // Directly use a scan as a fallback if querying without an index. Note: This is not efficient for large datasets.
    const scanParams = {
      TableName: enrollmentTableName,
      FilterExpression: "#user_id = :user_id and #status = :status",
      ExpressionAttributeNames: {
        "#user_id": "user_id",
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":user_id": userId,
        ":status": "active"
      },
    };

    const scanResult = await documentClient.scan(scanParams).promise();
    const activeEnrollments = scanResult.Items;

    if (activeEnrollments.length === 0) {
      console.log(`No active challenges found for user ${userId}`);
      return { statusCode: 404, body: JSON.stringify({ message: "No active challenges found for the user." }) };
    }

    for (let enrollment of activeEnrollments) {
      const updateParams = {
        TableName: enrollmentTableName,
        Key: { "user_id": userId, "challenge_id": enrollment.challenge_id },
        UpdateExpression: "SET m_completed = m_completed + :distance",
        ExpressionAttributeValues: {
          ":distance": numericDistance,
        },
      };

      await documentClient.update(updateParams).promise();
    }

    console.log(`Successfully updated challenges for user ${userId}`);
    return { statusCode: 200, body: JSON.stringify({ message: "Challenges updated successfully." }) };
  } catch (error) {
    console.error("Error updating challenges for user:", userId, error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }) };
  }
}

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
  const numericDistance = Number(distance_in_meters); // Ensure distance is a number
  const enrollmentTableName = "challenges_user_enrollment";

  // Query parameters to find active challenges for the user
  const queryParams = {
    TableName: enrollmentTableName,
    IndexName: "StatusIndex", // Assuming there's a GSI for status, if not, adjust accordingly.
    KeyConditionExpression: "#user_id = :user_id and #status = :status",
    ExpressionAttributeNames: {
      "#user_id": "user_id",
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":user_id": userId,
      ":status": "active"
    },
  };

  try {
    const queryResult = await documentClient.query(queryParams).promise();
    const activeEnrollments = queryResult.Items;

    if (activeEnrollments.length === 0) {
      console.log(`No active challenges found for user ${userId}`);
      return { statusCode: 404, body: JSON.stringify({ message: "No active challenges found for the user." }) };
    }

    for (let enrollment of activeEnrollments) {
      console.log(`Processing enrollment: ${enrollment.challenge_id} for user: ${userId}`);

      // Update m_completed directly with added distance
      const updateParams = {
        TableName: enrollmentTableName,
        Key: { "user_id": userId, "challenge_id": enrollment.challenge_id },
        UpdateExpression: "SET m_completed = m_completed + :distance",
        ExpressionAttributeValues: { ":distance": numericDistance },
      };

      await documentClient.update(updateParams).promise();
      console.log(`Updated m_completed for challenge: ${enrollment.challenge_id} for user: ${userId}`);
    }

    console.log(`Successfully processed challenges for user ${userId}`);
    return { statusCode: 200, body: JSON.stringify({ message: "Challenges processed successfully." }) };
  } catch (error) {
    console.error("Error processing challenges for user:", userId, error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to process challenges due to an internal error." }) };
  }
}

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

  // Extract necessary details from the event
  const { user_id: userId, distance_in_meters: distance } = event.detail;
  
  // Ensure distance is correctly typed as a number
  const numericDistance = Number(distance);

  // Define the table name where user enrollments are stored
  const enrollmentTableName = "challenges_user_enrollment";

  // Prepare query parameters to find active challenges for the user
  const queryParams = {
    TableName: enrollmentTableName,
    IndexName: "UserStatusIndex", // Assuming an index for querying by user and status
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
    // Query the user's active challenge enrollments
    const queryResult = await documentClient.query(queryParams).promise();
    const activeEnrollments = queryResult.Items;

    if (activeEnrollments.length === 0) {
      console.log(`No active challenges found for user ${userId}`);
      return { statusCode: 404, body: JSON.stringify({ message: "No active challenges found for the user." }) };
    }

    // Iterate through active enrollments to update them
    const updatePromises = activeEnrollments.map(enrollment => {
      const updateParams = {
        TableName: enrollmentTableName,
        Key: { "user_id": userId, "challenge_id": enrollment.challenge_id },
        UpdateExpression: "SET m_completed = m_completed + :distance",
        ExpressionAttributeValues: {
          ":distance": numericDistance,
        },
      };

      return documentClient.update(updateParams).promise();
    });

    // Wait for all updates to complete
    await Promise.allSettled(updatePromises);
    console.log(`Successfully updated challenges for user ${userId}`);

    // Return success response
    return { statusCode: 200, body: JSON.stringify({ message: "Challenges updated successfully." }) };
  } catch (error) {
    // Log and return error response
    console.error("Error updating challenges for user:", userId, error);
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }) };
  }
}

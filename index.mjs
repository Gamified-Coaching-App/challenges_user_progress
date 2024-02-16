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
  const enrollmentTableName = "challenges_user_enrollment";
  const challengesTableName = "challenges";

  // Ensure distance is a number
  const numericDistance = Number(distance);

  // Query parameters to find active challenges for the user
  const queryParams = {
    TableName: enrollmentTableName,
    KeyConditionExpression: "#user_id = :user_id",
    FilterExpression: "#status = :status",
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
    const enrollments = queryResult.Items;

    if (enrollments.length === 0) {
      console.log(`No active challenges found for user ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No active challenges found for the user." }),
      };
    }

    const updatePromises = enrollments.map(async (enrollment) => {
      // Assuming challenge_id is a string and used as a sort key
      const challengeId = String(enrollment.challenge_id);

      // Get the challenge details to find out the m_target
      const challengeData = await documentClient.get({
        TableName: challengesTableName,
        Key: { "challenge_id": challengeId }
      }).promise();

      const m_target = challengeData.Item ? challengeData.Item.m_target : null;
      if (m_target === null) {
        throw new Error(`Challenge with ID ${challengeId} not found.`);
      }

      const newMCompleted = enrollment.m_completed + numericDistance;
      let updateExpression = "SET m_completed = :m_completed";
      const expressionAttributeValues = { ":m_completed": newMCompleted };
      let expressionAttributeNames = {};

      // Check if the challenge is completed
      if (newMCompleted >= m_target) {
        updateExpression += ", #status = :newStatus";
        expressionAttributeNames["#status"] = "status";
        expressionAttributeValues[":newStatus"] = "completed";
      }

      // Update the challenge enrollment with the new meters completed and potentially new status
      await documentClient.update({
        TableName: enrollmentTableName,
        Key: { "user_id": userId, "challenge_id": challengeId },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames })
      }).promise();
    });

    await Promise.allSettled(updatePromises);
    console.log(`Successfully processed challenges for user ${userId}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges processed successfully." }),
    };
  } catch (error) {
    console.error("Error processing challenges for user:", userId, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process challenges due to an internal error." }),
    };
  }
}

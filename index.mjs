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
      // Get the m_target from the challenges table
      const getChallengeParams = {
        TableName: challengesTableName,
        Key: {
          "challenge_id": enrollment.challenge_id
        }
      };

      const challengeResponse = await documentClient.get(getChallengeParams).promise();
      if (!challengeResponse || !challengeResponse.Item) {
        throw new Error(`Challenge with ID ${enrollment.challenge_id} not found.`);
      }

      const m_target = challengeResponse.Item.m_target; // Now safely extracted
      const newMCompleted = enrollment.m_completed + distance;
      let updateExpression = "SET m_completed = :m_completed";
      let expressionAttributeNames = {};
      const expressionAttributeValues = {
        ":m_completed": newMCompleted,
      };

      // Check if the challenge is completed
      if (newMCompleted >= m_target) {
        updateExpression += ", #status = :newStatus";
        expressionAttributeValues[":newStatus"] = "completed";
        expressionAttributeNames = { "#status": "status" }; // Only include if updating status
      }

      const updateParams = {
        TableName: enrollmentTableName,
        Key: { user_id: userId, challenge_id: enrollment.challenge_id },
        UpdateExpression: updateExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      };

      // Only add ExpressionAttributeNames to the params if it's not empty
      if (Object.keys(expressionAttributeNames).length > 0) {
        updateParams.ExpressionAttributeNames = expressionAttributeNames;
      }

      return documentClient.update(updateParams).promise();
    });

    await Promise.all(updatePromises);
    console.log(`Successfully updated challenges for user ${userId}`);

    // Success response
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges updated successfully." }),
    };
  } catch (error) {
    console.error("Error updating challenges for user:", userId, error);
    // Error response
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }),
    };
  }
}

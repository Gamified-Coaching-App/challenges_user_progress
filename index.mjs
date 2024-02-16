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

  const { user_id: userId, distance_in_meters: distance, timestamp_local = workoutTime, activity_type: type } = event.detail;
  const tableName = "challenges";

  // only query challenges that cover the workout time
  let filterExpression = "#status = :currentStatus";
  filterExpression += " AND #user_id = :userIdValue AND #start_date <= :workoutTime AND #end_date >= :workoutTime";

  // Query parameters to find active challenges for the user
  const queryParams = {
    TableName: tableName,
    ExpressionAttributeNames: {
      "#user_id": "user_id",
      "#status": "status",
      "#start_date": "start_date",
      "#end_date": "end_date"
    },
    ExpressionAttributeValues: {
      ":currentStatus": "current",
      ":userIdValue": userId,
      ":workoutTime": workoutTime // Using the workoutTime from the event
    },
  };

  try {
    // Query Execution and Processing Results
    const queryResult = await documentClient.query(queryParams).promise();
    const challenges = queryResult.Items;
    
    // Check for No Results
    if (challenges.length === 0) {
      console.log(`No current challenges found for user ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No current challenges found for the user." }),
      };
    }

    // Update Challenges
    const updatePromises = challenges.map(async (challenge) => {
      // calcualte the new 
      const newMCompleted = challenge.completed_meters + distance;
      // dynomoDB update expression
      let updateExpression = "SET completed_meters = :completed_meters";
      // initialise but populate only if the challenge is completed
      let expressionAttributeNames = {};
      const expressionAttributeValues = {
        ":completed_meters": newMCompleted,
      };

      // Check if the challenge is completed
      if (newMCompleted >= challenge.target_meters) {
        // update the status
        updateExpression += ", #status = :newStatus";
        expressionAttributeValues[":newStatus"] = "completed";
        expressionAttributeNames = { "#status": "status" }; // Only include if updating status
      }

      const updateParams = {
        TableName: tableName,
        Key: { user_id: userId, challenge_id: challenge.challenge_id },
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

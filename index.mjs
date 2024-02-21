import aws from 'aws-sdk';
import https from 'https';

const { DynamoDB } = aws;
const documentClient = new DynamoDB.DocumentClient();
const sns = new aws.SNS();

export async function handler(event) {

  if (!event.detail || typeof event.detail.user_id === 'undefined' || typeof event.detail.distance_in_meters === 'undefined') {
    console.error('Invalid event structure:', event);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid event structure. Must include event.detail with user_id and distance_in_meters." }),
    };
  }

  // Extract required details from the event
  const { user_id: userId, distance_in_meters: distance, timestamp_local: workoutTime, activity_type: activityType } = event.detail;

  if (activityType !== "RUNNING") {
    // Handle the case where the activity_type is not RUNNING, 
    // such as skipping the operation, logging a message, or returning a specific response
    console.log("The activity type is not RUNNING. Skipping...");
    return {
      statusCode: 200, // Or another appropriate status code
      body: JSON.stringify({ message: "No operation performed as the activity type is not RUNNING." }),
    };
  }

  const tableName = "challenges";

  // Define query parameters to find active challenges for the user
  const queryParams = {
    TableName: tableName,
    // can only be used with the table's primary key attributes
    KeyConditionExpression: "#user_id = :userIdValue",
    ExpressionAttributeNames: {
      "#user_id": "user_id",
      "#status": "status",
      "#start_date": "start_date",
      "#end_date": "end_date",
    },
    ExpressionAttributeValues: {
      ":userIdValue": userId,
      ":currentStatus": "current",
      ":workoutTime": workoutTime, // Assuming workoutTime is a timestamp or date
    },
    FilterExpression: "#status = :currentStatus AND #start_date <= :workoutTime AND #end_date >= :workoutTime",
  };

  try {
    // execute the query to find active challenges 
    const queryResult = await documentClient.query(queryParams).promise();
    const challenges = queryResult.Items;

    // Handle case with no current challenges found
    if (challenges.length === 0) {
      console.log(`No current challenges found for user ${userId}`);
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "No current challenges found for the user." }),
      };
    }

    // iterate over challenges to update them
    for (const challenge of challenges) {
      const newMCompleted = challenge.completed_meters + distance;
      const isCompleted = newMCompleted >= challenge.target_meters;
      const newStatus = isCompleted ? "completed" : "current";

      if (isCompleted) {      
        sendCompletionDataToApi(userId, challenge.points);
      }

      const updateParams = {
        TableName: tableName,
        Key: { "user_id": userId, "challenge_id": challenge.challenge_id },
        UpdateExpression: "SET completed_meters = :newMCompleted, #status = :newStatus",
        ExpressionAttributeValues: {
          ":newMCompleted": newMCompleted,
          ":newStatus": newStatus,
        },
        ExpressionAttributeNames: {
          "#status": "status",
        },
      };

      // Execute update operation
      await documentClient.update(updateParams).promise();
    }

    console.log(`Successfully updated challenges for user ${userId}`);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges updated successfully." }),
    };
  } catch (error) {
    console.error("Error updating challenges for user:", userId, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to update challenges due to an internal error." }),
    };
  }
}

async function sendCompletionDataToApi(userId, pointsEarned) {
  const completionData = {
      userId: userId,
      pointsEarned: pointsEarned
  };

  const dataString = JSON.stringify(completionData);

  const options = {
      // https://exbbbi6704.execute-api.eu-west-2.amazonaws.com/dev
      hostname: 'ipo3rrju8j.execute-api.eu-west-2.amazonaws.com',
      port: 443,
      path: '/dev/points_earned',
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(dataString)
      }
  };

  const promise = new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
          let responseBody = '';
          
          res.on('data', (chunk) => {
              responseBody += chunk;
          });

          res.on('end', () => {
              console.log("Response from API:", responseBody);
              resolve(responseBody);
          });
      });

      req.on('error', (error) => {
          console.error("Error making API request:", error);
          reject(error);
      });

      req.write(dataString);
      req.end();
  });

  try {
      const response = await promise;
      console.log("API call successful:", response);
  } catch (error) {
      console.error("API call failed:", error);
  }
}
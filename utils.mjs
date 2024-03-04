export function validateAndExtractDetails(event) {
    if (!event.detail || typeof event.detail.user_id === 'undefined' || typeof event.detail.distance_in_meters === 'undefined') {
      throw new Error("Invalid event structure. Must include event.detail with user_id and distance_in_meters.");
    }
  
    const { user_id: userId, distance_in_meters: distance, timestamp_local: workoutTimeSeconds, activity_type: activityType } = event.detail;
    const workoutTimeConverted = new Date(workoutTimeSeconds * 1000).toISOString();
  
    return { userId, distance, workoutTimeConverted, activityType };
  }
  
  export async function queryChallenges(userId, workoutTimeConverted) {
    const queryParams = {
      TableName: "challenges",
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
        ":workoutTime": workoutTimeConverted, 
      },
      FilterExpression: "#status = :currentStatus AND #start_date <= :workoutTime AND #end_date >= :workoutTime",
    };
  
    const queryResult = await documentClient.query(queryParams).promise();
    return queryResult.Items;
  }
  
  export async function updateChallengeDB (userId, challengeId, newMCompleted, newStatus) {
    console.log('updateChallengeDB called'); 
    const updateParams = {
      TableName: "challenges",
      Key: { "user_id": userId, "challenge_id": challengeId },
      UpdateExpression: "SET completed_meters = :newMCompleted, #status = :newStatus",
      ExpressionAttributeValues: {
        ":newMCompleted": newMCompleted,
        ":newStatus": newStatus,
      },
      ExpressionAttributeNames: {
        "#status": "status",
      },
    };
  
    await documentClient.update(updateParams).promise();
  }
  
  export async function  sendCompletionDataToApi (userId, pointsEarned) {
    const completionData = {
        userId: userId,
        pointsEarned: pointsEarned
    };
  
    const dataString = JSON.stringify(completionData);
  
    const options = {
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
  
  export async function  updateChallenges (userId, challenges, distance) {
    for (const challenge of challenges) {
      const newMCompleted = challenge.completed_meters + distance;
      const isCompleted = newMCompleted >= challenge.target_meters;
      const newStatus = isCompleted ? "completed" : "current";
  
      if (isCompleted) {      
        await sendCompletionDataToApi(userId, challenge.points);
      }
  
      await updateChallengeDB(userId, challenge.challenge_id, newMCompleted, newStatus);
    }
  }
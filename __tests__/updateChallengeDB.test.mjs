// Import statements
import aws from 'aws-sdk';
import { updateChallengeDB } from '../index.mjs';

// Mock the AWS SDK
jest.mock('aws-sdk', () => {
  const updateMock = jest.fn().mockReturnThis(); // Allow chaining by returning 'this'
  const promiseMock = jest.fn(); // For mocking the promise() method
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        update: updateMock,
        promise: promiseMock,
      })),
    },
    updateMock, // Export for assertion
    promiseMock, // Export for manipulation in tests
  };
});

describe('updateChallengeDB', () => {
  // Reset and set up mocks before each test
  beforeEach(() => {
    aws.promiseMock.mockClear();
    aws.updateMock.mockClear();

    // Setup default resolved value for promise mock
    aws.promiseMock.mockResolvedValue({}); // Adjust based on expected DynamoDB response
  });

  it('should call DynamoDB update with correct parameters', async () => {
    const userId = 'user1';
    const challengeId = 'challenge1';
    const newMCompleted = 500;
    const newStatus = 'completed';

    // Call the function under test
    await updateChallengeDB(userId, challengeId, newMCompleted, newStatus);

    // Assert that update was called with correct parameters
    expect(aws.updateMock).toHaveBeenCalledWith({
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
    });

    // Assert that promise was called to execute the operation
    expect(aws.promiseMock).toHaveBeenCalled();
  });

  it('should update the correct challenge for a different user', async () => {
    const userId = 'user2';
    const challengeId = 'challenge2';
    const newMCompleted = 700;
    const newStatus = 'current';
  
    await updateChallengeDB(userId, challengeId, newMCompleted, newStatus);
  
    expect(aws.updateMock).toHaveBeenCalledWith({
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
    });
  
    expect(aws.promiseMock).toHaveBeenCalled();
  });
  it('should correctly update multiple challenges', async () => {
    // Define multiple challenges
    const updates = [
      { userId: 'user1', challengeId: 'challenge1', newMCompleted: 300, newStatus: 'current' },
      { userId: 'user2', challengeId: 'challenge2', newMCompleted: 800, newStatus: 'completed' },
    ];
  
    // Call updateChallengeDB for each update
    for (const update of updates) {
      await updateChallengeDB(update.userId, update.challengeId, update.newMCompleted, update.newStatus);
    }
  
    // Assert that updateMock was called with correct parameters for each challenge
    updates.forEach((update, index) => {
      expect(aws.updateMock).toHaveBeenNthCalledWith(index + 1, {
        TableName: "challenges",
        Key: { "user_id": update.userId, "challenge_id": update.challengeId },
        UpdateExpression: "SET completed_meters = :newMCompleted, #status = :newStatus",
        ExpressionAttributeValues: {
          ":newMCompleted": update.newMCompleted,
          ":newStatus": update.newStatus,
        },
        ExpressionAttributeNames: {
          "#status": "status",
        },
      });
    });
    // Ensure updateMock was called the correct number of times
    expect(aws.updateMock).toHaveBeenCalledTimes(updates.length);
  });
});

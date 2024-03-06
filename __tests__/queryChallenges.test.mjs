import aws from 'aws-sdk';
import {queryChallenges} from '../utils.mjs';

// Resetting modules to ensure a clean mock state
beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
});

// Mock the entire AWS SDK
jest.mock('aws-sdk', () => {
  // Mock the query method
  const queryMock = jest.fn();
  return {
    DynamoDB: {
      DocumentClient: jest.fn(() => ({
        query: queryMock
      })),
    },
    // Mock other AWS SDK methods if necessary
    queryMock,
  };
});

describe('queryChallenges', () => {
  const workoutTimeConverted = new Date().toISOString();

  // Define different sets of expected challenges for different users
  const challengesForUser1 = [
    { challenge_id: 'user1-challenge-1', name: 'User1 Challenge 1' },
    { challenge_id: 'user1-challenge-2', name: 'User1 Challenge 2' }
  ];

  const challengesForUser2 = [
    { challenge_id: 'user2-challenge-1', name: 'User2 Challenge 1' }
  ];

  beforeEach(() => {
      // Reset mock implementation before each test
      aws.queryMock.mockReset();

      // Mock implementation to return different challenges based on userId
      aws.queryMock.mockImplementation((params) => {
          if (params.ExpressionAttributeValues[':userIdValue'] === 'user1') {
              return {
                  promise: jest.fn().mockResolvedValue({ Items: challengesForUser1 }),
              };
          } else if (params.ExpressionAttributeValues[':userIdValue'] === 'user2') {
              return {
                  promise: jest.fn().mockResolvedValue({ Items: challengesForUser2 }),
              };
          } else {
              return {
                  promise: jest.fn().mockResolvedValue({ Items: [] }),
              };
          }
      });
  });

  it('should return challenges specific to user1', async () => {
      const userId = 'user1';
      const challenges = await queryChallenges(userId, workoutTimeConverted);

      expect(challenges).toEqual(challengesForUser1);
      expect(aws.queryMock).toHaveBeenCalledTimes(1);
  });

  it('should return challenges specific to user2', async () => {
      const userId = 'user2';
      const challenges = await queryChallenges(userId, workoutTimeConverted);

      expect(challenges).toEqual(challengesForUser2);
      expect(aws.queryMock).toHaveBeenCalledTimes(1);
  });

  it('should return an empty array for a user with no challenges', async () => {
      const userId = 'user3'; // Assuming 'user3' has no challenges
      const challenges = await queryChallenges(userId, workoutTimeConverted);

      expect(challenges).toEqual([]);
      expect(aws.queryMock).toHaveBeenCalledTimes(1);
  });
});

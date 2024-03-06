import { handler } from '../index.mjs';
import * as utils from '../utils.mjs';

// Mock the utils module
jest.mock('../utils.mjs', () => ({
  validateAndExtractDetails: jest.fn(),
  queryChallenges: jest.fn(),
  createResponse: jest.fn().mockImplementation((statusCode, body) => ({ statusCode, body: JSON.stringify(body) })),
  updateChallenges: jest.fn(),
}));

describe('handler function', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Reset all mocks before each test
  });

  it('returns a message when activity type is not RUNNING', async () => {
    utils.validateAndExtractDetails.mockReturnValue({ activityType: "WALKING" });

    const event = {}; // Your event here
    const response = await handler(event);

    expect(utils.validateAndExtractDetails).toHaveBeenCalled();
    expect(utils.queryChallenges).not.toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "No operation performed as the activity type is not RUNNING." })
    });
  });

  it('returns a message when no challenges are found for the user', async () => {
    utils.validateAndExtractDetails.mockReturnValue({ userId: "123", distance: 10, workoutTimeConverted: 30, activityType: "RUNNING" });
    utils.queryChallenges.mockResolvedValue([]);

    const event = {}; // Your event here
    const response = await handler(event);

    expect(utils.validateAndExtractDetails).toHaveBeenCalled();
    expect(utils.queryChallenges).toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "No current challenges found for the user." })
    });
  });

  it('updates challenges successfully', async () => {
    utils.validateAndExtractDetails.mockReturnValue({ userId: "123", distance: 10, workoutTimeConverted: 30, activityType: "RUNNING" });
    utils.queryChallenges.mockResolvedValue([{ challengeId: "challenge-1" }]); // Mock some challenges

    const event = {}; // Your event here
    const response = await handler(event);

    expect(utils.validateAndExtractDetails).toHaveBeenCalled();
    expect(utils.queryChallenges).toHaveBeenCalled();
    expect(utils.updateChallenges).toHaveBeenCalled();
    expect(response).toEqual({
      statusCode: 200,
      body: JSON.stringify({ message: "Challenges updated successfully." })
    });
  });

  it('handles errors correctly', async () => {
    utils.validateAndExtractDetails.mockImplementation(() => { throw new Error('Test Error'); });

    const event = {}; // Your event here
    const response = await handler(event);

    expect(response).toEqual({
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to process event due to an internal error." })
    });
  });
});

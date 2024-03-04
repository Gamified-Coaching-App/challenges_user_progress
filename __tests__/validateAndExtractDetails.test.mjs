// Import the function to test
import validateAndExtractDetails from '../index.mjs';

describe('validateAndExtractDetails', () => {
  it('should extract details correctly from a valid event', () => {
    // Define a mock event object
    const mockEvent = {
      detail: {
        user_id: '123',
        distance_in_meters: 1000,
        timestamp_local: Math.floor(new Date().getTime() / 1000), // Current time in seconds
        activity_type: 'RUNNING',
      }
    };

    // Call the function with the mock event
    const extractedDetails = validateAndExtractDetails(mockEvent);

    // Expectations
    expect(extractedDetails.userId).toBe(mockEvent.detail.user_id);
    expect(extractedDetails.distance).toBe(mockEvent.detail.distance_in_meters);
    // Add more assertions as needed
  });

  // You can add more test cases here, such as testing for invalid events
});

import validateAndExtractDetails from '../index.mjs';

describe('validateAndExtractDetails', () => {
  it('should correctly convert timestamp from seconds to ISO string format', () => {
    const timestampInSeconds = 1609459200; // This represents a specific moment, e.g., 2021-01-01T00:00:00Z
    const expectedISODateTime = "2021-01-01T00:00:00.000Z";

    const mockEvent = {
      detail: {
        user_id: '123',
        distance_in_meters: 1000,
        timestamp_local: timestampInSeconds,
        activity_type: 'RUNNING',
      }
    };

    const extractedDetails = validateAndExtractDetails(mockEvent);

    expect(extractedDetails.workoutTimeConverted).toBe(expectedISODateTime);
  });

  it('should extract details correctly from a valid event', () => {
    // Define your mock event with appropriate data for validation
    const mockEvent = {
      detail: {
        user_id: '123',
        distance_in_meters: 1000,
        timestamp_local: 1609459200,
        activity_type: 'RUNNING',
      }
    };

    // Call the function with the mock event
    const extractedDetails = validateAndExtractDetails(mockEvent);

    // Expectations for other details extracted
    expect(extractedDetails.userId).toBe('123');
    expect(extractedDetails.distance).toBe(1000);
    expect(extractedDetails.activityType).toBe('RUNNING');
    // Add more assertions as needed
  });
});

import {validateAndExtractDetails} from '../utils.mjs';

describe('validateAndExtractDetails', () => {
  it('should correctly convert timestamp from seconds to ISO string format', () => {
    // testing the conversion from seconds to ISO string format that should be returned
    const timestampInSeconds = 1609459200; // represents a specific moment (2021-01-01T00:00:00Z)
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
  });
});

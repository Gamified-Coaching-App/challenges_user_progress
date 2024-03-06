import { sendCompletionDataToApi } from '../utils.mjs';
import https from 'https';
console.log(sendCompletionDataToApi);

// At the top of your test file or in a Jest setup file
jest.mock('https', () => ({
    request: jest.fn((options, callback) => {
      const httpResponse = {
        statusCode: 200,
        on: jest.fn((event, cb) => {
          if (event === 'data') {
            cb(JSON.stringify({ message: 'Success' }));
          } else if (event === 'end') {
            cb();
          }
        }),
        emit: jest.fn(),
      };
  
      callback(httpResponse);
  
      return {
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn((event, cb) => {
          if (event === 'error') cb(new Error('Mocked error'));
        }),
      };
    })
  }));  

describe('sendCompletionDataToApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sends correct data to API', async () => {
    const userId = 'test-user';
    const pointsEarned = 10;
    await sendCompletionDataToApi(userId, pointsEarned);

    // Check if https.request was called
    expect(https.request).toHaveBeenCalled();

    const call = https.request.mock.calls[0];
    const [options, callback] = call;
    expect(options.hostname).toEqual('ipo3rrju8j.execute-api.eu-west-2.amazonaws.com');
    expect(options.path).toEqual('/dev/points_earned');
    expect(options.method).toEqual('POST');
    // Additional checks can be added here for headers, etc.

    // This part assumes your function handles the response correctly
    // You might need to adjust this based on how your function processes the response
    const response = await new Promise((resolve, reject) => {
      callback({
        on: (event, cb) => {
          if (event === 'data') {
            const data = JSON.stringify({ message: 'Success' });
            cb(data);
          } else if (event === 'end') {
            resolve();
          }
        }
      });
    });

    // Assertions about the response can go here
  });

  // You can add more tests here to cover different scenarios, 
  // such as handling HTTP errors, handling non-200 status codes, etc.
});

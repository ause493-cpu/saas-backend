import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter database overload handling', () => {
  const createResponse = () => {
    const response = {
      setHeader: jest.fn(),
      status: jest.fn(),
      json: jest.fn(),
    };

    response.status.mockReturnValue(response);
    response.json.mockReturnValue(response);

    return response;
  };

  const createHost = (response: ReturnType<typeof createResponse>) =>
    ({
      switchToHttp: () => ({
        getResponse: () => response,
      }),
    } as ArgumentsHost);

  it('returns a retryable 503 when the Prisma connection pool is exhausted', () => {
    const response = createResponse();
    const exception = {
      code: 'P2024',
      message: 'Timed out fetching a new connection from the connection pool',
    };

    new HttpExceptionFilter().catch(exception, createHost(response));

    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '5');
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'The service is temporarily busy. Please retry shortly.',
      error: 'Service unavailable',
    });
  });

  it('preserves explicit HTTP errors and does not add a retry header', () => {
    const response = createResponse();
    const exception = new HttpException(
      { message: 'Invalid request' },
      HttpStatus.BAD_REQUEST,
    );

    new HttpExceptionFilter().catch(exception, createHost(response));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(response.json).toHaveBeenCalledWith({ message: 'Invalid request' });
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('keeps unrelated infrastructure failures as generic internal errors', () => {
    const response = createResponse();

    new HttpExceptionFilter().catch(
      new Error('Payment Gateway connection refused'),
      createHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(response.setHeader).not.toHaveBeenCalled();
  });
});

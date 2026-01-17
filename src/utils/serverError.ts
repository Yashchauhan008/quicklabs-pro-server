class ServerError extends Error {
    public code: string;
    public statusCode: number;
  
    constructor(code: string, message: string, statusCode: number = 400) {
      super(message);
      this.code = code;
      this.statusCode = statusCode;
      this.name = 'ServerError';
  
      // Maintains proper stack trace for where our error was thrown
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  export default ServerError;
  
  
  
  
  
  
  
  
  
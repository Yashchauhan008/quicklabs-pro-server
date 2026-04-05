import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5001').transform(Number),
  HOST: z.string().default('localhost'),
  
  DB_HOST: z.string().min(1),
  DB_PORT: z.string().default('5432').transform(Number),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),

  MAX_SUBJECTS_PER_STUDENT: z.string().default('2').transform(Number),
  MAX_UPLOADS_PER_DAY_STUDENT: z.string().default('10').transform(Number),
  MAX_DOWNLOADS_PER_DAY: z.string().default('50').transform(Number),
});

function validateEnv() {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Environment Variable Validation Failed!\n');
      error.issues.forEach((issue, index) => {
        console.error(`  ${index + 1}. ${issue.path.join('.')}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

const validatedEnv = validateEnv();

const env = {
  server: {
    nodeEnv: validatedEnv.NODE_ENV,
    port: validatedEnv.PORT,
    host: validatedEnv.HOST,
    isProduction: validatedEnv.NODE_ENV === 'production',
    isDevelopment: validatedEnv.NODE_ENV === 'development',
  },
  database: {
    host: validatedEnv.DB_HOST,
    port: validatedEnv.DB_PORT,
    name: validatedEnv.DB_NAME,
    user: validatedEnv.DB_USER,
    password: validatedEnv.DB_PASSWORD,
  },
  jwt: {
    secret: validatedEnv.JWT_SECRET,
    expiresIn: validatedEnv.JWT_EXPIRES_IN,
  },
  cors: {
    origin: validatedEnv.CORS_ORIGIN,
  },
  logging: {
    level: validatedEnv.LOG_LEVEL,
  },
  studentLimits: {
    maxSubjects: validatedEnv.MAX_SUBJECTS_PER_STUDENT,
    maxUploadsPerDay: validatedEnv.MAX_UPLOADS_PER_DAY_STUDENT,
    maxDownloadsPerDay: validatedEnv.MAX_DOWNLOADS_PER_DAY,
  },
} as const;

export default env;
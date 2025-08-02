import dotenv from 'dotenv';

dotenv.config();

// Required environment variables
const REQUIRED_ENV_VARS = [
  'JWT_SECRET',
  'OMDB_API_KEY'
];

// Optional environment variables with defaults
const OPTIONAL_ENV_VARS = {
  'PORT': '5000',
  'NODE_ENV': 'development',
  'BCRYPT_ROUNDS': '12',
  'JWT_EXPIRES_IN': '7d'
};

// Database configuration - either DATABASE_URL or individual DB vars required
const DATABASE_VARS = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

export const validateEnvironment = () => {
  console.log('🔍 Validating environment variables...');
  
  const errors = [];
  const warnings = [];
  
  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    } else {
      console.log(`✅ ${envVar}: Set`);
    }
  }
  
  // Check database configuration
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasIndividualDbVars = DATABASE_VARS.every(dbVar => !!process.env[dbVar]);
  
  if (!hasDatabaseUrl && !hasIndividualDbVars) {
    errors.push('Database configuration missing. Either set DATABASE_URL or all of: ' + DATABASE_VARS.join(', '));
  } else if (hasDatabaseUrl) {
    console.log('✅ DATABASE_URL: Set (using connection string)');
  } else {
    console.log('✅ Database: Individual variables set');
  }
  
  // Set defaults for optional variables
  for (const [envVar, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
      warnings.push(`${envVar} not set, using default: ${defaultValue}`);
    } else {
      console.log(`✅ ${envVar}: ${process.env[envVar]}`);
    }
  }
  
  // Validate specific variable formats
  validateSpecificVariables(errors, warnings);
  
  // Log warnings
  if (warnings.length > 0) {
    console.log('⚠️  Environment warnings:');
    warnings.forEach(warning => console.log(`   ${warning}`));
  }
  
  // Handle errors
  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`   ${error}`));
    
    console.error('\n📋 To fix these issues:');
    console.error('1. Set missing environment variables in your deployment platform');
    console.error('2. For local development, add them to your .env file');
    console.error('3. Refer to DEPLOYMENT.md for complete setup instructions\n');
    
    throw new Error('Environment validation failed. Check the logs above for details.');
  }
  
  console.log('✅ Environment validation successful!');
  return true;
};

const validateSpecificVariables = (errors, warnings) => {
  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    warnings.push('JWT_SECRET should be at least 32 characters for security');
  }
  
  // Validate BCRYPT_ROUNDS
  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS);
  if (isNaN(bcryptRounds) || bcryptRounds < 10 || bcryptRounds > 15) {
    warnings.push('BCRYPT_ROUNDS should be between 10-15 for optimal security/performance');
  }
  
  // Validate NODE_ENV
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(process.env.NODE_ENV)) {
    warnings.push(`NODE_ENV should be one of: ${validEnvironments.join(', ')}`);
  }
  
  // Validate PORT
  const port = parseInt(process.env.PORT);
  if (isNaN(port) || port < 1 || port > 65535) {
    warnings.push('PORT should be a valid port number (1-65535)');
  }
};

export const getEnvironmentInfo = () => {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    hasDatabase: !!(process.env.DATABASE_URL || process.env.DB_HOST),
    hasOMDB: !!process.env.OMDB_API_KEY,
    hasJWTSecret: !!process.env.JWT_SECRET,
    bcryptRounds: process.env.BCRYPT_ROUNDS,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN
  };
};
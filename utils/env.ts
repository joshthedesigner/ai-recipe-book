/**
 * Environment Variable Validation
 * 
 * Validates environment variables at startup
 * Catches configuration errors early
 */

interface EnvConfig {
  required: string[];
  optional: string[];
  validators: Record<string, (value: string) => boolean>;
}

const envConfig: EnvConfig = {
  required: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
  ],
  optional: [
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL',
    'NEXT_PUBLIC_APP_URL',
  ],
  validators: {
    OPENAI_API_KEY: (key: string) => {
      // OpenAI keys typically start with 'sk-'
      return key.startsWith('sk-') || key.startsWith('sk_proj-');
    },
    NEXT_PUBLIC_SUPABASE_URL: (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname.includes('supabase');
      } catch {
        return false;
      }
    },
    UPSTASH_REDIS_REST_URL: (url: string) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname.includes('upstash.io');
      } catch {
        return false;
      }
    },
  },
};

/**
 * Validate environment variables
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check required variables
  for (const key of envConfig.required) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
      errors.push(`Missing required environment variable: ${key}`);
      continue;
    }

    // Validate format if validator exists
    const validator = envConfig.validators[key];
    if (validator && !validator(value)) {
      errors.push(`Invalid format for ${key}`);
    }

    // Check for placeholder values
    if (value.includes('your-') || value.includes('example.com') || value === '') {
      errors.push(`${key} appears to be a placeholder value`);
    }
  }

  // Check optional variables (warn if format is wrong, but don't error)
  for (const key of envConfig.optional) {
    const value = process.env[key];
    if (value) {
      const validator = envConfig.validators[key];
      if (validator && !validator(value)) {
        console.warn(`⚠️  Invalid format for optional ${key}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Require an environment variable (throw if missing)
 */
export function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get environment variable with validation
 */
export function getEnv(key: string, validator?: (value: string) => boolean): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  if (validator && !validator(value)) {
    throw new Error(`Invalid format for environment variable ${key}`);
  }
  return value;
}

// Validate on module load (only in server context)
if (typeof window === 'undefined') {
  const validation = validateEnvironment();
  if (!validation.valid && process.env.NODE_ENV !== 'test') {
    console.error('❌ Environment variable validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    console.error('\n⚠️  Some features may not work correctly.\n');
  } else if (validation.valid) {
    console.log('✅ Environment variables validated');
  }
}


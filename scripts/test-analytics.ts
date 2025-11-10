/**
 * Analytics Verification Script
 * 
 * This script verifies that all analytics tracking code is properly wired up.
 * It doesn't actually send events - just confirms the code paths are correct.
 */

import * as fs from 'fs';
import * as path from 'path';

interface CheckResult {
  check: string;
  status: 'PASS' | 'FAIL';
  details: string;
}

const results: CheckResult[] = [];

// Check 1: PostHog environment variables
console.log('🔍 Verifying Analytics Setup...\n');

const envVars = ['NEXT_PUBLIC_POSTHOG_KEY', 'NEXT_PUBLIC_POSTHOG_HOST'];
envVars.forEach(varName => {
  const value = process.env[varName];
  results.push({
    check: `Environment Variable: ${varName}`,
    status: value ? 'PASS' : 'FAIL',
    details: value ? '✅ Set' : '❌ Not set',
  });
});

// Check 2: Analytics file exists and exports correct functions
const analyticsPath = path.join(process.cwd(), 'lib/analytics.ts');
const analyticsContent = fs.readFileSync(analyticsPath, 'utf-8');

const requiredExports = [
  'initPostHog',
  'identifyUser',
  'resetUser',
  'trackEvent',
  'analytics.signup',
  'analytics.login',
  'analytics.logout',
];

requiredExports.forEach(exportName => {
  const exists = analyticsContent.includes(exportName);
  results.push({
    check: `Analytics Export: ${exportName}`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? '✅ Found' : '❌ Missing',
  });
});

// Check 3: Tracking calls in AuthContext
const authContextPath = path.join(process.cwd(), 'contexts/AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf-8');

const trackingCalls = [
  { name: 'Signup tracking', pattern: 'analytics.signup' },
  { name: 'Login tracking', pattern: 'analytics.login' },
  { name: 'Logout tracking', pattern: 'analytics.logout' },
  { name: 'User identification (signup)', pattern: 'identifyUser(data.user.id' },
];

trackingCalls.forEach(({ name, pattern }) => {
  const exists = authContextContent.includes(pattern);
  results.push({
    check: `AuthContext: ${name}`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? '✅ Implemented' : '❌ Missing',
  });
});

// Check 4: PostHogProvider in app
const providersPath = path.join(process.cwd(), 'app/providers.tsx');
const providersContent = fs.readFileSync(providersPath, 'utf-8');

const providerCheck = providersContent.includes('PostHogProvider');
results.push({
  check: 'PostHogProvider in app',
  status: providerCheck ? 'PASS' : 'FAIL',
  details: providerCheck ? '✅ Enabled' : '❌ Not found',
});

// Display results
console.log('📊 ANALYTICS VERIFICATION RESULTS\n');
console.log('='.repeat(60));

let passCount = 0;
let failCount = 0;

results.forEach(result => {
  console.log(`\n${result.check}`);
  console.log(`Status: ${result.status}`);
  console.log(`${result.details}`);
  
  if (result.status === 'PASS') passCount++;
  else failCount++;
});

console.log('\n' + '='.repeat(60));
console.log(`\n✅ PASSED: ${passCount}`);
console.log(`❌ FAILED: ${failCount}`);

if (failCount === 0) {
  console.log('\n🎉 All checks passed! Analytics is properly configured.');
  console.log('\n📈 Next steps:');
  console.log('   1. Deploy your changes');
  console.log('   2. Test a signup on your live site');
  console.log('   3. Check PostHog dashboard for "user_signed_up" event');
  console.log('   4. Events should appear within 1-2 minutes\n');
} else {
  console.log('\n⚠️ Some checks failed. Review the issues above.\n');
  process.exit(1);
}


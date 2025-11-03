// Quick test script to verify SSRF protection works
const { URL } = require('url');

function validateUrl(url) {
  try {
    const parsed = new URL(url);
    
    // Block non-HTTP(S) protocols (file://, ftp://, etc.)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      console.warn('Blocked non-HTTP(S) protocol:', parsed.protocol);
      return false;
    }
    
    // Block private/internal IP addresses and localhost
    const hostname = parsed.hostname.toLowerCase();
    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^10\./,                    // Private: 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private: 172.16.0.0/12
      /^192\.168\./,              // Private: 192.168.0.0/16
      /^169\.254\./,              // Link-local: 169.254.0.0/16
      /^::1$/,                    // IPv6 localhost
      /^fc00:/,                   // IPv6 private
      /^fe80:/,                   // IPv6 link-local
    ];
    
    if (blockedPatterns.some(pattern => pattern.test(hostname))) {
      console.warn('Blocked private/internal IP:', hostname);
      return false;
    }
    
    // Block URLs longer than 2048 characters (RFC 7230 recommendation)
    if (url.length > 2048) {
      console.warn('Blocked URL exceeding length limit');
      return false;
    }
    
    return true;
  } catch (error) {
    console.warn('Invalid URL format:', error);
    return false;
  }
}

// Test URLs
console.log('Testing SSRF Protection:\n');
console.log('========================\n');

const testUrls = [
  { url: 'http://localhost:8080/admin', expected: false, name: 'localhost with port' },
  { url: 'http://localhost/admin', expected: false, name: 'localhost' },
  { url: 'http://127.0.0.1:8080/admin', expected: false, name: '127.0.0.1' },
  { url: 'http://192.168.1.1/admin', expected: false, name: '192.168.x.x' },
  { url: 'http://10.0.0.1/admin', expected: false, name: '10.x.x.x' },
  { url: 'http://169.254.169.254/latest/meta-data/', expected: false, name: 'AWS metadata (169.254.x.x)' },
  { url: 'file:///etc/passwd', expected: false, name: 'file protocol' },
  { url: 'ftp://example.com/file', expected: false, name: 'ftp protocol' },
  { url: 'https://www.allrecipes.com/recipe/231821/', expected: true, name: 'Valid public URL' },
  { url: 'https://example.com/recipe', expected: true, name: 'Valid public HTTPS URL' },
];

let passCount = 0;
let failCount = 0;

testUrls.forEach(({ url, expected, name }) => {
  const result = validateUrl(url);
  const status = result === expected ? '✅ PASS' : '❌ FAIL';
  
  if (result === expected) {
    passCount++;
  } else {
    failCount++;
  }
  
  console.log(`${status}: ${name}`);
  console.log(`  URL: ${url}`);
  console.log(`  Expected: ${expected}, Got: ${result}`);
  console.log('');
});

console.log('========================');
console.log(`Total: ${testUrls.length} tests`);
console.log(`Passed: ${passCount}`);
console.log(`Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n✅ All SSRF protection tests passed!');
  process.exit(0);
} else {
  console.log('\n❌ Some tests failed. Review the patterns.');
  process.exit(1);
}


// Copy and paste this into your browser console (F12 or Cmd+Option+I)
// Make sure you're logged into your app first

// Step 1: Test with 10 recipes first
console.log('🧪 Testing with 10 recipes...');
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Test Result:', result);
  if (result.success) {
    console.log('📊 Fixed:', result.stats.fixed);
    console.log('📊 Unchanged:', result.stats.unchanged);
    console.log('📊 Errors:', result.stats.errors);
    console.log('\n✅ Test successful! If this looks good, run the full retag below.');
  } else {
    console.error('❌ Error:', result.error);
  }
})
.catch(error => {
  console.error('❌ Failed:', error);
});

// Step 2: After test looks good, uncomment and run this:
/*
console.log('🚀 Running on ALL recipes...');
fetch('/api/recipes/fix-tags-and-embeddings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('✅ Complete!', result);
  if (result.success) {
    console.log('📊 Total:', result.stats.total);
    console.log('📊 Fixed:', result.stats.fixed);
    console.log('📊 Unchanged:', result.stats.unchanged);
    console.log('📊 Errors:', result.stats.errors);
  }
})
.catch(error => {
  console.error('❌ Failed:', error);
});
*/

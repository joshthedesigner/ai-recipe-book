// Test with 10 recipes first
fetch('/api/recipes/fix-tags-and-embeddings?limit=10', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(result => {
  console.log('Test Result:', result);
  if (result.success) {
    console.log('Fixed:', result.stats.fixed);
    console.log('Unchanged:', result.stats.unchanged);
    console.log('Errors:', result.stats.errors);
  }
})
.catch(error => {
  console.error('Failed:', error);
});


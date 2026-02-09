// Run re-tagging with new AI detection functionality
// Copy and paste this into your browser console on https://www.recipeassist.app/browse

// Test with a small batch first (10 recipes)
fetch('/api/recipes/fix-tags-and-embeddings?limit=10&batchSize=10', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then(r => r.json())
  .then(result => {
    console.log('Re-tagging result:', result);
    console.log('Stats:', result.stats);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// If that works, run on all recipes (remove limit)
// fetch('/api/recipes/fix-tags-and-embeddings?batchSize=50', {
//   method: 'POST',
//   headers: {
//     'Content-Type': 'application/json',
//   },
// })
//   .then(r => r.json())
//   .then(result => {
//     console.log('Re-tagging result:', result);
//     console.log('Stats:', result.stats);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });


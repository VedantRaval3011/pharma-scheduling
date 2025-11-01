// bulkInsertBatches.js
// Run this script with: node bulkInsertBatches.js

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Import your database connection and model
// Adjust these paths based on your project structure
const connectToDatabase = require('./lib/db');
const BatchInput = require('./models/batch/BatchInput');

async function bulkInsertBatches() {
  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database');

    // Read the JSON file
    const jsonPath = path.join(__dirname, 'batch_input_samples.json');
    const batchesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    console.log(`📄 Loaded ${batchesData.length} batches from JSON file`);

    // Insert all batches
    console.log('🔄 Inserting batches into database...');
    const result = await BatchInput.insertMany(batchesData, { 
      ordered: false // Continue inserting even if some fail
    });

    console.log(`✅ Successfully inserted ${result.length} batches!`);

    // Display summary
    console.log('\n' + '='.repeat(80));
    console.log('INSERTION SUMMARY');
    console.log('='.repeat(80));

    const typeCount = {};
    result.forEach(batch => {
      typeCount[batch.typeOfSample] = (typeCount[batch.typeOfSample] || 0) + 1;
    });

    console.log('\n📊 Inserted batches by type:');
    Object.entries(typeCount).forEach(([type, count]) => {
      console.log(`  • ${type}: ${count} batches`);
    });

    console.log('\n' + '='.repeat(80));
    process.exit(0);

  } catch (error) {
    console.error('❌ Error inserting batches:', error);

    // If some batches were inserted successfully
    if (error.insertedDocs) {
      console.log(`⚠️  Partially successful: ${error.insertedDocs.length} batches inserted`);
    }

    process.exit(1);
  }
}

// Run the function
bulkInsertBatches();
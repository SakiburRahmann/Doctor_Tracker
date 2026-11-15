/**
 * Reconciles the indexes declared in the models with the database.
 *
 * Mongoose creates missing indexes on connect, which is fine for development but
 * is not something to leave to chance in production: this script builds them
 * explicitly and reports what changed. Run it after changing a model index.
 *
 *   npm run db:indexes
 */
require('dotenv').config();

const mongoose = require('mongoose');

const models = [
  require('../models/Admin'),
  require('../models/Doctor'),
  require('../models/Patient'),
];

(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('[indexes] MONGODB_URI is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

    for (const model of models) {
      const dropped = await model.syncIndexes();
      const existing = await model.collection.indexes();
      console.log(
        `[indexes] ${model.modelName}: ${existing.length} index(es)` +
          (dropped.length ? `, dropped ${dropped.join(', ')}` : '')
      );
      existing.forEach((idx) => {
        const collation = idx.collation ? ` collation=${idx.collation.locale}/${idx.collation.strength}` : '';
        console.log(`    ${idx.name}${collation}`);
      });
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[indexes] failed:', err.message);
    process.exit(1);
  }
})();

const processInBatches = async (ids, batchSize, processMethod) => {
  if (!ids || !ids.length) return;

  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (id) => {
        try {
          await processMethod(id);
        } catch (e) {
          console.error(`Processing failed for item ID:${id}. Error:  `, e);
        }
      }),
    );
  }
};

module.exports = { processInBatches };

import { Types } from "mongoose";

export const processInBatches = async (
  ids: Types.ObjectId[],
  batchSize: number,
  processMethod: (moduleId: Types.ObjectId) => Promise<void>,
): Promise<void> => {
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

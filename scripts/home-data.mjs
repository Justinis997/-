import { writeFile } from 'node:fs/promises';

export const createHomeData = ({ photos, essays, recentActivity }) => ({
  totals: {
    photography: photos.length,
    essays: essays.length,
  },
  latestPhotos: photos.filter((photo) => photo.date).slice(0, 3),
  latestEssays: essays.slice(0, 3),
  recentActivity,
});

export const writeHomeData = async (path, source) => {
  const data = createHomeData(source);
  await writeFile(path, `export const HOME_DATA = Object.freeze(${JSON.stringify(data, null, 2)});\n`);
  return data;
};

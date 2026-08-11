import { resolve } from 'node:path';
import { PHOTO_DATA } from '../assets/js/photo-data.js';
import { ESSAY_DATA } from '../assets/js/essay-data.js';
import { SITE_SETTINGS } from '../assets/js/site-settings.js';
import { writeHomeData } from './home-data.mjs';

await writeHomeData(resolve('assets/js/home-data.js'), {
  photos: PHOTO_DATA,
  essays: ESSAY_DATA,
  recentActivity: SITE_SETTINGS.recentActivity,
});

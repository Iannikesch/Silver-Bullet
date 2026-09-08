/* ==========================================================
   Silver Bullet — texture boot

   Runs after motion.js and textures.js, both of which it depends on.
   The bullet intro lives in intro.js and loads earlier.
   ========================================================== */

/* Deferred scripts have all run by the time this fires, so both
   functions exist. drive:false because motion.js already publishes
   --light / --light-y / --lit from its own pointer+scroll engine —
   the pack must not attach a second set of listeners. */
window.addEventListener('DOMContentLoaded', function () {
  if (typeof initTextures === 'function') initTextures({ drive: false });
  /* drive:false = leave [data-chrome] elements to motion.js. Everything
     else with a data-texture (the CTAs) gets its own hover listeners. */
  if (typeof initThermal  === 'function') initThermal();
  if (typeof initFrost    === 'function') initFrost('.site-header', 24);
  /* The bore's key light comes from initTextures above (the section
     carries data-texture); initBore only drives the rifling twist. */
  if (typeof initBore     === 'function') initBore();
  /* The lung and orbit halos are pure CSS. initHalo() is only needed
     for the --pulse variant, so it is not called here. */
});

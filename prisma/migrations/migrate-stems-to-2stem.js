const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

function getFfmpegPath() {
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic && fs.existsSync(ffmpegStatic)) return ffmpegStatic;
  } catch {}
  return 'ffmpeg';
}

async function runMigration() {
  console.log('[Migration] Starting 2-stem domain & data migration...');
  const ffmpeg = getFfmpegPath();

  // 1. Fetch all media assets
  const allAssets = await prisma.mediaAsset.findMany();
  console.log(`[Migration] Total existing assets: ${allAssets.length}`);

  // Group by jobId
  const byJob = {};
  for (const asset of allAssets) {
    const key = asset.jobId || 'no_job';
    if (!byJob[key]) byJob[key] = [];
    byJob[key].push(asset);
  }

  for (const [jobId, assets] of Object.entries(byJob)) {
    if (jobId === 'no_job') {
      for (const a of assets) {
        if (a.kind === 'MASHUP_AUDIO') {
          await prisma.mediaAsset.update({ where: { id: a.id }, data: { kind: 'MASHUP' } });
        } else if (a.kind === 'CHORD_PRACTICE_AUDIO') {
          await prisma.mediaAsset.update({ where: { id: a.id }, data: { kind: 'ORIGINAL' } });
        }
      }
      continue;
    }

    const stemAssets = assets.filter(a =>
      ['STEM_VOCALS', 'STEM_INSTRUMENTS', 'STEM_BASS', 'STEM_DRUMS', 'STEM_OTHER', 'STEM_INSTRUMENTAL', 'STEM_PIANO', 'STEM_GUITAR'].includes(a.kind)
    );

    if (stemAssets.length > 0) {
      console.log(`[Migration] Processing stem job ${jobId} (${stemAssets.length} stem assets)...`);

      // Ensure vocals is STEM_VOCALS
      const vocalsAsset = stemAssets.find(a => a.kind === 'STEM_VOCALS');
      if (vocalsAsset) {
        await prisma.mediaAsset.update({
          where: { id: vocalsAsset.id },
          data: { kind: 'STEM_VOCALS', name: 'Vocals' },
        });
      }

      // Check if there is an existing instruments or instrumental asset
      let instrumentAsset = stemAssets.find(a => a.kind === 'STEM_INSTRUMENTS' || a.kind === 'STEM_INSTRUMENTAL');

      const jobDir = path.join(process.cwd(), 'storage', 'jobs', jobId);
      const subStems = stemAssets.filter(a => ['STEM_DRUMS', 'STEM_BASS', 'STEM_OTHER', 'STEM_PIANO', 'STEM_GUITAR'].includes(a.kind));

      if (instrumentAsset) {
        // We already have a combined instrument/instrumental asset
        const currentPath = path.join(process.cwd(), instrumentAsset.filePath.replace('/api/media/', 'storage/'));
        let targetFilePath = instrumentAsset.filePath;

        // If named instruments.mp3 or instrumental.mp3, normalize to instrument.mp3
        const ext = instrumentAsset.format || 'mp3';
        const normalizedDiskPath = path.join(jobDir, `instrument.${ext}`);
        if (fs.existsSync(currentPath) && currentPath !== normalizedDiskPath) {
          try {
            fs.copyFileSync(currentPath, normalizedDiskPath);
            targetFilePath = `/api/media/jobs/${jobId}/instrument.${ext}`;
          } catch (e) {
            console.warn(`[Migration] Could not copy file: ${e.message}`);
          }
        }

        await prisma.mediaAsset.update({
          where: { id: instrumentAsset.id },
          data: {
            kind: 'STEM_INSTRUMENT',
            name: 'Instrument',
            filePath: targetFilePath,
          },
        });
      } else if (subStems.length > 0) {
        // Sum sub-stems (drums + bass + other + piano + guitar) via ffmpeg amix
        console.log(`[Migration] Summing ${subStems.length} sub-stems for job ${jobId} via FFmpeg amix...`);
        const ext = subStems[0].format || 'mp3';
        const outInstrumentPath = path.join(jobDir, `instrument.${ext}`);

        const inputPaths = subStems
          .map(s => path.join(process.cwd(), s.filePath.replace('/api/media/', 'storage/')))
          .filter(p => fs.existsSync(p));

        if (inputPaths.length > 0) {
          try {
            const inputsStr = inputPaths.map(p => `-i "${p}"`).join(' ');
            const filterStr = inputPaths.map((_, i) => `[${i}:a]`).join('') + `amix=inputs=${inputPaths.length}:duration=longest:normalize=0[aout]`;
            execSync(`"${ffmpeg}" -y ${inputsStr} -filter_complex "${filterStr}" -map "[aout]" "${outInstrumentPath}"`, { stdio: 'ignore' });

            const newId = `asset_${jobId}_instrument`;
            await prisma.mediaAsset.create({
              data: {
                id: newId,
                jobId,
                name: 'Instrument',
                kind: 'STEM_INSTRUMENT',
                filePath: `/api/media/jobs/${jobId}/instrument.${ext}`,
                mimeType: subStems[0].mimeType || 'audio/mpeg',
                format: ext,
                duration: subStems[0].duration,
              },
            });
          } catch (mixErr) {
            console.warn(`[Migration] Failed to mix sub-stems for ${jobId}: ${mixErr.message}`);
          }
        }
      }

      // Remove the old sub-stem records (drums, bass, other, extra instrumentals)
      const toDelete = stemAssets.filter(a =>
        ['STEM_DRUMS', 'STEM_BASS', 'STEM_OTHER', 'STEM_PIANO', 'STEM_GUITAR'].includes(a.kind) ||
        (instrumentAsset && a.id !== instrumentAsset.id && (a.kind === 'STEM_INSTRUMENTS' || a.kind === 'STEM_INSTRUMENTAL'))
      );

      for (const del of toDelete) {
        await prisma.mediaAsset.delete({ where: { id: del.id } }).catch(() => {});
      }
    }

    // Handle Mashup and Chord assets
    for (const a of assets) {
      if (a.kind === 'MASHUP_AUDIO') {
        await prisma.mediaAsset.update({ where: { id: a.id }, data: { kind: 'MASHUP' } });
      } else if (a.kind === 'CHORD_PRACTICE_AUDIO') {
        await prisma.mediaAsset.update({ where: { id: a.id }, data: { kind: 'ORIGINAL' } });
      }
    }
  }

  // Final check: list remaining asset kinds
  const remainingAssets = await prisma.mediaAsset.findMany();
  const remainingKinds = [...new Set(remainingAssets.map(a => a.kind))];
  console.log('[Migration] Migration complete. Active asset kinds in DB:', remainingKinds);
  console.log(`[Migration] Total remaining assets: ${remainingAssets.length}`);
}

runMigration()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

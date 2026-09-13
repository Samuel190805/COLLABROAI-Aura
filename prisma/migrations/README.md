# Prisma Migrations & Data Normalization

## Migration: 2-Stem Model Collapse (September 2026)

### Objective
Migrate the domain and database from 4/6-stem multi-track separation to a strict **2-stem model (`STEM_VOCALS` and `STEM_INSTRUMENT`)** and collapse asset kinds to:
- `ORIGINAL`
- `STEM_VOCALS`
- `STEM_INSTRUMENT`
- `DOWNLOAD_AUDIO`
- `DOWNLOAD_VIDEO`
- `TRANSLATED_AUDIO`
- `MASHUP`

### Actions Performed
1. **Sub-stem Consolidation**: For any historical jobs with `STEM_DRUMS`, `STEM_BASS`, `STEM_OTHER`, `STEM_PIANO`, `STEM_GUITAR`, the tracks are re-mixed via FFmpeg `amix` (or re-linked from existing instrumentals) into a single verified `STEM_INSTRUMENT` file (`instrument.<ext>`).
2. **Vocals Track**: Retained cleanly as `STEM_VOCALS` (`vocals.<ext>`).
3. **Redundant Stems Pruned**: Removed database records for legacy sub-stems (`STEM_DRUMS`, `STEM_BASS`, `STEM_OTHER`, `STEM_INSTRUMENTAL`, `STEM_INSTRUMENTS`).
4. **Mashup & Translation Kind Normalization**: Mapped legacy `MASHUP_AUDIO` to `MASHUP`, `CHORD_PRACTICE_AUDIO` to `ORIGINAL`.
5. **Script**: `migrate-stems-to-2stem.js`.

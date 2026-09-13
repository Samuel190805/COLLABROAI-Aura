import { IJobRepository } from "@/domain/repositories/IJobRepository";
import { IAssetRepository } from "@/domain/repositories/IAssetRepository";

export class GetJobStatusUseCase {
  constructor(
    private jobRepo: IJobRepository,
    private assetRepo: IAssetRepository
  ) {}

  async execute(jobId: string) {
    const job = await this.jobRepo.findById(jobId);
    if (!job) {
      return null;
    }

    const assets = await this.assetRepo.findByJobId(jobId);
    const json: any = job.toJSON();
    json.mediaAssets = assets.map((a) => a.toJSON());

    // Surface chordTimeline, bpm, key, sections, originalKey, detectedVocabulary for chord jobs per Section B.10
    for (const asset of assets) {
      const meta = asset.metadata as any;
      if (meta?.chordTimeline) {
        json.chordTimeline = meta.chordTimeline;
      }
      if (meta?.bpm) {
        json.bpm = meta.bpm;
      }
      if (meta?.key || meta?.detectedKey) {
        json.key = meta.key || meta.detectedKey;
        json.originalKey = meta.originalKey || meta.detectedKey || meta.key;
      }
      if (meta?.sections) {
        json.sections = meta.sections;
      }
      if (meta?.detectedVocabulary) {
        json.detectedVocabulary = meta.detectedVocabulary;
      }
    }

    return json;
  }
}

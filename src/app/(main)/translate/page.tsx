"use client";

import React, { useState, useEffect } from "react";
import {
  Languages,
  Mic,
  MicOff,
  UploadCloud,
  Volume2,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Edit3,
  Loader2,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { MediaPlayer } from "@/components/player/MediaPlayer";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { StageStepper } from "@/components/ui/StageStepper";
import { SpeechBubbleHero } from "@/components/visual/SpeechBubbleHero";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { useGlobalAudio } from "@/components/audio/GlobalAudioPlayer";
import { useMicRecorder } from "@/lib/useMicRecorder";
import { SUPPORTED_LANGUAGES, findLanguageByCode } from "@/domain/value-objects/SupportedLanguages";

export default function TranslateSpeakPage() {
  const [inputMode, setInputMode] = useState<"text" | "mic" | "audio">("text");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [voiceGender, setVoiceGender] = useState<"female" | "male">("female");
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [preserveVoice, setPreserveVoice] = useState(true);
  const [enableDiarization, setEnableDiarization] = useState(true);

  // Stage Tracking & Verification States
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionSuccess, setTranscriptionSuccess] = useState(false);
  const [isTranslatingPreview, setIsTranslatingPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [stageError, setStageError] = useState<{ stage: string; message: string } | null>(null);

  const { playTrack } = useGlobalAudio();

  const {
    isRecording,
    permissionStatus,
    recordingDuration,
    formattedDuration,
    volumeLevel,
    audioBlob,
    error: micError,
    startRecording,
    stopRecording,
    resetRecording,
  } = useMicRecorder({
    maxDurationSeconds: 300,
    timeSliceMs: 250,
  });

  const {
    jobId,
    status,
    stage,
    progress,
    message,
    error,
    mediaAssets,
    isCompleted,
    isFailed,
    isProcessing,
    watchJob,
    reset: resetJob,
  } = useRealtimeJob();

  const stagesList = [
    { id: "TRANSCRIBING", label: "Speech-to-Text", description: "16kHz Whisper ASR" },
    { id: "TRANSLATING", label: "Neural MT", description: "Multi-lingual translation" },
    { id: "SYNTHESIZING", label: "Voice Synthesis", description: "Neural TTS" },
    { id: "EXPORT", label: "Validation", description: "FFprobe verified" },
  ];

  useEffect(() => {
    if (!sourceText.trim()) {
      setTranslatedText("");
      return;
    }

    const timer = setTimeout(() => {
      fetchTranslationPreview(sourceText, targetLanguage, sourceLanguage);
    }, 500);

    return () => clearTimeout(timer);
  }, [sourceText, targetLanguage, sourceLanguage]);

  const fetchTranslationPreview = async (text: string, target: string, source = "auto") => {
    if (!text.trim()) return;
    setIsTranslatingPreview(true);
    setStageError(null);
    try {
      const res = await fetch("/api/translate/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          targetLanguage: target,
          sourceLanguage: source,
        }),
      });
      const data = await res.json();
      if (res.ok && data.translatedText) {
        setTranslatedText(data.translatedText);
      } else if (!res.ok) {
        setStageError({ stage: "Translation", message: data.error || "Failed to translate text" });
      }
    } catch (err: unknown) {
      setStageError({
        stage: "Translation",
        message: err instanceof Error ? err.message : "Translation network error",
      });
    } finally {
      setIsTranslatingPreview(false);
    }
  };

  const transcribeAudioBlob = async (blob: Blob, filename = "audio.wav") => {
    if (blob.size < 256) {
      setErrorMsg("Recorded audio is too short. Please speak for at least 1-2 seconds.");
      return;
    }

    setIsTranscribing(true);
    setErrorMsg(null);
    setStageError(null);
    setTranscriptionSuccess(false);

    try {
      const formData = new FormData();
      formData.append("file", blob, filename);
      if (sourceLanguage && sourceLanguage !== "auto") {
        formData.append("language", sourceLanguage);
      }

      const res = await fetch("/api/translate/transcribe", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.text) {
        setSourceText(data.text);
        setTranscriptionSuccess(true);
        if (data.detectedLanguage && sourceLanguage === "auto") {
          setSourceLanguage(data.detectedLanguage);
        }
      } else {
        throw new Error(data.error || "Speech recognition was unable to transcribe the audio.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Audio transcription failed";
      setErrorMsg(msg);
      setStageError({ stage: "Speech-to-Text (ASR)", message: msg });
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleToggleRecord = async () => {
    setErrorMsg(null);
    setStageError(null);

    if (isRecording) {
      const finalBlob = await stopRecording();
      if (finalBlob && finalBlob.size > 256) {
        await transcribeAudioBlob(finalBlob, "mic_recording.webm");
      } else if (!finalBlob || finalBlob.size <= 256) {
        setErrorMsg("Recording was too short or empty. Please speak clearly and try again.");
      }
    } else {
      try {
        await startRecording();
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to start microphone.");
      }
    }
  };

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (file) {
      transcribeAudioBlob(file, file.name);
    }
  };

  const handleStartFullPipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStageError(null);

    const hasText = sourceText.trim().length > 0 || translatedText.trim().length > 0;
    const hasAudio = (inputMode === "audio" && selectedFile) || (inputMode === "mic" && audioBlob);

    if (!hasText && !hasAudio) {
      setErrorMsg("Please enter text, record microphone audio, or upload an audio file.");
      return;
    }

    setIsSubmitting(true);

    try {
      let res: Response;

      if (sourceText.trim() || translatedText.trim() || inputMode === "text") {
        res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            inputType: "text",
            sourceText: sourceText.trim(),
            translatedText: translatedText.trim(),
            sourceLanguage,
            targetLanguage,
            voiceGender,
            speed: speechSpeed,
            preserveVoice,
            enableDiarization,
          }),
        });
      } else {
        const formData = new FormData();
        formData.append("inputType", "audio");
        formData.append("sourceLanguage", sourceLanguage);
        formData.append("targetLanguage", targetLanguage);
        formData.append("voiceGender", voiceGender);
        formData.append("speed", speechSpeed.toString());
        formData.append("preserveVoice", String(preserveVoice));
        formData.append("enableDiarization", String(enableDiarization));

        if (inputMode === "audio" && selectedFile) {
          formData.append("audio", selectedFile);
        } else if (inputMode === "mic" && audioBlob) {
          formData.append("audio", audioBlob, "recording.wav");
        }

        res = await fetch("/api/translate", {
          method: "POST",
          body: formData,
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Translation job failed to initialize");
      }

      watchJob(data.jobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Translation initiation failed";
      setErrorMsg(msg);
      setStageError({ stage: "Speech Synthesis", message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    resetJob();
    resetRecording();
    setSourceText("");
    setTranslatedText("");
    setSelectedFile(null);
    setErrorMsg(null);
    setStageError(null);
    setTranscriptionSuccess(false);
  };

  const translatedAsset = mediaAssets && mediaAssets.length > 0 ? mediaAssets[0] : null;
  const targetLangInfo = findLanguageByCode(targetLanguage);
  const sourceLangInfo = findLanguageByCode(sourceLanguage);

  const [inlineTranslatedText, setInlineTranslatedText] = useState("");

  useEffect(() => {
    if (translatedAsset?.metadata?.translatedText) {
      setInlineTranslatedText(translatedAsset.metadata.translatedText);
    } else if (translatedText) {
      setInlineTranslatedText(translatedText);
    }
  }, [translatedAsset, translatedText]);

  const handleResynthesizeTTS = async () => {
    if (!inlineTranslatedText.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputType: "text",
          text: translatedAsset?.metadata?.sourceText || sourceText,
          translatedText: inlineTranslatedText.trim(),
          sourceLanguage,
          targetLanguage,
          voiceGender,
          speed: speechSpeed,
          preserveVoice,
          enableDiarization,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "TTS re-synthesis failed");
      }
      watchJob(data.jobId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "TTS synthesis failed";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Editorial Chapter Hero */}
      <ModeAHero
        chapterNumber="03 // SPEECH TRANSLATION"
        badge="Neural Speech Studio"
        headline="Speak any language in your own voice."
        subheadline="Exact word-for-word speech recognition and voice synthesis across 30+ languages."
        description="Conditioned 16kHz Whisper ASR captures exact spoken intent without truncation, advanced neural MT translates contextually, and formant-preserving synthesis delivers crystal-clear speech."
        stats={[
          { label: "ASR Sampling", value: "16 kHz Mono" },
          { label: "Languages", value: "30+" },
          { label: "Speech Engine", value: "Neural TTS" },
          { label: "Voice Output", value: "192 kbps" },
        ]}
        visualComponent={<SpeechBubbleHero />}
        toolAnchorId="translate-workspace"
        toolCtaText="Launch Studio"
      />

      {/* Monolith Precision Studio Workspace */}
      <div
        id="translate-workspace"
        className="w-full border-t border-[var(--line)] bg-[var(--bg-primary)] py-12 px-4 sm:px-6"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* Section Header */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
                <Languages className="w-3.5 h-3.5 stroke-[1.5]" />
              </div>
              <div>
                <h2 className="text-sm font-mono font-bold tracking-tight uppercase text-[var(--ink-primary)]">
                  Speech-to-Speech Translation Studio
                </h2>
                <p className="text-[11px] font-mono text-[var(--ink-secondary)]">
                  16kHz Whisper ASR → Neural MT → Neural Voice Synthesis
                </p>
              </div>
            </div>

            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border border-[var(--line)] text-[var(--ink-secondary)]">
              {targetLangInfo ? `${targetLangInfo.code.toUpperCase()}` : targetLanguage.toUpperCase()}
            </span>
          </div>

          {/* Main Action Form Card */}
          {!isProcessing && !isCompleted && (
            <Card className="w-full p-6">
              <form onSubmit={handleStartFullPipeline} className="flex flex-col gap-6">
                {/* Input Mode Selector */}
                <div className="flex justify-center">
                  <Tabs
                    tabs={[
                      { id: "text", label: "Type Text", icon: <Edit3 className="w-3.5 h-3.5 stroke-[1.5]" /> },
                      { id: "mic", label: "Microphone", icon: <Mic className="w-3.5 h-3.5 stroke-[1.5]" /> },
                      { id: "audio", label: "Upload Audio", icon: <UploadCloud className="w-3.5 h-3.5 stroke-[1.5]" /> },
                    ]}
                    activeTab={inputMode}
                    onChange={(id) => setInputMode(id as any)}
                  />
                </div>

                {/* Mode: Microphone */}
                {inputMode === "mic" && (
                  <div className="flex flex-col items-center justify-center p-6 border border-[var(--line)] bg-[var(--bg-secondary)] gap-4 text-center">
                    {permissionStatus === "denied" && (
                      <div className="w-full p-3 border border-[var(--line)] bg-[var(--bg-primary)] text-xs text-[var(--ink-primary)] flex items-center gap-2 text-left font-mono">
                        <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.5]" />
                        <div>
                          <p className="font-bold">Microphone access blocked</p>
                          <p className="text-[11px] text-[var(--ink-secondary)] mt-0.5">
                            Enable microphone permissions in your browser address bar.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleToggleRecord}
                        disabled={isTranscribing}
                        className={`w-16 h-16 border flex items-center justify-center transition-colors cursor-pointer ${
                          isRecording
                            ? "bg-[var(--ink-primary)] text-[var(--bg-primary)] border-[var(--ink-primary)] animate-pulse"
                            : isTranscribing
                            ? "border-[var(--line)] text-[var(--ink-secondary)] cursor-not-allowed"
                            : "border-[var(--ink-primary)] text-[var(--ink-primary)] hover:bg-[var(--ink-primary)] hover:text-[var(--bg-primary)]"
                        }`}
                      >
                        {isRecording ? (
                          <MicOff className="w-6 h-6 stroke-[1.5]" />
                        ) : isTranscribing ? (
                          <Loader2 className="w-6 h-6 animate-spin stroke-[1.5]" />
                        ) : (
                          <Mic className="w-6 h-6 stroke-[1.5]" />
                        )}
                      </button>
                    </div>

                    <div className="w-full max-w-sm flex flex-col items-center gap-1.5 font-mono">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-[var(--ink-primary)]">
                          {isRecording ? formattedDuration : "00:00"}
                        </span>
                        <span className="text-[var(--ink-secondary)]">•</span>
                        <span className="text-[var(--ink-secondary)] text-[11px]">
                          {isRecording
                            ? "Recording voice... Click to Stop"
                            : isTranscribing
                            ? "Transcribing via Whisper ASR..."
                            : audioBlob
                            ? `Captured audio (${recordingDuration}s) • Ready`
                            : "Click to start recording"}
                        </span>
                      </div>

                      {isRecording && (
                        <div className="w-full flex items-center gap-2 mt-1">
                          <Volume2 className="w-3 h-3 text-[var(--ink-secondary)] stroke-[1.5]" />
                          <div className="flex-1 h-1 bg-[var(--line)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--ink-primary)] transition-all duration-75"
                              style={{ width: `${Math.max(4, volumeLevel * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-[var(--ink-secondary)]">
                            {Math.round(volumeLevel * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode: Audio File Upload */}
                {inputMode === "audio" && (
                  <div className="flex flex-col gap-3">
                    <FileDropzone
                      selectedFile={selectedFile}
                      onFileSelect={handleFileSelect}
                      label="Select or drop voice recording"
                      sublabel="MP3, WAV, M4A, AAC up to 50MB (Conditioned to 16kHz mono)"
                    />
                    {isTranscribing && (
                      <div className="flex items-center justify-center gap-2 p-3 border border-[var(--line)] bg-[var(--bg-secondary)] text-[var(--ink-primary)] text-xs font-mono">
                        <Loader2 className="w-3.5 h-3.5 animate-spin stroke-[1.5]" />
                        <span>Transcribing audio via Whisper ASR...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Language & Voice Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--line)]">
                  <Select
                    label="Source Spoken Language"
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    options={[
                      { value: "auto", label: "Auto Detect Language" },
                      ...SUPPORTED_LANGUAGES.map((l) => ({
                        value: l.code,
                        label: `${l.name} (${l.nativeName})`,
                      })),
                    ]}
                  />

                  <Select
                    label="Target Spoken Language"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    options={SUPPORTED_LANGUAGES.map((l) => ({
                      value: l.code,
                      label: `${l.name} (${l.nativeName})`,
                    }))}
                  />

                  <Select
                    label="Voice Profile"
                    value={voiceGender}
                    onChange={(e) => setVoiceGender(e.target.value as any)}
                    options={[
                      { value: "female", label: "Natural Voice (Female)" },
                      { value: "male", label: "Natural Voice (Male)" },
                    ]}
                  />

                  <Select
                    label="Speech Cadence"
                    value={speechSpeed.toString()}
                    onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                    options={[
                      { value: "0.85", label: "0.85x (Deliberate)" },
                      { value: "1.0", label: "1.0x (Natural)" },
                      { value: "1.15", label: "1.15x (Conversational)" },
                    ]}
                  />
                </div>

                {/* Bilingual Editable Text Verification Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Source Transcript */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-mono text-[var(--ink-secondary)] uppercase tracking-wider">
                          Source Text / Transcript
                        </label>
                        {transcriptionSuccess && (
                          <span className="flex items-center gap-0.5 text-[10px] font-mono text-[var(--ink-primary)] px-1 border border-[var(--line)]">
                            <Check className="w-2.5 h-2.5 stroke-[1.5]" /> Transcribed
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-[var(--ink-secondary)]">
                        {sourceText.trim() ? `${sourceText.trim().split(/\s+/).length} words` : "0 words"}
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Enter text or record microphone audio to transcribe..."
                      style={{ fontFamily: "var(--font-mono), 'Noto Sans Tamil', 'Latha', 'Mukta Malar', monospace, sans-serif" }}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--line)] p-3 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-secondary)] focus:outline-none focus:border-[var(--ink-primary)] resize-none"
                    />
                  </div>

                  {/* Target Translated Text */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-mono text-[var(--ink-secondary)] uppercase tracking-wider">
                        Translated Text ({targetLangInfo ? targetLangInfo.name : targetLanguage.toUpperCase()})
                      </label>
                      {isTranslatingPreview && (
                        <span className="text-[10px] font-mono text-[var(--ink-secondary)] flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin stroke-[1.5]" /> Translating...
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      value={translatedText}
                      onChange={(e) => setTranslatedText(e.target.value)}
                      placeholder="Translated text will appear here (editable before synthesis)..."
                      style={{ fontFamily: "var(--font-mono), 'Noto Sans Tamil', 'Latha', 'Mukta Malar', monospace, sans-serif" }}
                      className="w-full bg-[var(--bg-secondary)] border border-[var(--line)] p-3 text-xs font-mono text-[var(--ink-primary)] placeholder-[var(--ink-secondary)] focus:outline-none focus:border-[var(--ink-primary)] resize-none"
                    />
                  </div>
                </div>

                {/* Voice Preservation & Diarization */}
                <div className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-mono text-xs text-[var(--ink-secondary)]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveVoice}
                      onChange={(e) => setPreserveVoice(e.target.checked)}
                      className="rounded-none border-[var(--line)] accent-[var(--ink-primary)]"
                    />
                    <span>Preserve Voice Formants & Pitch</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableDiarization}
                      onChange={(e) => setEnableDiarization(e.target.checked)}
                      className="rounded-none border-[var(--line)] accent-[var(--ink-primary)]"
                    />
                    <span>Multi-Speaker Diarization</span>
                  </label>
                </div>

                {/* Error Banner */}
                {(errorMsg || micError || stageError) && (
                  <div className="p-3 border border-[var(--line)] bg-[var(--bg-secondary)] text-xs text-[var(--ink-primary)] font-mono flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 stroke-[1.5] mt-0.5" />
                    <div>
                      {stageError && <p className="font-bold">[{stageError.stage}]</p>}
                      <p>{errorMsg || micError || stageError?.message}</p>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 font-mono"
                >
                  <Languages className="w-3.5 h-3.5 stroke-[1.5]" /> Synthesize Translated Speech
                </Button>
              </form>
            </Card>
          )}

          {/* Processing State */}
          {isProcessing && (
            <Card className="w-full p-8 flex flex-col items-center gap-6 text-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[var(--ink-primary)] animate-pulse" />
                <h3 className="text-xs font-mono font-medium uppercase tracking-wider text-[var(--ink-primary)]">
                  Speech Translation in Progress
                </h3>
              </div>

              {/* Monolith Linear Progress */}
              <div className="w-full max-w-md flex flex-col gap-2">
                <div className="flex justify-between text-[11px] font-mono text-[var(--ink-secondary)]">
                  <span>{message || "Processing speech..."}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full h-1 bg-[var(--line)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--ink-primary)] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <StageStepper
                stages={stagesList}
                currentStageId={stage}
                isCompleted={isCompleted}
                isFailed={isFailed}
              />
            </Card>
          )}

          {/* Failed State Card */}
          {isFailed && (
            <Card className="w-full p-8 flex flex-col items-center gap-4 text-center">
              <div className="w-10 h-10 border border-[var(--line)] flex items-center justify-center text-[var(--ink-primary)]">
                <AlertCircle className="w-5 h-5 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[var(--ink-primary)]">
                Translation Failed
              </h3>
              <p className="text-xs text-[var(--ink-secondary)] font-mono max-w-md">
                {error || "An error occurred during speech translation. Please verify input and try again."}
              </p>
              <Button variant="secondary" onClick={resetAll} className="text-xs font-mono">
                <RotateCcw className="w-3.5 h-3.5 mr-1 stroke-[1.5]" /> Try Again
              </Button>
            </Card>
          )}

          {/* Completed State */}
          {isCompleted && translatedAsset && (
            <div className="w-full flex flex-col gap-6">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-primary)]">
                  <CheckCircle2 className="w-4 h-4 stroke-[1.5]" />
                  <span className="font-semibold uppercase tracking-wider">Synthesized & Validated</span>
                </div>
                <Button variant="secondary" size="sm" onClick={resetAll} className="text-xs font-mono">
                  <RotateCcw className="w-3 h-3 mr-1 stroke-[1.5]" /> New Translation
                </Button>
              </div>

              {/* Bilingual Comparison & Inline Editing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--ink-secondary)]">
                    <span>Source Transcript</span>
                    <span>{sourceLangInfo?.name || "Original"}</span>
                  </div>
                  <p
                    style={{ fontFamily: "var(--font-mono), 'Noto Sans Tamil', 'Latha', 'Mukta Malar', monospace, sans-serif" }}
                    className="text-xs font-mono text-[var(--ink-primary)] leading-relaxed"
                  >
                    {translatedAsset.metadata?.sourceText || sourceText}
                  </p>
                </Card>

                <Card className="p-4 flex flex-col gap-2 bg-[var(--bg-secondary)]">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[var(--ink-secondary)]">
                    <span>Synthesized Translation (Editable)</span>
                    <span>{targetLangInfo ? targetLangInfo.name : targetLanguage.toUpperCase()}</span>
                  </div>
                  <textarea
                    rows={3}
                    value={inlineTranslatedText}
                    onChange={(e) => setInlineTranslatedText(e.target.value)}
                    style={{ fontFamily: "var(--font-mono), 'Noto Sans Tamil', 'Latha', 'Mukta Malar', monospace, sans-serif" }}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--line)] p-2 text-xs font-mono font-bold text-[var(--ink-primary)] focus:outline-none focus:border-[var(--ink-primary)] resize-none"
                  />
                  <div className="flex justify-end pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleResynthesizeTTS}
                      isLoading={isSubmitting}
                      className="text-[11px] font-mono h-7"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" /> Re-synthesize Audio (TTS Only)
                    </Button>
                  </div>
                </Card>
              </div>

              {/* Unified Media Player Preview */}
              <div className="space-y-3">
                <MediaPlayer
                  src={translatedAsset.filePath}
                  mediaType="audio"
                  title={translatedAsset.name}
                  artist={`Synthesized Speech (${targetLangInfo?.name || targetLanguage.toUpperCase()})`}
                />

                <div className="flex justify-end">
                  <Button
                    href={translatedAsset.filePath}
                    download={`translated_${translatedAsset.metadata?.targetLanguage || "speech"}.mp3`}
                    size="sm"
                    className="text-xs h-8 font-mono"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 stroke-[1.5]" /> Download Audio File
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

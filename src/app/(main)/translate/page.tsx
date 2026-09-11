"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Languages,
  Mic,
  MicOff,
  UploadCloud,
  Volume2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  Download,
  Edit3,
  Loader2,
  FileAudio,
  Radio,
  Check,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Tabs } from "@/components/ui/Tabs";
import { FileDropzone } from "@/components/ui/FileDropzone";
import { StageStepper } from "@/components/ui/StageStepper";
import { ProgressRing } from "@/components/ui/ProgressRing";
import { SpeechBubbleHero } from "@/components/visual/SpeechBubbleHero";
import { ModeAHero } from "@/components/layout/ModeAHero";
import { useRealtimeJob } from "@/lib/useRealtimeJob";
import { useGlobalAudio } from "@/components/audio/GlobalAudioPlayer";
import { useMicRecorder } from "@/lib/useMicRecorder";
import { SUPPORTED_LANGUAGES, findLanguageByCode } from "@/domain/value-objects/SupportedLanguages";
import { formatBytes } from "@/lib/utils";

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

  // Shared Microphone Recorder Hook
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

  // Auto-translate preview when sourceText or targetLanguage changes
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
      setErrorMsg("Please enter text, record audio with your microphone, or upload an audio file to translate.");
      return;
    }

    setIsSubmitting(true);

    try {
      let res: Response;

      // When text or transcribed text is present, submit directly as verified text to guarantee input-to-output delivery
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

  return (
    <div className="w-full flex flex-col items-center">
      {/* =========================================================================
          MODE A: HERO CHAPTER (Editorial Storytelling)
          ========================================================================= */}
      <ModeAHero
        chapterNumber="03 // SPEECH TRANSLATION"
        badge="16kHz Conditioned Neural Speech Studio"
        headline="Speak any language in your own voice."
        subheadline="Exact word-for-word speech recognition and formant voice preservation across 30+ languages."
        description="Conditioned 16kHz Whisper ASR captures exact spoken intent without truncation, advanced neural MT translates contextually, and formant-preserving synthesis delivers crystal-clear speech."
        stats={[
          { label: "ASR Sampling", value: "16 kHz Mono" },
          { label: "Target Languages", value: "30+" },
          { label: "Inference Temp", value: "0.0 (Exact)" },
          { label: "Voice Cloning", value: "Formant" },
        ]}
        visualComponent={<SpeechBubbleHero />}
        toolAnchorId="translate-workspace"
        toolCtaText="Launch Translation Studio"
      />

      {/* =========================================================================
          MODE B: CALM PRECISION STUDIO WORKSPACE
          ========================================================================= */}
      <div
        id="translate-workspace"
        className="w-full border-t border-white/10 bg-[#080809] py-16 px-4 sm:px-6 mode-b-precision"
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-8">
          {/* Workspace Title Header */}
          <div className="w-full flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                <Languages className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Speech-to-Speech Translation Studio
                </h2>
                <p className="text-xs text-neutral-400 font-mono">
                  16kHz Whisper ASR → Neural MT → Neural Voice Synthesis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {targetLangInfo ? `${targetLangInfo.flag} ${targetLangInfo.name.toUpperCase()}` : targetLanguage.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Main Action Form Card */}
          {!isProcessing && !isCompleted && (
            <Card variant="glass" className="w-full p-6 sm:p-8 shadow-apple dark:shadow-apple-dark">
              <form onSubmit={handleStartFullPipeline} className="flex flex-col gap-6">
                {/* Input Mode Selector */}
                <div className="flex justify-center">
                  <Tabs
                    tabs={[
                      { id: "text", label: "Type Text", icon: <Edit3 className="w-4 h-4" /> },
                      { id: "mic", label: "Live Microphone", icon: <Mic className="w-4 h-4" /> },
                      { id: "audio", label: "Upload Audio", icon: <UploadCloud className="w-4 h-4" /> },
                    ]}
                    activeTab={inputMode}
                    onChange={(id) => setInputMode(id as any)}
                  />
                </div>

                {/* Mode 2: Live Microphone with Shared Recorder & Real-Time VU Meter */}
                {inputMode === "mic" && (
                  <div className="flex flex-col items-center justify-center p-6 sm:p-8 rounded-3xl border border-white/10 bg-white/[0.02] gap-5 text-center">
                    {/* Permission Denied Alert */}
                    {permissionStatus === "denied" && (
                      <div className="w-full p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium flex items-center gap-3 text-left">
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
                        <div>
                          <p className="font-bold">Microphone access is blocked</p>
                          <p className="text-neutral-400 mt-0.5">
                            Please click the microphone icon in your browser address bar and enable microphone permissions for this site.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleToggleRecord}
                        disabled={isTranscribing}
                        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                          isRecording
                            ? "bg-red-500 text-white animate-pulse shadow-2xl shadow-red-500/40 ring-4 ring-red-500/30 scale-105"
                            : isTranscribing
                            ? "bg-neutral-800 text-neutral-400 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-apple hover:scale-105 active:scale-95"
                        }`}
                      >
                        {isRecording ? (
                          <MicOff className="w-8 h-8" />
                        ) : isTranscribing ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                          <Mic className="w-8 h-8" />
                        )}
                      </button>

                      {isRecording && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500" />
                        </span>
                      )}
                    </div>

                    {/* Live Recording Stats & Signal Meter */}
                    <div className="w-full max-w-sm flex flex-col items-center gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-white font-mono">
                          {isRecording ? formattedDuration : "00:00"}
                        </span>
                        <span className="text-xs text-neutral-400">•</span>
                        <span className="text-xs text-neutral-300 font-medium">
                          {isRecording
                            ? "Recording voice... Click to Stop & Transcribe"
                            : isTranscribing
                            ? "Conditioning 16kHz audio & transcribing via Whisper..."
                            : audioBlob
                            ? `Captured audio (${recordingDuration}s) • Ready`
                            : "Click to start recording"}
                        </span>
                      </div>

                      {/* Real-Time Live Signal VU Meter */}
                      {isRecording && (
                        <div className="w-full flex items-center gap-2 mt-1">
                          <Volume2 className="w-3.5 h-3.5 text-neutral-400" />
                          <div className="flex-1 h-2 bg-neutral-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-75 ${
                                volumeLevel > 0.75
                                  ? "bg-red-500"
                                  : volumeLevel > 0.35
                                  ? "bg-emerald-500"
                                  : "bg-indigo-500"
                              }`}
                              style={{ width: `${Math.max(4, volumeLevel * 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {Math.round(volumeLevel * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 3: Audio File Upload */}
                {inputMode === "audio" && (
                  <div className="flex flex-col gap-3">
                    <FileDropzone
                      selectedFile={selectedFile}
                      onFileSelect={handleFileSelect}
                      label="Drop voice audio recording here"
                      sublabel="MP3, WAV, M4A, AAC up to 50MB (Automatically converted to 16kHz mono)"
                    />
                    {isTranscribing && (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 text-xs font-semibold border border-indigo-500/20">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Conditioning to 16kHz & transcribing via Whisper ASR...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Language & Voice Options */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
                  <Select
                    label="Source Spoken Language (Hint)"
                    value={sourceLanguage}
                    onChange={(e) => setSourceLanguage(e.target.value)}
                    options={[
                      { value: "auto", label: "🌐 Auto Detect Language" },
                      ...SUPPORTED_LANGUAGES.map((l) => ({
                        value: l.code,
                        label: `${l.flag} ${l.name} (${l.nativeName})`,
                      })),
                    ]}
                  />

                  <Select
                    label="Target Spoken Language"
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    options={SUPPORTED_LANGUAGES.map((l) => ({
                      value: l.code,
                      label: `${l.flag} ${l.name} (${l.nativeName})`,
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

                {/* Stage 1 & 2: Bilingual Editable Text Verification Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Box: Exact Source Transcript */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <div className="flex items-center gap-1.5">
                        <label className="text-xs font-semibold text-neutral-300">
                          Source Text / Exact Transcript
                        </label>
                        {transcriptionSuccess && (
                          <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Check className="w-3 h-3" /> Transcribed
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-neutral-400">
                        {sourceText.trim() ? `${sourceText.trim().split(/\s+/).length} words` : "0 words"}
                      </span>
                    </div>

                    <textarea
                      rows={5}
                      value={sourceText}
                      onChange={(e) => setSourceText(e.target.value)}
                      placeholder="Enter text or record microphone audio to transcribe with exact precision..."
                      className="w-full rounded-2xl bg-neutral-900/90 border border-white/10 p-4 text-sm text-neutral-100 placeholder-neutral-500 focus:bg-black focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all resize-none"
                    />
                  </div>

                  {/* Right Box: Target Translated Text */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between ml-1">
                      <label className="text-xs font-semibold text-emerald-400">
                        Translated Text ({targetLangInfo ? `${targetLangInfo.flag} ${targetLangInfo.name}` : targetLanguage.toUpperCase()})
                      </label>
                      {isTranslatingPreview && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                          <Loader2 className="w-3 h-3 animate-spin" /> Translating...
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={5}
                      value={translatedText}
                      onChange={(e) => setTranslatedText(e.target.value)}
                      placeholder="Translated text will appear here (freely editable before voice synthesis)..."
                      className="w-full rounded-2xl bg-emerald-500/5 border border-emerald-500/30 p-4 text-sm font-medium text-neutral-100 placeholder-neutral-500 focus:bg-black focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 focus:outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Voice Preservation & Diarization Options */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-neutral-300">
                    <input
                      type="checkbox"
                      checked={preserveVoice}
                      onChange={(e) => setPreserveVoice(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Voice-Preserving Speech (Preserve original timbre & pitch)</span>
                  </label>

                  <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-neutral-300">
                    <input
                      type="checkbox"
                      checked={enableDiarization}
                      onChange={(e) => setEnableDiarization(e.target.checked)}
                      className="rounded text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Multi-Speaker Diarization (Separate distinct speakers)</span>
                  </label>
                </div>

                {/* Error Banner with Stage Specificity */}
                {(errorMsg || micError || stageError) && (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-medium flex items-start gap-3">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      {stageError && <p className="font-bold text-red-300">[{stageError.stage}]</p>}
                      <p>{errorMsg || micError || stageError?.message}</p>
                    </div>
                  </div>
                )}

                {/* Primary Action Button */}
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-apple"
                >
                  <Languages className="w-4 h-4" /> Synthesize Translated Speech
                </Button>
              </form>
            </Card>
          )}

          {/* Live SSE Real-Time Progress */}
          {isProcessing && (
            <Card variant="glass" className="w-full p-8 text-center flex flex-col items-center gap-6 animate-in fade-in">
              <div className="flex items-center gap-2 text-emerald-400">
                <Sparkles className="w-5 h-5 animate-spin" />
                <h3 className="text-lg font-bold text-white">
                  Processing Speech Translation
                </h3>
              </div>

              <ProgressRing progress={progress} size={140} strokeWidth={10} color="#10B981" />

              <p className="text-sm font-medium text-neutral-300 max-w-md">
                {message || "Translating & synthesizing voice..."}
              </p>

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
            <Card variant="glass" className="w-full p-8 text-center flex flex-col items-center gap-4 border-red-500/30">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">
                Translation Pipeline Failed
              </h3>
              <p className="text-sm text-neutral-400 max-w-md">
                {error || "An error occurred during speech translation. Please verify input audio or text and try again."}
              </p>
              <Button variant="secondary" onClick={resetAll} className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Try Again
              </Button>
            </Card>
          )}

          {/* Completed State: Audio Player & Bilingual Cards */}
          {isCompleted && translatedAsset && (
            <div className="w-full flex flex-col gap-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Voice Synthesized & Validated via FFprobe</span>
                </div>
                <Button variant="glass" size="sm" onClick={resetAll} className="text-xs flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Translate Another
                </Button>
              </div>

              {/* Bilingual Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card variant="glass" className="p-6">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider font-mono">
                    <span>Source Input Text</span>
                    <span className="text-neutral-400">{sourceLangInfo?.name || "Source"}</span>
                  </div>
                  <p className="text-sm text-neutral-200 leading-relaxed font-medium">
                    {translatedAsset.metadata?.sourceText || sourceText}
                  </p>
                </Card>

                <Card variant="glass" className="p-6 border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center justify-between mb-3 text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
                    <span>Synthesized Translation</span>
                    <span>{targetLangInfo ? `${targetLangInfo.flag} ${targetLangInfo.name}` : targetLanguage.toUpperCase()}</span>
                  </div>
                  <p className="text-base text-white font-semibold leading-relaxed">
                    {translatedAsset.metadata?.translatedText || translatedText}
                  </p>
                </Card>
              </div>

              {/* Audio Output Player Card */}
              <Card variant="glass" className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Volume2 className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-white truncate">
                      {translatedAsset.name}
                    </h4>
                    <p className="text-xs text-neutral-400 font-mono mt-0.5">
                      Format: MP3 • Validated Bitrate: 192kbps • High-Res Neural Voice
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      playTrack({
                        id: translatedAsset.id,
                        title: translatedAsset.name,
                        src: translatedAsset.filePath,
                        duration: translatedAsset.duration || 5,
                      })
                    }
                    className="text-xs flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Play Voice
                  </Button>

                  <Button
                    href={translatedAsset.filePath}
                    download={`translated_${translatedAsset.metadata?.targetLanguage || "speech"}.mp3`}
                    variant="glass"
                    size="sm"
                    className="text-xs flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Audio
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

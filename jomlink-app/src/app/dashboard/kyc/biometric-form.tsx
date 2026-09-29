"use client";

import * as React from "react";
import { useActionState } from "react";
import {
  Camera,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  submitKycBiometricAction,
  withdrawBiometricConsentAction,
  wipeBiometricDataAction,
  type KycState,
} from "@/app/actions/kyc";

const initialState: KycState = {};

type Capture = { blob: Blob; dataUrl: string } | null;

/** Turn a captured data URL into a File the server action can accept. */
async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || "image/jpeg" });
}

/**
 * Draw a video frame to a canvas and return a JPEG data URL (privacy: the raw
 * video never leaves the device — only the captured still is submitted).
 */
function grabFrame(video: HTMLVideoElement, maxSide = 1024): Capture {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  const scale = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, cw, ch);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  // Approximate blob payload for the File() conversion on submit.
  return { blob: new Blob(), dataUrl };
}

/**
 * Best-effort client-side face/liveness check.
 * Uses the experimental `FaceDetector` API where available (Chromium); falls
 * back to a simple centre-brightness heuristic elsewhere. This only helps the
 * member capture a usable photo — it is NOT a verification decision.
 */
async function detectFace(
  video: HTMLVideoElement
): Promise<{ ok: boolean; confidence: number; box: { w: number; h: number } }> {
  // Preferred: native FaceDetector (shape detection API).
  const FD = (globalThis as unknown as { FaceDetector?: new (o?: unknown) => { detect: (s: unknown) => Promise<{ boundingBox: DOMRectReadOnly }[]> } }).FaceDetector;
  if (typeof FD === "function") {
    try {
      const detector = new FD({ fastMode: true, maxDetectedFaces: 1 });
      const faces = await detector.detect(video);
      if (faces.length > 0) {
        const bb = faces[0].boundingBox;
        return { ok: true, confidence: 95, box: { w: Math.round(bb.width), h: Math.round(bb.height) } };
      }
      return { ok: false, confidence: 0, box: { w: 0, h: 0 } };
    } catch {
      /* fall through to heuristic */
    }
  }
  // Fallback: assume a face is present if the frame has enough brightness.
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 48;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, confidence: 0, box: { w: 0, h: 0 } };
  ctx.drawImage(video, 0, 0, 64, 48);
  const { data } = ctx.getImageData(0, 0, 64, 48);
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  const avg = sum / (data.length / 4);
  return { ok: avg > 40, confidence: Math.min(80, Math.round(avg)), box: { w: 0, h: 0 } };
}

export function BiometricKycForm() {
  const [state, action, pending] = useActionState<KycState, FormData>(
    submitKycBiometricAction,
    initialState
  );

  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [cameraReady, setCameraReady] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [selfie, setSelfie] = React.useState<Capture>(null);
  const [idImage, setIdImage] = React.useState<Capture>(null);
  const [faceMeta, setFaceMeta] = React.useState<{ ok: boolean; confidence: number; box: { w: number; h: number } }>({ ok: false, confidence: 0, box: { w: 0, h: 0 } });
  const [consent, setConsent] = React.useState(false);
  const idInputRef = React.useRef<HTMLInputElement | null>(null);

  // Start/stop the camera.
  const startCamera = React.useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (e) {
      console.error("camera error", e);
      setCameraError(
        "We could not access your camera. Grant camera permission, or upload a face photo instead."
      );
    }
  }, []);

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  React.useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  async function captureSelfie() {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const meta = await detectFace(video);
    setFaceMeta(meta);
    const frame = grabFrame(video);
    if (frame) setSelfie(frame);
  }

  function onIdFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setIdImage({ blob: file, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  }

  // Ensure the two captures are submitted as Files named selfie/idDocument.
  async function formAction(formData: FormData) {
    if (!selfie || !idImage) {
      // Let the server action report the missing-field error.
      return action(formData);
    }
    const selfieFile = await dataUrlToFile(selfie.dataUrl, "selfie.jpg");
    const idFile = await dataUrlToFile(idImage.dataUrl, "id-document.jpg");
    formData.set("selfie", selfieFile);
    formData.set("idDocument", idFile);
    formData.set("faceWidth", String(faceMeta.box.w));
    formData.set("faceHeight", String(faceMeta.box.h));
    formData.set("faceConfidence", String(faceMeta.confidence));
    formData.set("livenessPassed", String(faceMeta.ok));
    formData.set("captureSource", "WEB_CAMERA");
    formData.set("captureDevice", navigator.userAgent);
    return action(formData);
  }

  return (
    <div className="space-y-6">
      {state?.success && (
        <p role="status" className="rounded-md bg-success-bg px-3 py-2 text-sm text-success">
          Captured! Your face and ID images were stored securely and will help us build
          faster, automated identity verification.
        </p>
      )}
      {state?.error && (
        <p role="alert" className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <form action={formAction} className="space-y-6">
        {/* Step 1 — face selfie */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">1 · Capture your face</p>
          <div className="relative overflow-hidden rounded-xl border border-border bg-slate-900">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              ref={videoRef}
              playsInline
              muted
              className="aspect-video w-full object-cover"
            />
            {selfie && (
              <img
                src={selfie.dataUrl}
                alt="Captured selfie"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            {!cameraReady && !selfie && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-slate-300">
                <Camera className="h-8 w-8" aria-hidden="true" />
                <p className="text-xs">Camera is off</p>
              </div>
            )}
          </div>

          {cameraError && <p className="text-xs text-destructive">{cameraError}</p>}

          <div className="flex flex-wrap gap-2">
            {!cameraReady ? (
              <Button type="button" variant="outline" onClick={startCamera} disabled={!!selfie}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Start camera
              </Button>
            ) : (
              <Button type="button" onClick={captureSelfie} disabled={!!selfie}>
                <Camera className="h-4 w-4" aria-hidden="true" />
                Capture photo
              </Button>
            )}
            {selfie && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSelfie(null);
                  setFaceMeta({ ok: false, confidence: 0, box: { w: 0, h: 0 } });
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Retake
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Look straight at the camera in good light. Your live video is processed on your
            device — only the still photo is uploaded.
          </p>
        </div>

        {/* Step 2 — ID photo */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">
            2 · Photograph your ID document
          </p>
          <div className="flex items-center gap-4">
            <div className="flex h-24 w-36 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted text-xs text-muted-foreground">
              {idImage ? (
                <img src={idImage.dataUrl} alt="Identity document" className="h-full w-full object-cover" />
              ) : (
                "No photo"
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={idInputRef}
                id="idFilePicker"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={onIdFile}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => idInputRef.current?.click()}
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                {idImage ? "Replace photo" : "Upload ID photo"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Take a clear, glare-free photo of the ID page with your photo and name.
              </p>
            </div>
          </div>
        </div>

        {/* Step 3 — consent */}
        <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            3 · Your consent
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="consent"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
            />
            <span className="text-muted-foreground">
              I consent to Jomlink storing my face photo and identity-document image to
              (a) verify my identity and (b) build its own automated identity-verification
              system. I understand these images are stored privately, are never shown
              publicly, and that I can withdraw consent and delete my data at any time.
            </span>
          </label>
        </div>

        <Button
          type="submit"
          disabled={pending || !selfie || !idImage || !consent}
          className="w-full sm:w-auto"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <UserCheck className="h-4 w-4" aria-hidden="true" />
          )}
          {pending ? "Submitting…" : "Submit secure capture"}
        </Button>
      </form>

      {/* Data controls */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <form action={withdrawBiometricConsentAction}>
          <Button type="submit" variant="outline" size="sm">
            Withdraw consent
          </Button>
        </form>
        <form action={wipeBiometricDataAction}>
          <Button type="submit" variant="outline" size="sm" className="text-destructive">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete my biometric data
          </Button>
        </form>
      </div>
    </div>
  );
}

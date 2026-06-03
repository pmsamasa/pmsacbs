"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Camera, ImageUp, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";
import { updateProfilePhotoAction } from "@/app/actions/profile";
import { createClient } from "@/lib/supabase/client";

const MAX_FILE_SIZE = 1024 * 1024;
const OUTPUT_SIZE = 512;

export function ProfilePhotoUploader({ userId, initialUrl, label }: { userId: string; initialUrl: string | null; label: string }) {
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputId = useMemo(() => `photo-${userId}`, [userId]);

  useEffect(() => () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
  }, [sourceUrl]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be 1 MB or smaller.");
      return;
    }
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    setSourceUrl(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  async function cropToBlob(quality = 0.88): Promise<Blob> {
    if (!sourceUrl || !croppedAreaPixels) throw new Error("Choose and crop a photo first.");
    const image = await loadImage(sourceUrl);
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not prepare image crop.");

    ctx.fillStyle = "#0b3b2e";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Could not crop image.");
    if (blob.size > MAX_FILE_SIZE && quality > 0.55) return cropToBlob(quality - 0.12);
    if (blob.size > MAX_FILE_SIZE) throw new Error("Cropped photo is still above 1 MB. Try another image.");
    return blob;
  }

  function resetCrop() {
    setSourceUrl(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function uploadPhoto() {
    startTransition(async () => {
      try {
        const blob = await cropToBlob();
        const supabase = createClient();
        const path = `${userId}/avatar-${Date.now()}.jpg`;
        const { error } = await supabase.storage.from("profile-photos").upload(path, blob, {
          contentType: "image/jpeg",
          upsert: true,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
        const result = await updateProfilePhotoAction(data.publicUrl);
        if (!result.ok) throw new Error(result.message);
        setCurrentUrl(data.publicUrl);
        resetCrop();
        toast.success(result.message);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Photo upload failed.");
      }
    });
  }

  return (
    <div className="rounded-3xl border border-emerald-900/10 bg-white/70 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative grid size-24 shrink-0 place-items-center overflow-hidden rounded-3xl bg-emerald-900 text-gold-100">
          {currentUrl ? (
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${currentUrl})` }} />
          ) : (
            <Camera className="size-8" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-emerald-950">{label}</p>
          <p className="mt-1 text-sm text-emerald-700">Choose any image format up to 1 MB, drag to crop, then upload.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label htmlFor={inputId} className="btn-secondary cursor-pointer"><ImageUp className="size-4" /> Choose photo</label>
            <input id={inputId} className="hidden" type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} />
            {sourceUrl ? (
              <>
                <button type="button" className="btn-primary" onClick={uploadPhoto} disabled={isPending}>
                  {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Upload className="size-4" />} Upload
                </button>
                <button type="button" className="btn-secondary" onClick={resetCrop}>
                  <RotateCcw className="size-4" /> Cancel
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
      {sourceUrl ? (
        <div className="mt-4 space-y-4">
          <div className="relative h-80 overflow-hidden rounded-3xl border border-emerald-900/10 bg-emerald-950">
            <Cropper
              image={sourceUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
            />
          </div>
          <label className="field-label">Zoom
            <input className="accent-emerald-700" type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          </label>
          <p className="text-xs text-emerald-700">Drag the image inside the circle to position it. Use zoom only for size adjustment.</p>
        </div>
      ) : null}
    </div>
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = src;
  });
}


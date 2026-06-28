"use client";

import { useRef, useState } from "react";
import type { Person } from "@/types/game";
import { createPerson, updatePerson, deletePerson } from "@/lib/supabase/db";
import { supabase } from "@/lib/supabase/client";

export default function PersonForm({
  person,
  onSave,
  onDelete,
  onClose,
}: {
  person?: Person;
  onSave: (person: Person) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(person?.displayName ?? "");
  const [urls, setUrls] = useState<string[]>(person?.referenceImageUrls ?? []);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = !!person;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      let saved: Person;
      if (person) {
        saved = await updatePerson(person.id, { displayName: name.trim() });
      } else {
        saved = await createPerson({ displayName: name.trim() });
      }
      onSave(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleFilesSelected(files: FileList | null) {
    if (!files || files.length === 0 || !person) return;
    setUploading(true);
    setError(null);
    try {
      let current = [...urls];
      for (const file of Array.from(files)) {
        if (current.length >= 3) break;
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `people/${person.id}/ref-${current.length}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("character-images")
          .upload(path, file, { upsert: true });
        if (uploadErr) { setError(uploadErr.message); break; }
        const { data } = supabase.storage.from("character-images").getPublicUrl(path);
        current = [...current, data.publicUrl];
      }
      if (current.length > urls.length) {
        setUrls(current);
        await updatePerson(person.id, { referenceImageUrls: current });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemovePhoto(index: number) {
    if (!person) return;
    const updated = urls.filter((_, i) => i !== index);
    setUrls(updated);
    try {
      await updatePerson(person.id, { referenceImageUrls: updated });
    } catch (err) {
      setUrls(urls);
      setError(err instanceof Error ? err.message : "Failed to remove photo");
    }
  }

  async function handleDelete() {
    if (!person) return;
    setDeleting(true);
    try {
      await deletePerson(person.id);
      onDelete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeleting(false);
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-3 space-y-2.5">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
        placeholder="Name"
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
      />

      {/* Photos only available after person is created (need ID for storage path) */}
      {isEditMode && (
        <div>
          {urls.length > 0 && (
            <div className="flex gap-1.5 mb-2">
              {urls.map((url, i) => (
                <div key={url} className="relative w-12 h-12 rounded overflow-hidden border border-gray-600">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-0 right-0 w-4 h-4 bg-red-600 text-white text-xs flex items-center justify-center rounded-bl"
                  >×</button>
                </div>
              ))}
            </div>
          )}
          {urls.length < 3 && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full border border-dashed border-gray-600 hover:border-gray-400 rounded py-1.5 text-xs text-gray-500 hover:text-gray-400 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : `Add photo (${urls.length}/3)`}
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-1.5 rounded text-xs font-medium"
        >
          {saving ? "Saving…" : isEditMode ? "Save name" : "Create"}
        </button>
        {isEditMode && onDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs text-red-500 hover:text-red-400 px-2 py-1.5 rounded border border-red-900 hover:border-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

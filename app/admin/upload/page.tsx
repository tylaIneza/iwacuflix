'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { adminCreateContent, adminUploadThumbnail, adminFetchCategories } from '@/lib/api';
import {
  FiUpload, FiImage, FiLoader, FiCheckCircle, FiAlertCircle, FiX, FiTag,
} from 'react-icons/fi';

interface FormState {
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  type: 'movie' | 'series';
  category: string;
  season: string;
  episode: string;
  isPublished: boolean;
}

export default function UploadPage() {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [categories,   setCategories]   = useState<string[]>([]);
  const [catsLoading,  setCatsLoading]  = useState(true);
  const [form,         setForm]         = useState<FormState>({
    title: '', description: '', thumbnail: '', videoUrl: '',
    type: 'movie', category: '', season: '1', episode: '1', isPublished: false,
  });
  const [thumbPreview, setThumbPreview] = useState('');
  const [uploading,    setUploading]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [success,      setSuccess]      = useState(false);
  const [error,        setError]        = useState('');

  const set = useCallback((field: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value })), []);

  // Load categories on mount
  useEffect(() => {
    const FALLBACK = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary', 'Fantasy'];
    adminFetchCategories()
      .then((rows: { name: string }[]) => {
        const names = rows.map((r: { name: string }) => r.name);
        const list  = names.length > 0 ? names : FALLBACK;
        setCategories(list);
        setForm((f) => ({ ...f, category: f.category || list[0] }));
      })
      .catch(() => {
        setCategories(FALLBACK);
        setForm((f) => ({ ...f, category: f.category || FALLBACK[0] }));
      })
      .finally(() => setCatsLoading(false));
  }, []);

  const resetForm = useCallback((cats: string[]) => {
    setForm({
      title: '', description: '', thumbnail: '', videoUrl: '',
      type: 'movie', category: cats[0] ?? '', season: '1', episode: '1', isPublished: false,
    });
    setThumbPreview('');
    setError('');
  }, []);

  const handleThumbnailFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    setUploading(true);
    setError('');
    try {
      const { url } = await adminUploadThumbnail(file);
      set('thumbnail', url);
      setThumbPreview(url);
    } catch {
      setError('Thumbnail upload failed. Try pasting a URL instead.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) { setError('Please select a category.'); return; }
    setError('');
    setSubmitting(true);

    const payload: Record<string, unknown> = {
      title:       form.title.trim(),
      description: form.description.trim(),
      thumbnail:   form.thumbnail.trim(),
      videoUrl:    form.videoUrl.trim(),
      type:        form.type,
      category:    form.category,
      isPublished: form.isPublished,
    };
    if (form.type === 'series') {
      payload.season  = Number(form.season);
      payload.episode = Number(form.episode);
    }

    try {
      await adminCreateContent(payload);
      setSuccess(true);
      resetForm(categories);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to save content.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold">Upload Content</h1>
        <p className="text-gray-500 text-sm mt-1">Add a new movie or series episode</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-6">
          <FiCheckCircle /> Content saved successfully!{' '}
          <button className="ml-auto text-green-500/60 hover:text-green-400" onClick={() => router.push('/admin/manage')}>
            View all →
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6">
          <FiAlertCircle /> {error}
          <button className="ml-auto" onClick={() => setError('')}><FiX size={14} /></button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <Field label="Title" required>
          <input
            type="text" value={form.title} onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Inception" required className={inputCls}
          />
        </Field>

        {/* Description */}
        <Field label="Description" required>
          <textarea
            value={form.description} onChange={(e) => set('description', e.target.value)}
            rows={3} placeholder="Brief synopsis…" required
            className={`${inputCls} resize-none`}
          />
        </Field>

        {/* Type + Category row */}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type" required>
            <select
              value={form.type} onChange={(e) => set('type', e.target.value as 'movie' | 'series')}
              className={inputCls}
            >
              <option value="movie">Movie</option>
              <option value="series">Series</option>
            </select>
          </Field>
          <Field label="Category" required>
            <div className="space-y-1.5">
              {catsLoading ? (
                <div className={`${inputCls} flex items-center gap-2 text-gray-500`}>
                  <FiLoader size={13} className="animate-spin" /> Loading…
                </div>
              ) : (
                <select
                  value={form.category} onChange={(e) => set('category', e.target.value)}
                  className={inputCls} required
                >
                  {categories.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
              <a
                href="/admin/categories"
                className="inline-flex items-center gap-1 text-[11px] text-gray-600 hover:text-[#E50914] transition-colors"
              >
                <FiTag size={11} /> Manage categories
              </a>
            </div>
          </Field>
        </div>

        {/* Series fields */}
        {form.type === 'series' && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Season" required>
              <input
                type="number" min={1} value={form.season}
                onChange={(e) => set('season', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Episode" required>
              <input
                type="number" min={1} value={form.episode}
                onChange={(e) => set('episode', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>
        )}

        {/* Thumbnail */}
        <Field label="Thumbnail">
          <div className="space-y-2">
            <input
              type="url" value={form.thumbnail}
              onChange={(e) => { set('thumbnail', e.target.value); setThumbPreview(e.target.value); }}
              placeholder="https://… or upload a file below"
              className={inputCls}
            />
            <div
              className="border border-dashed border-[#333] rounded-lg p-4 text-center cursor-pointer hover:border-[#E50914] transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleThumbnailFile(e.target.files[0]); }}
              />
              {uploading
                ? <FiLoader className="animate-spin text-[#E50914] mx-auto mb-1" size={20} />
                : <FiImage className="text-gray-600 mx-auto mb-1" size={20} />}
              <p className="text-gray-600 text-xs">{uploading ? 'Uploading…' : 'Click to upload an image'}</p>
            </div>
            {thumbPreview && (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbPreview} alt="Preview" className="h-24 rounded object-cover" />
                <button
                  type="button"
                  onClick={() => { setThumbPreview(''); set('thumbnail', ''); }}
                  className="absolute -top-1.5 -right-1.5 bg-gray-800 text-white rounded-full p-0.5"
                >
                  <FiX size={12} />
                </button>
              </div>
            )}
          </div>
        </Field>

        {/* Video URL */}
        <Field label="Video URL (Cloudflare Stream or direct link)" required>
          <input
            type="text" value={form.videoUrl}
            onChange={(e) => set('videoUrl', e.target.value)}
            placeholder="https://iframe.cloudflarestream.com/… or video ID"
            required className={inputCls}
          />
          <p className="text-gray-600 text-xs mt-1">
            Supports Cloudflare Stream embed URLs, video IDs, or any direct MP4/HLS link.
          </p>
        </Field>

        {/* Publish toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => set('isPublished', !form.isPublished)}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.isPublished ? 'bg-[#E50914]' : 'bg-gray-700'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isPublished ? 'translate-x-5' : ''}`} />
          </button>
          <span className="text-gray-400 text-sm">
            {form.isPublished ? 'Published — visible to users' : 'Draft — hidden from users'}
          </span>
        </div>

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={submitting || catsLoading}
            className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? <><FiLoader className="animate-spin" size={15} /> Saving…</> : <><FiUpload size={15} /> Save Content</>}
          </button>
          <button
            type="button" onClick={() => resetForm(categories)}
            className="px-6 py-2.5 rounded-lg border border-[#333] text-gray-400 hover:text-white hover:border-gray-500 transition-colors text-sm"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-gray-400 text-xs uppercase tracking-wide block mb-1.5">
        {label}{required && <span className="text-[#E50914] ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full bg-[#111] border border-[#2a2a2a] text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#E50914] transition-colors placeholder-gray-600';

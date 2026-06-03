'use client';
import { useEffect, useState, useCallback } from 'react';
import { adminFetchContent, adminTogglePublish, adminDeleteContent, adminUpdateContent } from '@/lib/api';
import { Content } from '@/components/ContentCard';
import {
  FiEdit2, FiTrash2, FiEye, FiEyeOff, FiLoader, FiSearch,
  FiCheckCircle, FiAlertCircle, FiX,
} from 'react-icons/fi';

const CATEGORIES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Animation', 'Documentary', 'Fantasy', 'Other'];

export default function ManagePage() {
  const [items,     setItems]     = useState<Content[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [typeFilter,setTypeFilter]= useState('');
  const [toast,     setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [editItem,  setEditItem]  = useState<Content | null>(null);
  const [delId,     setDelId]     = useState<string | null>(null);
  const [saving,    setSaving]    = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminFetchContent(typeFilter ? { type: typeFilter } : undefined);
      setItems(data);
    } catch {
      showToast('Failed to load content', false);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  const handleTogglePublish = async (id: string) => {
    try {
      const updated = await adminTogglePublish(id);
      setItems((prev) => prev.map((c) => (c._id === id ? updated : c)));
      showToast(updated.isPublished ? 'Published!' : 'Unpublished');
    } catch {
      showToast('Failed to toggle publish', false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await adminDeleteContent(id);
      setItems((prev) => prev.filter((c) => c._id !== id));
      showToast('Deleted');
    } catch {
      showToast('Delete failed', false);
    } finally {
      setDelId(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      const updated = await adminUpdateContent(editItem._id, {
        title:       editItem.title,
        description: editItem.description,
        thumbnail:   editItem.thumbnail,
        videoUrl:    editItem.videoUrl,
        type:        editItem.type,
        category:    editItem.category,
        season:      editItem.season,
        episode:     editItem.episode,
        isPublished: editItem.isPublished,
      });
      setItems((prev) => prev.map((c) => (c._id === editItem._id ? updated : c)));
      showToast('Saved!');
      setEditItem(null);
    } catch {
      showToast('Save failed', false);
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((c) => {
    const q = search.toLowerCase();
    return !q || c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Manage Content</h1>
        <p className="text-gray-500 text-sm mt-1">{items.length} total items</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-xl animate-fade-in ${
          toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.ok ? <FiCheckCircle /> : <FiAlertCircle />} {toast.msg}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2">
          <FiSearch size={14} className="text-gray-500" />
          <input
            type="text" placeholder="Search…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-white text-sm outline-none w-40 placeholder-gray-600"
          />
        </div>
        <select
          value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-sm rounded-lg px-3 py-2 outline-none"
        >
          <option value="">All types</option>
          <option value="movie">Movies</option>
          <option value="series">Series</option>
        </select>
        <button
          onClick={load}
          className="px-4 py-2 border border-[#2a2a2a] rounded-lg text-gray-400 hover:text-white text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <FiLoader className="animate-spin text-[#E50914]" size={30} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-600 border border-[#2a2a2a] rounded-xl">
          No content found.
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Title</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Type</th>
                <th className="text-left px-4 py-3 hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Episode</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c._id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.thumbnail} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                        className="w-12 h-7 rounded object-cover bg-gray-800 hidden sm:block"
                      />
                      <span className="text-white font-medium truncate max-w-[140px] md:max-w-[200px]">{c.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell capitalize">{c.type}</td>
                  <td className="px-4 py-3 text-gray-400 hidden lg:table-cell">{c.category}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                    {c.type === 'series' && c.season && c.episode ? `S${c.season}E${c.episode}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] px-2 py-1 rounded-full font-semibold ${
                      c.isPublished ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'
                    }`}>
                      {c.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Toggle */}
                      <button
                        onClick={() => handleTogglePublish(c._id)}
                        title={c.isPublished ? 'Unpublish' : 'Publish'}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                      >
                        {c.isPublished ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => setEditItem(c)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <FiEdit2 size={15} />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => setDelId(c._id)}
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete confirmation modal */}
      {delId && (
        <Modal onClose={() => setDelId(null)}>
          <div className="text-center p-2">
            <p className="text-white font-semibold text-lg mb-2">Delete content?</p>
            <p className="text-gray-400 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setDelId(null)} className="px-5 py-2 border border-[#333] text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(delId)} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors">
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit modal */}
      {editItem && (
        <Modal onClose={() => setEditItem(null)}>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <h2 className="text-white font-bold text-lg mb-2">Edit Content</h2>

            {(['title', 'thumbnail', 'videoUrl'] as const).map((field) => (
              <div key={field}>
                <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">{field}</label>
                <input
                  type="text" value={String(editItem[field])}
                  onChange={(e) => setEditItem({ ...editItem, [field]: e.target.value })}
                  className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E50914]"
                />
              </div>
            ))}

            <div>
              <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Description</label>
              <textarea
                value={editItem.description} rows={2}
                onChange={(e) => setEditItem({ ...editItem, description: e.target.value })}
                className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E50914] resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Type</label>
                <select
                  value={editItem.type}
                  onChange={(e) => setEditItem({ ...editItem, type: e.target.value as 'movie' | 'series' })}
                  className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option value="movie">Movie</option>
                  <option value="series">Series</option>
                </select>
              </div>
              <div>
                <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Category</label>
                <select
                  value={editItem.category}
                  onChange={(e) => setEditItem({ ...editItem, category: e.target.value })}
                  className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 text-sm outline-none"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {editItem.type === 'series' && (
              <div className="grid grid-cols-2 gap-3">
                {(['season', 'episode'] as const).map((f) => (
                  <div key={f}>
                    <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">{f}</label>
                    <input
                      type="number" min={1} value={editItem[f] ?? 1}
                      onChange={(e) => setEditItem({ ...editItem, [f]: Number(e.target.value) })}
                      className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E50914]"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setEditItem({ ...editItem, isPublished: !editItem.isPublished })}
                className={`relative w-10 h-5 rounded-full transition-colors ${editItem.isPublished ? 'bg-[#E50914]' : 'bg-gray-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${editItem.isPublished ? 'translate-x-5' : ''}`} />
              </button>
              <span className="text-gray-400 text-sm">{editItem.isPublished ? 'Published' : 'Draft'}</span>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit" disabled={saving}
                className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {saving ? <FiLoader className="animate-spin" size={14} /> : null} Save
              </button>
              <button type="button" onClick={() => setEditItem(null)} className="px-5 py-2 border border-[#333] text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-lg shadow-2xl animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <FiX size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

'use client';
import { useState, useEffect, useRef } from 'react';
import { FiTag, FiPlus, FiTrash2, FiLoader, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import { adminFetchCategories, adminCreateCategory, adminDeleteCategory } from '@/lib/api';

interface Category { id: number; name: string; createdAt: string }

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [newName,    setNewName]    = useState('');
  const [adding,     setAdding]     = useState(false);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await adminFetchCategories();
      setCategories(data);
    } catch {
      setError('Failed to load categories.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const cat = await adminCreateCategory(newName.trim());
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
      flash(`"${cat.name}" added!`);
      inputRef.current?.focus();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to add category.');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`Delete "${cat.name}"? This won't remove it from existing content.`)) return;
    setDeleting(cat.id);
    setError('');
    try {
      await adminDeleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      flash(`"${cat.name}" deleted.`);
    } catch {
      setError('Failed to delete category.');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-white text-2xl font-bold flex items-center gap-2">
          <FiTag className="text-[#E50914]" size={22} /> Categories
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Create and manage content categories. Changes appear instantly in the upload form.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-5 text-sm">
          <FiAlertCircle size={15} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg mb-5 text-sm">
          <FiCheckCircle size={15} /> {success}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="flex gap-3 mb-8">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name… e.g. K-Drama"
          maxLength={100}
          className="flex-1 bg-[#111] border border-[#2a2a2a] focus:border-[#E50914] text-white rounded-lg px-4 py-2.5 text-sm outline-none placeholder-gray-600 transition-colors"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim()}
          className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          {adding ? <FiLoader size={15} className="animate-spin" /> : <FiPlus size={15} />}
          Add
        </button>
      </form>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <FiLoader size={15} className="animate-spin" /> Loading…
        </div>
      ) : categories.length === 0 ? (
        <p className="text-gray-600 text-sm">No categories yet. Add one above.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-gray-600 text-xs uppercase tracking-wide mb-3">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </p>
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between bg-[#111] border border-[#1e1e1e] hover:border-[#2a2a2a] rounded-lg px-4 py-3 group transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-[#E50914] opacity-60 flex-shrink-0" />
                <span className="text-white text-sm font-medium">{cat.name}</span>
              </div>
              <button
                onClick={() => handleDelete(cat)}
                disabled={deleting === cat.id}
                className="text-gray-600 hover:text-red-400 disabled:opacity-40 transition-colors p-1 opacity-0 group-hover:opacity-100"
                title={`Delete ${cat.name}`}
              >
                {deleting === cat.id
                  ? <FiLoader size={15} className="animate-spin" />
                  : <FiTrash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

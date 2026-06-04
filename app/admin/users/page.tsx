'use client';
import { useEffect, useState, useCallback } from 'react';
import { adminFetchUsers, adminCreateUser, adminChangePassword, adminDeleteUser } from '@/lib/api';
import {
  FiUsers, FiPlus, FiKey, FiTrash2, FiLoader,
  FiCheckCircle, FiAlertCircle, FiX, FiEye, FiEyeOff,
} from 'react-icons/fi';

interface User {
  id: number;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [delId,    setDelId]    = useState<number | null>(null);
  const [pwdUser,  setPwdUser]  = useState<User | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try { setUsers(await adminFetchUsers()); }
    catch { showToast('Failed to load users', false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    try {
      await adminDeleteUser(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      showToast('User deleted');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      showToast(msg || 'Delete failed', false);
    } finally { setDelId(null); }
  };

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold">Users</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} admin account{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          <FiPlus size={15} /> New User
        </button>
      </div>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium shadow-xl ${
          toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.ok ? <FiCheckCircle /> : <FiAlertCircle />} {toast.msg}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <FiLoader className="animate-spin text-[#E50914]" size={30} />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-600 border border-[#2a2a2a] rounded-xl">
          No users found.
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a2a] text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3">Email</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Role</th>
                <th className="text-left px-4 py-3 hidden md:table-cell">Created</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 text-gray-600">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#E50914]/20 flex items-center justify-center text-[#E50914] text-xs font-bold">
                        {u.email[0].toUpperCase()}
                      </div>
                      <span className="text-white">{u.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs px-2 py-1 rounded-full bg-[#E50914]/15 text-[#E50914] font-semibold capitalize">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setPwdUser(u)}
                        title="Change password"
                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <FiKey size={15} />
                      </button>
                      <button
                        onClick={() => setDelId(u.id)}
                        title="Delete user"
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

      {/* Delete confirmation */}
      {delId !== null && (
        <Modal onClose={() => setDelId(null)}>
          <div className="text-center p-2">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
              <FiTrash2 className="text-red-400" size={22} />
            </div>
            <p className="text-white font-semibold text-lg mb-2">Delete this user?</p>
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

      {/* Change password modal */}
      {pwdUser && (
        <ChangePasswordModal
          user={pwdUser}
          onClose={() => setPwdUser(null)}
          onSuccess={(msg) => { showToast(msg); setPwdUser(null); }}
          onError={(msg) => showToast(msg, false)}
        />
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSuccess={(user) => { setUsers((prev) => [user, ...prev]); showToast('User created'); setShowCreate(false); }}
          onError={(msg) => showToast(msg, false)}
        />
      )}
    </div>
  );
}

function ChangePasswordModal({
  user, onClose, onSuccess, onError,
}: {
  user: User;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [show,      setShow]      = useState(false);
  const [saving,    setSaving]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { onError('Passwords do not match'); return; }
    setSaving(true);
    try {
      await adminChangePassword(user.id, password);
      onSuccess('Password updated');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onError(msg || 'Failed to update password');
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center">
            <FiKey className="text-blue-400" size={16} />
          </div>
          <div>
            <h2 className="text-white font-bold">Change Password</h2>
            <p className="text-gray-500 text-xs">{user.email}</p>
          </div>
        </div>

        <PasswordField label="New password" value={password} onChange={setPassword} show={show} onToggle={() => setShow(!show)} />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow(!show)} />

        <div className="flex gap-3 pt-1">
          <button
            type="submit" disabled={saving || !password}
            className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <FiLoader className="animate-spin" size={14} /> : null} Update
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 border border-[#333] text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CreateUserModal({
  onClose, onSuccess, onError,
}: {
  onClose: () => void;
  onSuccess: (user: User) => void;
  onError: (msg: string) => void;
}) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [show,     setShow]     = useState(false);
  const [saving,   setSaving]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { onError('Passwords do not match'); return; }
    setSaving(true);
    try {
      const user = await adminCreateUser(email, password);
      onSuccess(user);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      onError(msg || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <Modal onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-full bg-[#E50914]/10 flex items-center justify-center">
            <FiUsers className="text-[#E50914]" size={16} />
          </div>
          <h2 className="text-white font-bold">Create New User</h2>
        </div>

        <div>
          <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">Email</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
            placeholder="user@example.com"
            className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 text-sm outline-none focus:border-[#E50914]"
          />
        </div>

        <PasswordField label="Password" value={password} onChange={setPassword} show={show} onToggle={() => setShow(!show)} />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} show={show} onToggle={() => setShow(!show)} />

        <div className="flex gap-3 pt-1">
          <button
            type="submit" disabled={saving || !email || !password}
            className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c40812] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saving ? <FiLoader className="animate-spin" size={14} /> : null} Create
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2 border border-[#333] text-gray-400 hover:text-white rounded-lg text-sm transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordField({ label, value, onChange, show, onToggle }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void;
}) {
  return (
    <div>
      <label className="text-gray-500 text-xs uppercase tracking-wide block mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'} value={value}
          onChange={(e) => onChange(e.target.value)} required minLength={6}
          placeholder="Min. 6 characters"
          className="w-full bg-[#111] border border-[#333] text-white rounded-lg px-3 py-2 pr-10 text-sm outline-none focus:border-[#E50914]"
        />
        <button type="button" onClick={onToggle} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
          {show ? <FiEyeOff size={15} /> : <FiEye size={15} />}
        </button>
      </div>
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-6 w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
          <FiX size={18} />
        </button>
        {children}
      </div>
    </div>
  );
}

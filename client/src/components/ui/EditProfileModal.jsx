import { useEffect, useRef, useState } from 'react';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, X, Warning } from './Icon';
import Spinner from './Spinner';
import { validateName, validateBatchYear } from '../../lib/validators';

const DEPTS = ['CS', 'EE', 'CV', 'ME', 'BBA', 'Other'];
const DEPT_LABELS = {
  CS:  'Computer Science (FCSE)',
  EE:  'Electrical Engineering (FEE)',
  CV:  'Civil Engineering (FCE)',
  ME:  'Mechanical Engineering (FME)',
  BBA: 'Management Sciences (FMS)',
  Other: 'Other / Not listed',
};

export default function EditProfileModal({ open, onClose, profile, onSaved }) {
  const { refreshUser } = useAuth();

  const [name, setName]   = useState(profile?.name  || '');
  const [dept, setDept]   = useState(profile?.dept  || 'Other');
  const [batch, setBatch] = useState(profile?.batch || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatarUrl || '');

  const [errors, setErrors] = useState({});
  const [submitErr, setSubmitErr] = useState(null);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Reset whenever the modal re-opens with a (possibly new) profile.
  useEffect(() => {
    if (!open) return;
    setName(profile?.name || '');
    setDept(profile?.dept || 'Other');
    setBatch(profile?.batch || '');
    setAvatarFile(null);
    setAvatarPreview(profile?.avatarUrl || '');
    setErrors({});
    setSubmitErr(null);
  }, [open, profile]);

  // Lock body scroll while the sheet is open + close on Esc.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Clean up any blob URL we created for the preview.
  useEffect(() => () => {
    if (avatarPreview?.startsWith?.('blob:')) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  if (!open) return null;

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      setErrors(s => ({ ...s, avatar: 'Only JPG, PNG or WebP images are allowed.' }));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors(s => ({ ...s, avatar: 'Image is larger than 3 MB.' }));
      return;
    }
    if (avatarPreview?.startsWith?.('blob:')) URL.revokeObjectURL(avatarPreview);
    setErrors(s => ({ ...s, avatar: null }));
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nameErr  = validateName(name);
    const batchErr = batch ? validateBatchYear(batch) : null;
    const nextErrs = { name: nameErr, batch: batchErr };
    setErrors(prev => ({ ...prev, ...nextErrs }));
    if (nameErr || batchErr) return;

    setSaving(true);
    setSubmitErr(null);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('dept', dept);
      fd.append('batch', batch || '');
      if (avatarFile) fd.append('avatar', avatarFile);

      const r = await api.patch('/users/me', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const updated = r.data;
      await refreshUser().catch(() => {});
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setSubmitErr(
        err?.response?.data?.message ||
        err?.message ||
        'Could not save profile. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  const initial = (name || profile?.name || '?').trim()[0]?.toUpperCase() || '?';

  return (
    <>
      <button
        type="button"
        className="sheet-overlay"
        aria-label="Close edit profile"
        onClick={onClose}
        style={{ border: 0, padding: 0, cursor: 'pointer' }}
      />

      <div
        className="sheet edit-profile-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        <div className="sheet-handle" />

        <div className="sheet-hd">
          <h3 id="edit-profile-title">Edit profile</h3>
          <button
            type="button"
            className="sheet-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </button>
        </div>

        <form className="sheet-body edit-profile-form" onSubmit={handleSubmit}>
          {/* Avatar picker */}
          <div className="edit-profile-avatar-row">
            <div className="edit-profile-avatar">
              {avatarPreview
                ? <img src={avatarPreview} alt="Profile preview" />
                : <span className="edit-profile-avatar-initial">{initial}</span>
              }
              <button
                type="button"
                className="edit-profile-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Change profile photo"
                title="Change profile photo"
              >
                <Camera />
              </button>
            </div>
            <div className="edit-profile-avatar-meta">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </button>
              {avatarFile && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (avatarPreview?.startsWith?.('blob:')) URL.revokeObjectURL(avatarPreview);
                    setAvatarFile(null);
                    setAvatarPreview(profile?.avatarUrl || '');
                  }}
                >
                  Discard
                </button>
              )}
              <div className="field-hint">JPG, PNG or WebP · max 3 MB</div>
              {errors.avatar && (
                <div className="err"><Warning /> {errors.avatar}</div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={onPickFile}
              style={{ display: 'none' }}
            />
          </div>

          {/* Name */}
          <div className={`field ${errors.name ? 'error' : ''}`}>
            <label htmlFor="ep-name">Full name</label>
            <input
              id="ep-name"
              className={`input ${errors.name ? 'error' : ''}`}
              type="text"
              value={name}
              maxLength={60}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors(s => ({ ...s, name: validateName(e.target.value) }));
              }}
              onBlur={() => setErrors(s => ({ ...s, name: validateName(name) }))}
              placeholder="Your full name"
            />
            {errors.name && (
              <div className="err"><Warning /> {errors.name}</div>
            )}
          </div>

          {/* Faculty / Department + Batch (side-by-side on wider sheets) */}
          <div className="edit-profile-row-2">
            <div className="field">
              <label htmlFor="ep-dept">Faculty</label>
              <select
                id="ep-dept"
                className="input"
                value={dept}
                onChange={(e) => setDept(e.target.value)}
              >
                {DEPTS.map(d => (
                  <option key={d} value={d}>{DEPT_LABELS[d] || d}</option>
                ))}
              </select>
            </div>

            <div className={`field ${errors.batch ? 'error' : ''}`}>
              <label htmlFor="ep-batch">Batch year</label>
              <input
                id="ep-batch"
                className={`input ${errors.batch ? 'error' : ''}`}
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={batch}
                placeholder="2023"
                onChange={(e) => {
                  const next = e.target.value.replace(/\D/g, '').slice(0, 4);
                  setBatch(next);
                  if (errors.batch || next.length === 4) {
                    setErrors(s => ({ ...s, batch: validateBatchYear(next) }));
                  }
                }}
                onBlur={() => setErrors(s => ({ ...s, batch: validateBatchYear(batch) }))}
              />
              {errors.batch ? (
                <div className="err"><Warning /> {errors.batch}</div>
              ) : (
                <div className="field-hint">2018 – 2025</div>
              )}
            </div>
          </div>

          {submitErr && (
            <div className="edit-profile-submit-err">
              <Warning /> {submitErr}
            </div>
          )}

          <div className="sheet-footer edit-profile-footer">
            <button
              type="button"
              className="btn btn-secondary btn-full"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={saving}
            >
              {saving ? <Spinner size={16} /> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export const validateGikiEmail = (val) => {
  const v = (val || '').trim().toLowerCase();
  if (!v) return 'Enter your university email.';
  if (!v.includes('@')) return 'Missing "@" sign.';
  const [local, domain] = v.split('@');
  if (domain !== 'giki.edu.pk') return `Only @giki.edu.pk emails accepted — got "@${domain}".`;
  const pat = /^u(\d{4})(\d{3,5})$/;
  const m = local.match(pat);
  if (!m) {
    if (!local.startsWith('u')) return 'GIKI emails start with "u" (e.g. u2023633@giki.edu.pk).';
    return 'Format: u<batch-year><roll> — e.g. u2023633@giki.edu.pk';
  }
  const year = parseInt(m[1], 10);
  if (year < 2018 || year > 2030) return `Year "${m[1]}" looks wrong. Use your batch year.`;
  return null;
};

export const validatePassword = (val) => {
  if (!val) return 'Enter a password.';
  if (val.length < 8) return 'Password must be at least 8 characters.';
  return null;
};

export const validateName = (val) => {
  if (!val || !val.trim()) return 'Enter your full name.';
  if (val.trim().length < 2) return 'Name must be at least 2 characters.';
  if (val.trim().length > 60) return 'Name must be under 60 characters.';
  if (/\d/.test(val.trim())) return 'Name cannot contain numbers.';
  return null;
};

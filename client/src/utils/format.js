export const fmtPrice = (p) => 'Rs ' + Number(p).toLocaleString('en-PK');

export const fmtDate = (d) => new Date(d).toLocaleDateString('en-PK', {
  day: 'numeric', month: 'short', year: 'numeric',
});

const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
export const fmtRelativeTime = (d) => {
  const diff = (new Date(d) - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(Math.round(diff), 'second');
  if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
  if (abs < 604800) return rtf.format(Math.round(diff / 86400), 'day');
  return fmtDate(d);
};

export const fmtDateTime = (d) => new Date(d).toLocaleString('en-PK', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const ListeningStatus = ({ activity, bio = '', className = '' }) => {
  if (activity?.trackId != null) {
    const label = [activity.artist, activity.title].filter(Boolean).join(' - ') || 'a song';
    const href = `/winamp?track=${encodeURIComponent(activity.trackId)}`;
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex min-w-0 items-center gap-1 text-[#28618a] hover:underline ${className}`}
        title={`Listening to ${label}`}
        onClick={(event) => event.stopPropagation()}
      >
        <span aria-hidden="true" className="shrink-0 text-[#4787b3]">♫</span>
        <span className="truncate">Listening to {label}</span>
      </a>
    );
  }
  return bio ? <span className={className}>{bio}</span> : null;
};

export default ListeningStatus;

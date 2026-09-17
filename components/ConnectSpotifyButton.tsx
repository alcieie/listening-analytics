export function ConnectSpotifyButton() {
  return (
    <a
      href="/api/auth/spotify/login"
      className="inline-flex items-center justify-center rounded-full bg-[#1DB954] px-6 py-3 font-semibold text-black transition-opacity hover:opacity-90"
    >
      Connect with Spotify
    </a>
  );
}

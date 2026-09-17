import { ConnectSpotifyButton } from "@/components/ConnectSpotifyButton";

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "That login attempt looked tampered with (state mismatch). Try again.",
  missing_oauth_params: "Something was missing from Spotify's response. Try again.",
  token_exchange_failed: "Spotify rejected the login. Check your app's client ID/secret and redirect URI.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold">Listening Analytics</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        Connect your Spotify account to start tracking your mood trends, listening heatmap, and
        skip rates.
      </p>
      {error && (
        <p className="max-w-sm rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {ERROR_MESSAGES[error] ?? "Something went wrong logging in. Try again."}
        </p>
      )}
      <ConnectSpotifyButton />
    </div>
  );
}

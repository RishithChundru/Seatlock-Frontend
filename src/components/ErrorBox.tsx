export default function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="mb-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      {message}
    </div>
  );
}

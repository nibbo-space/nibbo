export function LandingSceneCaption({ title, body }: { title: string; body: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-mist-100 via-mist-100/90 to-transparent px-6 pb-8 pt-24 md:px-10 md:pb-10">
      <p className="font-landing-display text-2xl font-bold text-ink-900 md:text-3xl">{title}</p>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-500 md:text-base">{body}</p>
    </div>
  );
}

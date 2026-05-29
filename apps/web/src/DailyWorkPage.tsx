export function DailyWorkPage() {
  const src = `${import.meta.env.BASE_URL}jn-daily-work/index.html`

  return (
    <section className="daily-work-embed section-anchor" id="daily-work">
      <iframe title="JN每日工作跟进" src={src} />
    </section>
  )
}

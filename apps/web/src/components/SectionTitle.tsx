export function SectionTitle(props: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="section-title">
      {props.eyebrow ? <span>{props.eyebrow}</span> : null}
      <h2>{props.title}</h2>
      {props.description ? <p>{props.description}</p> : null}
    </div>
  );
}

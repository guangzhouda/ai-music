import type { PropsWithChildren } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function Panel(props: PropsWithChildren<{ className?: string }>) {
  return <section className={cx("panel", props.className)}>{props.children}</section>;
}

export function Tag(props: PropsWithChildren<{ tone?: "default" | "accent" | "success" }>) {
  return <span className={cx("tag", props.tone && `tag-${props.tone}`)}>{props.children}</span>;
}


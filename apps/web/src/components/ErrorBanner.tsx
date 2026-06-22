export function ErrorBanner(props: { message: string }) {
  return <div className="error-banner">接口错误：{props.message}</div>;
}

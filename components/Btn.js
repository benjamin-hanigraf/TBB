import Link from 'next/link';
import Icon from './Icons';
export default function Btn({ href, icon, children, variant = '', disabled, className = '', ...rest }) {
  const cls = `btn ${variant} ${className}`.trim();
  const inner = <>{icon && <Icon n={icon} size={17} />}<span>{children}</span></>;
  if (disabled || !href) return <button className={cls} disabled={disabled} {...rest}>{inner}</button>;
  return /^(https?:|tel:|mailto:)/.test(href) ? <a className={cls} href={href} {...rest}>{inner}</a> : <Link className={cls} href={href} {...rest}>{inner}</Link>;
}

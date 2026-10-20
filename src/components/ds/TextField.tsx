import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { cx } from './util';

type Comum = {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
};

type Opcao = string | { value: string; label: string };

function Moldura({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: Comum & { id: string; required?: boolean; children: ReactNode }) {
  return (
    <div className={cx('omv-field', error ? 'omv-field-invalid' : false, className)}>
      {label ? (
        <label className="omv-field-label" htmlFor={id}>
          {label}
          {required ? (
            <span className="omv-field-req" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={`${id}-err`} className="omv-field-error" style={{ margin: 0 }}>
          <Icon name="alerta" size={16} />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="omv-field-hint" style={{ margin: 0 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function TextField(
  props: Comum & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>,
) {
  const { label, hint, error, className, id: idProp, required, ...rest } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <Moldura id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input
        id={id}
        className="omv-input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={desc}
        {...rest}
      />
    </Moldura>
  );
}

export function TextArea(
  props: Comum & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'>,
) {
  const { label, hint, error, className, id: idProp, required, ...rest } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <Moldura id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea
        id={id}
        className="omv-input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={desc}
        {...rest}
      />
    </Moldura>
  );
}

export function SelectField(
  props: Comum &
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
      options: Opcao[];
      placeholder?: string;
    },
) {
  const { label, hint, error, className, id: idProp, required, options, placeholder, ...rest } = props;
  const auto = useId();
  const id = idProp ?? auto;
  const desc = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const semValor = rest.value === undefined && rest.defaultValue === undefined;
  return (
    <Moldura id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select
        id={id}
        className="omv-input"
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={desc}
        {...(placeholder && semValor ? { defaultValue: '' } : {})}
        {...rest}
      >
        {placeholder ? (
          <option value="" disabled>
            {placeholder}
          </option>
        ) : null}
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o.value;
          const l = typeof o === 'string' ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
    </Moldura>
  );
}

export function SearchField({
  label,
  className,
  ...rest
}: { label?: string; className?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, 'className'>) {
  return (
    <div className={cx('omv-search', className)} role="search">
      <Icon name="buscar" size={18} />
      <input type="search" placeholder="Pesquisar…" aria-label={label ?? 'Pesquisar'} {...rest} />
    </div>
  );
}

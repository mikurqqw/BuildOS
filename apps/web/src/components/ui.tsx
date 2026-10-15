import * as Dialog from '@radix-ui/react-dialog';
import { X, Plus, ArrowUpRight, FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../i18n/context';
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content className="modal">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description className="sr-only">
            {t.workspace}
          </Dialog.Description>
          <Dialog.Close
            className="icon-button modal-close"
            aria-label={t.close}
          >
            <X size={20} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Empty({
  title,
  hint,
  action,
}: {
  title?: string;
  hint?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="empty">
      <span className="empty-icon">
        <FolderOpen size={27} strokeWidth={1.5} />
      </span>
      <h3>{title || t.empty}</h3>
      <p>{hint || t.emptyHint}</p>
      {action}
    </div>
  );
}
export function SectionHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function AddButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="button primary" onClick={onClick}>
      <Plus size={17} />
      {children}
    </button>
  );
}
export function Status({ value }: { value: string }) {
  const { t } = useI18n();
  const label = value in t ? t[value as keyof typeof t] : value;
  return (
    <span className={`status status-${value.toLowerCase()}`}>
      <span />
      {label}
    </span>
  );
}
export function ViewLink({ children }: { children: ReactNode }) {
  return (
    <span className="view-link">
      {children}
      <ArrowUpRight size={15} />
    </span>
  );
}

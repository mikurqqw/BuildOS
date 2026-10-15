import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Users,
  UserPlus,
  Mail,
  ShieldCheck,
  Copy,
  LoaderCircle,
  UserRoundCheck,
  UserRoundX,
  Clock3,
  X,
} from 'lucide-react';
import { teamSchema, inviteSchema } from '@buildos/shared';
import { useAuth } from '../auth/context';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { api, ApiError } from '../data/api';
import { Empty, Modal } from '../components/ui';
export function Team({ search }: { search: string }) {
  const { t, date } = useI18n();
  const { session } = useAuth();
  const { demo, data, notify } = useWorkspace();
  const client = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const owner = session?.user.role === 'OWNER';
  const query = useQuery({
    queryKey: ['team', session?.user.companyId],
    queryFn: () => api('/team', teamSchema),
    enabled: !demo,
    retry: 1,
  });
  const headers = { 'X-CSRF-Token': session?.csrfToken ?? '' };
  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const parsed = inviteSchema.safeParse(
      Object.fromEntries(new FormData(event.currentTarget)),
    );
    if (!parsed.success) {
      setError(t.validation);
      setBusy(false);
      return;
    }
    try {
      const result = await api(
        '/team/invitations',
        z.object({ token: z.string() }),
        { method: 'POST', headers, body: JSON.stringify(parsed.data) },
      );
      setInviteLink(`${location.origin}/?invite=${result.token}`);
      await client.invalidateQueries({ queryKey: ['team'] });
    } catch (error) {
      setError(
        error instanceof ApiError &&
          ['EMAIL_EXISTS', 'INVITE_EXISTS'].includes(error.code)
          ? t.invitationExists
          : t.serverUnavailable,
      );
    } finally {
      setBusy(false);
    }
  }
  async function toggle(id: string, active: boolean) {
    if (!active && !window.confirm(t.suspendConfirm)) return;
    try {
      await api(`/team/${id}`, z.object({ ok: z.boolean() }), {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ active }),
      });
      await client.invalidateQueries({ queryKey: ['team'] });
      notify(t.saved);
    } catch {
      notify(t.serverUnavailable);
    }
  }
  async function revoke(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      await api(`/team/invitations/${id}`, z.object({ ok: z.boolean() }), {
        method: 'DELETE',
        headers,
      });
      await client.invalidateQueries({ queryKey: ['team'] });
      notify(t.deleted);
    } catch {
      notify(t.serverUnavailable);
    }
  }
  const matches = (value: string) =>
    value.toLocaleLowerCase().includes(search.toLocaleLowerCase());
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">BUILDOS / {t.management}</div>
          <h1>{t.team}</h1>
          <p>{t.teamAccessSub}</p>
        </div>
        {owner && !demo && (
          <button
            className="button primary"
            onClick={() => {
              setInviteOpen(true);
              setInviteLink('');
              setError('');
            }}
          >
            <UserPlus size={17} />
            {t.inviteMember}
          </button>
        )}
      </div>
      <div className="info-note">
        <ShieldCheck size={19} />
        {demo ? t.demoAccountsHint : owner ? t.inviteHint : t.ownerOnly}
      </div>
      {demo ? (
        <div className="member-grid">
          {data.members
            .filter((member) => matches(`${member.name} ${member.role}`))
            .map((member) => (
              <article className="panel member-card" key={member.id}>
                <span className="member-avatar">
                  {member.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <h3>{member.name}</h3>
                <p>{member.role}</p>
                <div>
                  <span className="member-email">
                    <Mail size={15} />
                    {member.email}
                  </span>
                </div>
              </article>
            ))}
        </div>
      ) : query.isPending ? (
        <div className="loading-skeleton">
          <span />
          <span />
        </div>
      ) : query.isError ? (
        <div className="panel">
          <Empty
            title={t.serverUnavailable}
            action={
              <button className="button" onClick={() => void query.refetch()}>
                {t.retry}
              </button>
            }
          />
        </div>
      ) : (
        <>
          <div className="member-grid">
            {query.data.users
              .filter((user) =>
                matches(`${user.name} ${user.email} ${user.position}`),
              )
              .map((user) => (
                <article
                  className={`panel member-card ${!user.active ? 'member-inactive' : ''}`}
                  key={user.id}
                >
                  <span className="member-avatar">
                    {user.name
                      .split(' ')
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join('')}
                  </span>
                  <span
                    className={`account-badge ${user.active ? '' : 'inactive'}`}
                  >
                    {user.active ? t.accessActive : t.accessSuspended}
                  </span>
                  <h3>{user.name}</h3>
                  <p>
                    {user.position ||
                      (user.role === 'OWNER' ? t.ownerRole : t.employeeRole)}
                  </p>
                  <div>
                    <span className="member-email">
                      <Mail size={15} />
                      {user.email}
                    </span>
                  </div>
                  <div className="member-account-footer">
                    <span>
                      <Users size={14} />
                      {user.role === 'OWNER' ? t.ownerRole : t.employeeRole}
                    </span>
                    {owner &&
                      user.id !== session?.user.id &&
                      user.role !== 'OWNER' && (
                        <button
                          className="icon-button"
                          aria-label={
                            user.active ? t.suspendAccess : t.restoreAccess
                          }
                          onClick={() => void toggle(user.id, !user.active)}
                        >
                          {user.active ? (
                            <UserRoundX size={17} />
                          ) : (
                            <UserRoundCheck size={17} />
                          )}
                        </button>
                      )}
                  </div>
                </article>
              ))}
          </div>
          {query.data.invitations.length > 0 && (
            <section className="panel invitations-panel">
              <h2>
                <Clock3 size={18} />
                {t.pendingInvites}
                <span className="count">{query.data.invitations.length}</span>
              </h2>
              {query.data.invitations.map((invitation) => (
                <div className="invitation-row" key={invitation.id}>
                  <span className="member-avatar small">
                    <Mail size={18} />
                  </span>
                  <div>
                    <strong>{invitation.name}</strong>
                    <p>{invitation.email}</p>
                  </div>
                  <span className="muted">
                    {t.expires} {date(invitation.expiresAt)}
                  </span>
                  {owner && (
                    <button
                      className="icon-button"
                      aria-label={t.revokeInvite}
                      onClick={() => void revoke(invitation.id)}
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}
        </>
      )}
      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title={inviteLink ? t.inviteLink : t.inviteMember}
      >
        {inviteLink ? (
          <div className="invite-result">
            <span className="auth-icon">
              <ShieldCheck size={25} />
            </span>
            <p>{t.inviteHint}</p>
            <input
              aria-label={t.inviteLink}
              value={inviteLink}
              readOnly
              onFocus={(event) => event.target.select()}
            />
            <button
              className="button primary"
              onClick={() => {
                void navigator.clipboard
                  .writeText(inviteLink)
                  .then(() => notify(t.linkCopied))
                  .catch(() => notify(t.copyFailed));
              }}
            >
              <Copy size={16} />
              {t.copyLink}
            </button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={(event) => void invite(event)}>
            <label>
              {t.fullName}
              <input name="name" required minLength={2} maxLength={120} />
            </label>
            <label>
              {t.email}
              <input name="email" type="email" required maxLength={254} />
            </label>
            <label>
              {t.role}
              <input name="position" maxLength={160} />
            </label>
            <p className="form-hint">{t.inviteHint}</p>
            {error && (
              <div role="alert" className="form-error">
                {error}
              </div>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <UserPlus size={16} />
              )}{' '}
              {t.inviteMember}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}

import { dateKey } from '@buildos/shared';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import {
  projectSchema,
  taskSchema,
  issueSchema,
  budgetLineSchema,
  memberSchema,
  requestSchema,
  resolveMaterialSelection,
  type Project,
} from '@buildos/shared';
import { useWorkspace } from '../data/workspace';
import { useI18n } from '../i18n/context';
import { Modal } from './ui';
import { MaterialFields } from './MaterialFields';
import type { Messages } from '../i18n/ru';
export type FormKind =
  'project' | 'task' | 'issue' | 'budget' | 'member' | 'request';
type Field = {
  name: string;
  label: keyof Messages;
  type?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
  value?: string;
  min?: string;
  step?: string;
};
export function RecordForm({
  kind,
  onClose,
  projectId,
  editing,
}: {
  kind: FormKind;
  onClose: () => void;
  projectId?: string;
  editing?: Project;
}) {
  const { t } = useI18n();
  const { data, update, notify } = useWorkspace();
  const [error, setError] = useState('');
  const {
    register,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<Record<string, string>>();
  const options = (values: (keyof Messages)[]) =>
    values.map((value) => ({ value, label: t[value] }));
  const projectField: Field = {
    name: 'projectId',
    label: 'project',
    options: data.projects.map((project) => ({
      value: project.id,
      label: project.name,
    })),
    value: projectId,
  };
  const title: Field = { name: 'title', label: 'title', required: true };
  const due: Field = {
    name: 'due',
    label: 'due',
    type: 'date',
    required: true,
    value: dateKey(),
  };
  const assignee: Field = { name: 'assignee', label: 'assignee' };
  const priority: Field = {
    name: 'priority',
    label: 'priority',
    options: options(['MEDIUM', 'HIGH', 'CRITICAL', 'LOW']),
  };
  const numeric = (name: string, label: keyof Messages): Field => ({
    name,
    label,
    type: 'number',
    min: '0',
    value: '0',
    step: '1',
    required: true,
  });
  const fields: Record<FormKind, Field[]> = {
    project: [
      { name: 'name', label: 'name', required: true },
      { name: 'customer', label: 'customer' },
      { name: 'city', label: 'city' },
      numeric('budget', 'budgetLabel'),
      {
        name: 'start',
        label: 'start',
        type: 'date',
        required: true,
        value: dateKey(),
      },
      { name: 'end', label: 'end', type: 'date', required: true },
      {
        name: 'status',
        label: 'status',
        options: options([
          'PLANNING',
          'ACTIVE',
          'ON_HOLD',
          'COMPLETED',
          'CANCELLED',
        ]),
      },
    ],
    task: [
      projectField,
      title,
      assignee,
      due,
      priority,
      {
        name: 'status',
        label: 'status',
        options: options([
          'TODO',
          'IN_PROGRESS',
          'BLOCKED',
          'DONE',
          'CANCELLED',
        ]),
      },
      {
        name: 'weight',
        label: 'weight',
        type: 'number',
        min: '0.1',
        step: '0.1',
        value: '1',
        required: true,
      },
    ],
    issue: [
      projectField,
      title,
      { name: 'description', label: 'description' },
      assignee,
      due,
      priority,
    ],
    budget: [
      projectField,
      { name: 'name', label: 'name', required: true },
      {
        name: 'category',
        label: 'category',
        options: options(['materials', 'labor', 'equipment', 'other']),
      },
      numeric('planned', 'planned'),
      numeric('actual', 'actual'),
      numeric('committed', 'committed'),
    ],
    member: [
      { name: 'name', label: 'fullName', required: true },
      { name: 'role', label: 'role' },
      { name: 'email', label: 'email', type: 'email' },
      { name: 'phone', label: 'phone', type: 'tel' },
    ],
    request: [projectField, due],
  };
  const titles = {
    project: editing ? t.editProject : t.newProject,
    task: t.newTask,
    issue: t.newIssue,
    budget: t.addLine,
    member: t.addMember,
    request: t.request,
  };
  async function submit(values: Record<string, string>) {
    const raw: Record<string, unknown> = { ...values };
    for (const field of fields[kind])
      if (field.type === 'number') raw[field.name] = Number(values[field.name]);
    if (editing) raw.id = editing.id;
    let result = false;
    if (kind === 'project') {
      const parsed = projectSchema.safeParse(raw);
      if (!parsed.success) {
        setError(t.validation);
        return;
      }
      result = await update(
        (draft) => {
          if (editing)
            draft.projects = draft.projects.map((project) =>
              project.id === editing.id ? parsed.data : project,
            );
          else draft.projects.push(parsed.data);
        },
        editing ? 'eventUpdate' : 'eventProject',
        parsed.data.name,
      );
    }
    if (kind === 'task') {
      const parsed = taskSchema.safeParse(raw);
      if (!parsed.success) {
        setError(t.validation);
        return;
      }
      result = await update(
        (draft) => {
          draft.tasks.push(parsed.data);
        },
        'eventTask',
        parsed.data.title,
      );
    }
    if (kind === 'issue') {
      const parsed = issueSchema.safeParse({ ...raw, status: 'OPEN' });
      if (!parsed.success) {
        setError(t.validation);
        return;
      }
      result = await update(
        (draft) => {
          draft.issues.push(parsed.data);
        },
        'eventIssue',
        parsed.data.title,
      );
    }
    if (kind === 'budget') {
      const parsed = budgetLineSchema.safeParse(raw);
      if (!parsed.success) {
        setError(t.validation);
        return;
      }
      result = await update(
        (draft) => {
          draft.budgetLines.push(parsed.data);
        },
        'eventBudget',
        parsed.data.name,
      );
    }
    if (kind === 'member') {
      const parsed = memberSchema.safeParse(raw);
      if (!parsed.success) {
        setError(t.validation);
        return;
      }
      result = await update(
        (draft) => {
          draft.members.push(parsed.data);
        },
        'eventMember',
        parsed.data.name,
      );
    }
    if (kind === 'request') {
      try {
        Object.assign(raw, resolveMaterialSelection(values), {
          quantity: Number(values.quantity),
        });
      } catch {
        setError(t.validation);
        return;
      }
      const parsed = requestSchema.safeParse({ ...raw, status: 'requested' });
      if (!parsed.success) {
        setError(t.validation);
        return;
      }
      result = await update(
        (draft) => {
          draft.requests.push(parsed.data);
        },
        'eventRequest',
        parsed.data.name,
      );
    }
    if (result) {
      notify(t.saved);
      onClose();
    }
  }
  return (
    <Modal open onClose={onClose} title={titles[kind]}>
      <form onSubmit={handleSubmit(submit)} className="record-form">
        {fields[kind].map((field) => (
          <label key={field.name}>
            {t[field.label]}
            {field.required && <span className="required"> *</span>}
            {field.options ? (
              <select
                {...register(field.name)}
                defaultValue={
                  editing
                    ? String(editing[field.name as keyof Project] ?? '')
                    : field.value
                }
              >
                {field.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                {...register(field.name)}
                type={field.type || 'text'}
                defaultValue={
                  editing
                    ? String(editing[field.name as keyof Project] ?? '')
                    : field.value
                }
                required={field.required}
                min={field.min}
                step={field.step}
                maxLength={field.type ? 1000 : 200}
              />
            )}
          </label>
        ))}
        {kind === 'member' && <p className="form-hint">{t.contactOnly}</p>}
        {kind === 'request' && (
          <MaterialFields register={register} setValue={setValue} />
        )}
        {kind === 'issue' && <p className="form-hint">{t.issueHint}</p>}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button" onClick={onClose}>
            {t.cancel}
          </button>
          <button
            className="button primary"
            type="submit"
            disabled={isSubmitting}
          >
            {t.save}
          </button>
        </div>
      </form>
    </Modal>
  );
}

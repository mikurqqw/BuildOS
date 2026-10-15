import { useState } from 'react';
import type { UseFormRegister, UseFormSetValue } from 'react-hook-form';
import { Search, PackageOpen } from 'lucide-react';
import {
  localized,
  materialCatalog,
  materialCategories,
  materialUnits,
  materialVariantLabel,
} from '@buildos/shared';
import { useI18n } from '../i18n/context';
export function MaterialFields({
  register,
  setValue,
}: {
  register: UseFormRegister<Record<string, string>>;
  setValue: UseFormSetValue<Record<string, string>>;
}) {
  const { t, locale } = useI18n();
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [variant, setVariant] = useState('');
  const [unit, setUnit] = useState('');
  const material = materialCatalog.find((item) => item.id === selected);
  const visible = materialCatalog.filter(
    (item) =>
      (category === 'all' || item.category === category) &&
      item.labels.some((label) =>
        label.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      ),
  );
  function choose(id: string) {
    const item = materialCatalog.find((value) => value.id === id);
    const nextVariant = item?.variants[0] ?? '';
    setSelected(id);
    setVariant(nextVariant);
    setUnit(item?.unit ?? 'pcs');
    setValue('materialId', id);
    setValue('variant', nextVariant);
    setValue('unit', item?.unit ?? 'pcs');
    setValue('customName', '');
    setValue('customVariant', '');
    setValue('customUnit', '');
  }
  return (
    <fieldset className="material-picker">
      <legend>
        <PackageOpen size={17} />
        {t.materialCatalog}
      </legend>
      <div className="material-find">
        <Search size={16} />
        <input
          aria-label={t.findMaterial}
          value={search}
          placeholder={t.findMaterial}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <div className="material-fields-grid">
        <label>
          {t.materialCategory}
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              choose('');
            }}
          >
            <option value="all">{t.allCategories}</option>
            {materialCategories.map((item) => (
              <option key={item.id} value={item.id}>
                {localized(item.labels, locale)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t.material}
          <span className="required"> *</span>
          <select
            {...register('materialId', {
              onChange: (event) => choose(String(event.target.value)),
            })}
            required
            defaultValue=""
          >
            <option value="" disabled>
              {t.chooseMaterial}
            </option>
            {materialCategories
              .filter((group) =>
                visible.some((item) => item.category === group.id),
              )
              .map((group) => (
                <optgroup
                  label={localized(group.labels, locale)}
                  key={group.id}
                >
                  {visible
                    .filter((item) => item.category === group.id)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {localized(item.labels, locale)}
                      </option>
                    ))}
                </optgroup>
              ))}
            {material && !visible.some((item) => item.id === material.id) && (
              <option value={material.id}>
                {localized(material.labels, locale)}
              </option>
            )}
            <option value="other">{t.otherMaterial}</option>
          </select>
        </label>
        {selected === 'other' && (
          <label className="material-field-wide">
            {t.customMaterial}
            <span className="required"> *</span>
            <input
              {...register('customName')}
              required
              minLength={2}
              maxLength={200}
              placeholder={t.customMaterialHint}
            />
          </label>
        )}
        {material && (
          <label className="material-field-wide">
            {t.materialSpecification}
            <select
              {...register('variant', {
                onChange: (event) => setVariant(String(event.target.value)),
              })}
              defaultValue=""
            >
              <option value="" disabled={material.variants.length > 0}>
                {t.noSpecification}
              </option>
              {material.variants.map((value) => (
                <option key={value} value={value}>
                  {materialVariantLabel(value, locale)}
                </option>
              ))}
              <option value="other">{t.customSpecification}</option>
            </select>
          </label>
        )}
        {variant === 'other' && (
          <label className="material-field-wide">
            {t.customSpecification}
            <span className="required"> *</span>
            <input
              {...register('customVariant')}
              required
              maxLength={120}
              minLength={1}
            />
          </label>
        )}
        <label>
          {t.quantity}
          <span className="required"> *</span>
          <input
            {...register('quantity')}
            type="number"
            required
            defaultValue="1"
            min="0.001"
            max="1000000000"
            step="any"
            inputMode="decimal"
          />
        </label>
        <label>
          {t.unit}
          <span className="required"> *</span>
          <select
            {...register('unit', {
              onChange: (event) => setUnit(String(event.target.value)),
            })}
            defaultValue="pcs"
            required
          >
            {materialUnits.map((item) => (
              <option key={item.id} value={item.id}>
                {localized(item.labels, locale)} —{' '}
                {localized(item.names, locale)}
              </option>
            ))}
            <option value="other">{t.otherUnit}</option>
          </select>
        </label>
        {unit === 'other' && (
          <label className="material-field-wide">
            {t.customUnit}
            <span className="required"> *</span>
            <input {...register('customUnit')} required maxLength={30} />
          </label>
        )}
      </div>
      <p className="form-hint">{t.catalogHint}</p>
    </fieldset>
  );
}
